# -*- coding: utf-8 -*-
"""
Kok-Anlam-Turev Kapsamli Guncelleme Araci
==========================================
1) Morphology'den eksik turevleri derived_words'e ekler
2) Gemini API ile Turkce anlamlari uretir
3) derived_translations + root_translations gunceller

Kullanim:
  python update_roots.py --step1              # Morphology'den turev ekle
  python update_roots.py --step2              # Yeni turevlerin anlamlarini uret
  python update_roots.py --step3              # Mevcut turevleri dogrula
  python update_roots.py --step4              # Kok anlamlarini dogrula/zenginlestir
  python update_roots.py --step5              # derived_translations doldur
  python update_roots.py --step6              # root_translations dogrula
  python update_roots.py --status             # Durum raporu
"""
import sqlite3
import re
import json
import time
import sys
import os
from collections import defaultdict

DB_PATH = 'quran.db'
MORPH_FILE = 'quran-morphology.txt'
BATCH_SIZE = 80

# ===================== MORPHOLOGY PARSER =====================

def parse_morphology():
    """Morphology dosyasindan root -> set(lemmas) cikar."""
    root_lemmas = defaultdict(set)
    root_pattern = re.compile(r'ROOT:([^\|]+)')
    lem_pattern = re.compile(r'LEM:([^\|]+)')
    
    with open(MORPH_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split('\t')
            if len(parts) < 4:
                continue
            props = parts[3]
            rm = root_pattern.search(props)
            if rm:
                root = rm.group(1)
                lm = lem_pattern.search(props)
                if lm:
                    root_lemmas[root].add(lm.group(1))
    
    return root_lemmas

# ===================== GEMINI API =====================

def get_api_key():
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    key = os.getenv('API_KEY', '')
    if not key:
        print("HATA: API_KEY bulunamadi (.env dosyasini kontrol edin)")
        sys.exit(1)
    return key

def call_gemini(prompt, api_key, max_retries=3):
    """Gemini API cagrisi."""
    import requests
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192
        }
    }
    
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, json=payload, timeout=60)
            if resp.status_code == 429:
                wait = 15 * (attempt + 1)
                print(f"    Rate limit, {wait}s bekleniyor...")
                time.sleep(wait)
                continue
            if resp.status_code != 200:
                print(f"    API hata {resp.status_code}: {resp.text[:200]}")
                time.sleep(5)
                continue
            data = resp.json()
            text = data['candidates'][0]['content']['parts'][0]['text']
            return text.strip()
        except Exception as e:
            print(f"    Hata: {e}")
            time.sleep(5)
    return None

def parse_json_response(text):
    """Gemini yanıtından JSON çıkar."""
    # ```json ... ``` bloğunu bul
    m = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if m:
        text = m.group(1)
    # Düz JSON dene
    try:
        return json.loads(text)
    except:
        # Satır satır key:value dene
        return None

# ===================== STEP 1: MORPHOLOGY'DEN TUREV EKLE =====================

def step1_add_morphology_derivations():
    """Morphology dosyasindaki lemmalari derived_words'e ekler (meaning_tr bos)."""
    print("ADIM 1: Morphology'den turev ekleniyor...")
    print()
    
    root_lemmas = parse_morphology()
    
    db = sqlite3.connect(DB_PATH)
    
    # Mevcut derived_words
    existing = defaultdict(set)
    for r, w in db.execute("SELECT root, word FROM derived_words"):
        existing[r].add(w)
    
    # Mevcut max id
    max_id = db.execute("SELECT COALESCE(MAX(id), 0) FROM derived_words").fetchone()[0]
    
    new_entries = []
    for root in sorted(root_lemmas.keys()):
        morph_l = root_lemmas[root]
        db_w = existing.get(root, set())
        missing = morph_l - db_w
        for lemma in sorted(missing):
            max_id += 1
            new_entries.append((max_id, root, lemma, ''))
    
    if not new_entries:
        print("  Eksik turev yok, tablo guncel.")
        db.close()
        return
    
    db.executemany(
        "INSERT INTO derived_words (id, root, word, meaning_tr) VALUES (?, ?, ?, ?)",
        new_entries
    )
    db.commit()
    
    print(f"  {len(new_entries)} yeni turev eklendi (meaning_tr bos)")
    
    # Dogrulama
    total = db.execute("SELECT COUNT(*) FROM derived_words").fetchone()[0]
    empty = db.execute("SELECT COUNT(*) FROM derived_words WHERE meaning_tr IS NULL OR TRIM(meaning_tr)=''").fetchone()[0]
    print(f"  Toplam turev: {total}, Anlamsiz: {empty}")
    
    db.close()

# ===================== STEP 2: YENI TUREVLERIN ANLAMLARINI URET =====================

def step2_generate_meanings():
    """Anlami bos turevlerin Turkce anlamlarini Gemini ile uretir."""
    print("ADIM 2: Yeni turevlerin Turkce anlamlari uretiliyor...")
    print()
    
    api_key = get_api_key()
    db = sqlite3.connect(DB_PATH)
    
    # Anlami bos turevler
    empty_rows = db.execute("""
        SELECT dw.id, dw.root, dw.word, r.meaning_tr as root_meaning
        FROM derived_words dw
        JOIN roots r ON dw.root = r.root
        WHERE dw.meaning_tr IS NULL OR TRIM(dw.meaning_tr) = ''
        ORDER BY dw.root, dw.word
    """).fetchall()
    
    if not empty_rows:
        print("  Anlami bos turev yok.")
        db.close()
        return
    
    print(f"  {len(empty_rows)} turev icin anlam uretilecek")
    
    # Batch islem
    total_updated = 0
    for i in range(0, len(empty_rows), BATCH_SIZE):
        batch = empty_rows[i:i+BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(empty_rows) + BATCH_SIZE - 1) // BATCH_SIZE
        
        # Prompt olustur
        words_list = []
        for _, root, word, root_meaning in batch:
            words_list.append(f"  {word} (kok: {root}, kok anlami: {root_meaning})")
        
        prompt = f"""Asagidaki Kur'an-i Kerim'de gecen Arapca kelimelerin Turkce anlamlarini ver.
Her kelime icin KISA ve OZ bir Turkce anlam yaz (1-5 kelime).

Kelimeler:
{chr(10).join(words_list)}

ONEMLI: Yaniti SADECE JSON formatinda ver, baska bir sey yazma.
Format: {{"kelime1": "anlam1", "kelime2": "anlam2"}}
Arapca kelimeleri aynen key olarak kullan."""

        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} kelime)...", end=" ", flush=True)
        
        response = call_gemini(prompt, api_key)
        if not response:
            print("BASARISIZ")
            continue
        
        result = parse_json_response(response)
        if not result:
            print("JSON PARSE HATASI")
            continue
        
        updated = 0
        for row_id, root, word, _ in batch:
            meaning = result.get(word, '')
            if meaning:
                db.execute("UPDATE derived_words SET meaning_tr=? WHERE id=?", (meaning, row_id))
                updated += 1
        
        db.commit()
        total_updated += updated
        print(f"{updated}/{len(batch)} guncellendi")
        
        time.sleep(1)  # Rate limit
    
    # Sonuc
    remaining = db.execute("SELECT COUNT(*) FROM derived_words WHERE meaning_tr IS NULL OR TRIM(meaning_tr)=''").fetchone()[0]
    print(f"\n  Toplam guncellenen: {total_updated}")
    print(f"  Kalan bos: {remaining}")
    
    db.close()

# ===================== STEP 3: MEVCUT TUREVLERI DOGRULA =====================

def step3_verify_existing():
    """Mevcut turevlerin anlamlarini Gemini ile dogrular/duzeltir."""
    print("ADIM 3: Mevcut turevlerin Turkce anlamlari dogrulaniyor...")
    print()
    
    api_key = get_api_key()
    db = sqlite3.connect(DB_PATH)
    
    # Anlami olan turevler
    rows = db.execute("""
        SELECT dw.id, dw.root, dw.word, dw.meaning_tr, r.meaning_tr as root_meaning
        FROM derived_words dw
        JOIN roots r ON dw.root = r.root
        WHERE dw.meaning_tr IS NOT NULL AND TRIM(dw.meaning_tr) != ''
        ORDER BY dw.root, dw.word
    """).fetchall()
    
    print(f"  {len(rows)} turev dogrulanacak")
    
    total_corrected = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE
        
        words_list = []
        for _, root, word, meaning, root_meaning in batch:
            words_list.append(f"  {word} (kok: {root}) -> mevcut anlam: \"{meaning}\"")
        
        prompt = f"""Asagidaki Kur'an-i Kerim'deki Arapca kelimelerin mevcut Turkce anlamlarini kontrol et.
Eger anlam YANLIS veya EKSIK ise duzeltilmis halini ver.
Eger anlam DOGRU ise aynen birak.

Kelimeler:
{chr(10).join(words_list)}

ONEMLI: Yaniti SADECE JSON formatinda ver.
Format: {{"kelime1": "duzeltilmis_anlam1", "kelime2": "duzeltilmis_anlam2"}}
Sadece DEGISIKLIK gereken kelimeleri yaz. Dogru olanlari DAHIL ETME."""

        print(f"  Batch {batch_num}/{total_batches}...", end=" ", flush=True)
        
        response = call_gemini(prompt, api_key)
        if not response:
            print("BASARISIZ")
            continue
        
        result = parse_json_response(response)
        if not result:
            if '{}' in response or 'bos' in response.lower():
                print("degisiklik yok")
                continue
            print("JSON PARSE HATASI")
            continue
        
        corrected = 0
        for row_id, root, word, old_meaning, _ in batch:
            new_meaning = result.get(word, '')
            if new_meaning and new_meaning != old_meaning:
                db.execute("UPDATE derived_words SET meaning_tr=? WHERE id=?", (new_meaning, row_id))
                corrected += 1
        
        db.commit()
        total_corrected += corrected
        print(f"{corrected} duzeltme")
        
        time.sleep(1)
    
    print(f"\n  Toplam duzeltilen: {total_corrected}")
    db.close()

# ===================== STEP 4: KOK ANLAMLARINI DOGRULA =====================

def step4_verify_root_meanings():
    """Kok anlamlarini Gemini ile dogrular/zenginlestirir."""
    print("ADIM 4: Kok anlamlari dogrulaniyor/zenginlestiriliyor...")
    print()
    
    api_key = get_api_key()
    db = sqlite3.connect(DB_PATH)
    
    roots = db.execute("SELECT root, meaning_tr, meaning_ar, pronunciation FROM roots ORDER BY root").fetchall()
    print(f"  {len(roots)} kok dogrulanacak")
    
    total_updated = 0
    for i in range(0, len(roots), BATCH_SIZE):
        batch = roots[i:i+BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(roots) + BATCH_SIZE - 1) // BATCH_SIZE
        
        roots_list = []
        for root, m_tr, m_ar, pron in batch:
            roots_list.append(f"  {root} -> TR: \"{m_tr}\" | AR: \"{m_ar}\"")
        
        prompt = f"""Asagidaki Kur'an-i Kerim'deki Arapca koklerin Turkce ve Arapca anlamlarini kontrol et.
Eger anlam YANLIS, EKSIK veya GELISTIRILEBILIR ise duzeltilmis halini ver.

Kokler:
{chr(10).join(roots_list)}

ONEMLI: Yaniti SADECE JSON formatinda ver.
Format: {{"kok1": {{"meaning_tr": "duzeltilmis", "meaning_ar": "duzeltilmis"}}, ...}}
Sadece DEGISIKLIK gereken kokleri yaz. Dogru olanlari DAHIL ETME.
Anlam 3-8 kelime arasi olsun, Kur'an baglami oncelikli."""

        print(f"  Batch {batch_num}/{total_batches}...", end=" ", flush=True)
        
        response = call_gemini(prompt, api_key)
        if not response:
            print("BASARISIZ")
            continue
        
        result = parse_json_response(response)
        if not result:
            if '{}' in response:
                print("degisiklik yok")
                continue
            print("JSON PARSE HATASI")
            continue
        
        updated = 0
        for root, old_tr, old_ar, _ in batch:
            if root in result:
                new_tr = result[root].get('meaning_tr', old_tr)
                new_ar = result[root].get('meaning_ar', old_ar)
                if new_tr != old_tr or new_ar != old_ar:
                    db.execute("UPDATE roots SET meaning_tr=?, meaning_ar=? WHERE root=?",
                              (new_tr, new_ar, root))
                    updated += 1
        
        db.commit()
        total_updated += updated
        print(f"{updated} guncelleme")
        
        time.sleep(1)
    
    print(f"\n  Toplam guncellenen kok: {total_updated}")
    db.close()

# ===================== STEP 5: DERIVED_TRANSLATIONS DOLDUR =====================

def step5_derived_translations():
    """Tum turevler icin 4 dilde ceviri uretir."""
    print("ADIM 5: derived_translations dolduruluyor (4 dil)...")
    print()
    
    api_key = get_api_key()
    db = sqlite3.connect(DB_PATH)
    
    LANGS = ['en', 'es', 'it', 'ru']
    LANG_NAMES = {'en': 'English', 'es': 'Spanish', 'it': 'Italian', 'ru': 'Russian'}
    
    # Mevcut ceviriler
    existing = set()
    for did, lang in db.execute("SELECT derived_id, lang FROM derived_translations"):
        existing.add((did, lang))
    
    # Tum turevler
    all_derived = db.execute("SELECT id, root, word, meaning_tr FROM derived_words WHERE meaning_tr IS NOT NULL AND TRIM(meaning_tr)!='' ORDER BY id").fetchall()
    
    for lang in LANGS:
        # Bu dil icin eksik olanlar
        missing = [(did, root, word, mtr) for did, root, word, mtr in all_derived 
                   if (did, lang) not in existing]
        
        if not missing:
            print(f"  {lang}: Tum ceviriler mevcut")
            continue
        
        print(f"  {lang} ({LANG_NAMES[lang]}): {len(missing)} ceviri uretilecek")
        
        total_added = 0
        for i in range(0, len(missing), BATCH_SIZE):
            batch = missing[i:i+BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(missing) + BATCH_SIZE - 1) // BATCH_SIZE
            
            words_list = []
            for did, root, word, mtr in batch:
                words_list.append(f"  {word}: {mtr}")
            
            prompt = f"""Translate the following Quranic Arabic words from Turkish to {LANG_NAMES[lang]}.
Each line has an Arabic word and its Turkish meaning.

Words:
{chr(10).join(words_list)}

IMPORTANT: Return ONLY JSON format.
Format: {{"arabic_word1": "{LANG_NAMES[lang]} meaning", "arabic_word2": "{LANG_NAMES[lang]} meaning"}}
Keep translations concise (1-5 words)."""

            print(f"    Batch {batch_num}/{total_batches}...", end=" ", flush=True)
            
            response = call_gemini(prompt, api_key)
            if not response:
                print("BASARISIZ")
                continue
            
            result = parse_json_response(response)
            if not result:
                print("JSON PARSE HATASI")
                continue
            
            added = 0
            for did, root, word, mtr in batch:
                meaning = result.get(word, '')
                if meaning:
                    db.execute("INSERT INTO derived_translations (derived_id, lang, meaning) VALUES (?,?,?)",
                              (did, lang, meaning))
                    added += 1
            
            db.commit()
            total_added += added
            print(f"{added}/{len(batch)}")
            
            time.sleep(1)
        
        print(f"    {lang} toplam: {total_added} ceviri eklendi")
        print()
    
    # Sonuc
    total = db.execute("SELECT COUNT(*) FROM derived_translations").fetchone()[0]
    print(f"  derived_translations toplam: {total}")
    db.close()

# ===================== STEP 6: ROOT_TRANSLATIONS DOGRULA =====================

def step6_verify_root_translations():
    """Root translations'i dogrular/gunceller."""
    print("ADIM 6: root_translations dogrulaniyor...")
    print()
    
    api_key = get_api_key()
    db = sqlite3.connect(DB_PATH)
    
    LANGS = ['en', 'es', 'it', 'ru']
    LANG_NAMES = {'en': 'English', 'es': 'Spanish', 'it': 'Italian', 'ru': 'Russian'}
    
    for lang in LANGS:
        rows = db.execute("""
            SELECT r.root, r.meaning_tr, rt.meaning
            FROM roots r
            JOIN root_translations rt ON r.root = rt.root AND rt.lang = ?
            ORDER BY r.root
        """, (lang,)).fetchall()
        
        print(f"  {lang} ({LANG_NAMES[lang]}): {len(rows)} ceviri dogrulanacak")
        
        total_updated = 0
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i+BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE
            
            roots_list = []
            for root, mtr, existing_trans in batch:
                roots_list.append(f"  {root} (Turkish: {mtr}) -> current {lang}: \"{existing_trans}\"")
            
            prompt = f"""Check these Quranic Arabic root translations in {LANG_NAMES[lang]}.
If a translation is WRONG or can be IMPROVED, provide the corrected version.

Roots:
{chr(10).join(roots_list)}

Return ONLY JSON: {{"root1": "corrected_meaning", ...}}
Only include roots that NEED correction. Skip correct ones."""

            print(f"    Batch {batch_num}/{total_batches}...", end=" ", flush=True)
            
            response = call_gemini(prompt, api_key)
            if not response:
                print("BASARISIZ")
                continue
            
            result = parse_json_response(response)
            if not result:
                if '{}' in response:
                    print("degisiklik yok")
                    continue
                print("JSON PARSE HATASI")
                continue
            
            updated = 0
            for root, _, _ in batch:
                new_meaning = result.get(root, '')
                if new_meaning:
                    db.execute("UPDATE root_translations SET meaning=? WHERE root=? AND lang=?",
                              (new_meaning, root, lang))
                    updated += 1
            
            db.commit()
            total_updated += updated
            print(f"{updated} duzeltme")
            
            time.sleep(1)
        
        print(f"    {lang} toplam duzeltme: {total_updated}")
        print()
    
    db.close()

# ===================== STATUS =====================

def show_status():
    """Guncel durum raporu."""
    db = sqlite3.connect(DB_PATH)
    
    print("=" * 50)
    print("  KOK-ANLAM-TUREV DURUM RAPORU")
    print("=" * 50)
    
    # roots
    total_roots = db.execute("SELECT COUNT(*) FROM roots").fetchone()[0]
    empty_tr = db.execute("SELECT COUNT(*) FROM roots WHERE meaning_tr IS NULL OR TRIM(meaning_tr)=''").fetchone()[0]
    empty_ar = db.execute("SELECT COUNT(*) FROM roots WHERE meaning_ar IS NULL OR TRIM(meaning_ar)=''").fetchone()[0]
    print(f"\n  roots: {total_roots} kok")
    print(f"    Bos meaning_tr: {empty_tr}")
    print(f"    Bos meaning_ar: {empty_ar}")
    
    # derived_words
    total_dw = db.execute("SELECT COUNT(*) FROM derived_words").fetchone()[0]
    empty_dw = db.execute("SELECT COUNT(*) FROM derived_words WHERE meaning_tr IS NULL OR TRIM(meaning_tr)=''").fetchone()[0]
    dw_roots = db.execute("SELECT COUNT(DISTINCT root) FROM derived_words").fetchone()[0]
    print(f"\n  derived_words: {total_dw} turev ({dw_roots} kok)")
    print(f"    Bos meaning_tr: {empty_dw}")
    
    # derived_translations
    total_dt = db.execute("SELECT COUNT(*) FROM derived_translations").fetchone()[0]
    print(f"\n  derived_translations: {total_dt}")
    langs = db.execute("SELECT lang, COUNT(*) FROM derived_translations GROUP BY lang").fetchall()
    for l, c in langs:
        print(f"    {l}: {c}")
    
    # root_translations
    total_rt = db.execute("SELECT COUNT(*) FROM root_translations").fetchone()[0]
    print(f"\n  root_translations: {total_rt}")
    langs = db.execute("SELECT lang, COUNT(*) FROM root_translations GROUP BY lang").fetchall()
    for l, c in langs:
        print(f"    {l}: {c}")
    
    # Morphology karsilastirmasi
    root_lemmas = parse_morphology()
    morph_total = sum(len(v) for v in root_lemmas.values())
    print(f"\n  Morphology lemma toplam: {morph_total}")
    print(f"  DB'de karsiligi olan  : {total_dw}")
    print(f"  Fark                  : {morph_total - total_dw if morph_total > total_dw else 0}")
    
    print()
    db.close()

# ===================== MAIN =====================

if __name__ == '__main__':
    args = sys.argv[1:]
    
    if not args or '--status' in args:
        show_status()
    elif '--step1' in args:
        step1_add_morphology_derivations()
    elif '--step2' in args:
        step2_generate_meanings()
    elif '--step3' in args:
        step3_verify_existing()
    elif '--step4' in args:
        step4_verify_root_meanings()
    elif '--step5' in args:
        step5_derived_translations()
    elif '--step6' in args:
        step6_verify_root_translations()
    elif '--all' in args:
        step1_add_morphology_derivations()
        step2_generate_meanings()
        step3_verify_existing()
        step4_verify_root_meanings()
        step5_derived_translations()
        step6_verify_root_translations()
        show_status()
    else:
        print("Kullanim:")
        print("  python update_roots.py --status")
        print("  python update_roots.py --step1  (morphology turev ekle)")
        print("  python update_roots.py --step2  (yeni anlam uret)")
        print("  python update_roots.py --step3  (mevcut dogrula)")
        print("  python update_roots.py --step4  (kok anlam dogrula)")
        print("  python update_roots.py --step5  (derived_translations)")
        print("  python update_roots.py --step6  (root_translations)")
        print("  python update_roots.py --all    (tumu sirali)")
