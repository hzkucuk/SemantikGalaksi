# -*- coding: utf-8 -*-
"""SemantikGalaksi -- Tam DB-Site Senkronizasyon Kontrolu

Sueleymaniye Vakfi sitesindeki tum 114 sure x 6236 ayeti DB ile
alan alan karsilastirir ve farklilik raporu uretir.

Kontrol edilen alanlar:
  - ayet   (Arapca metin)
  - meal   (Turkce ceviri)
  - dipnot (aciklama metni)

Kullanim:
    python sync_check.py                 # Sadece rapor
    python sync_check.py --fix           # Farkliliklari duzelt
    python sync_check.py --sure 2        # Sadece Bakara suresini kontrol et
    python sync_check.py --sure 2-10     # Sure 2'den 10'a kadar
    python sync_check.py --report report.json  # Raporu JSON dosyasina yaz
"""

import sqlite3
import requests
import re
import json
import time
import sys
import os
from collections import defaultdict
from urllib.parse import quote as url_quote
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Yapilandirma
# ---------------------------------------------------------------------------
DOMAIN = "https://www.suleymaniyevakfimeali.com"
BASE_URL = DOMAIN + "/Meal/"
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quran.db")

SURAH_SLUGS = {
    1: "Fatiha", 2: "Bakara", 3: "Al-i_\u0130mran", 4: "Nisa", 5: "Maide",
    6: "Enam", 7: "Araf", 8: "Enfal", 9: "Tevbe", 10: "Yunus",
    11: "Hud", 12: "Yusuf", 13: "Rad", 14: "\u0130brahim", 15: "Hicr",
    16: "Nahl", 17: "\u0130sra", 18: "Kehf", 19: "Meryem", 20: "Ta_Ha",
    21: "Enbiya", 22: "Hac", 23: "M\u00fcminun", 24: "Nur", 25: "Furkan",
    26: "\u015euara", 27: "Neml", 28: "Kasas", 29: "Ankebut", 30: "Rum",
    31: "Lokman", 32: "Secde", 33: "Ahzab", 34: "Sebe", 35: "Fat\u0131r",
    36: "Yasin", 37: "Saffat", 38: "Sad", 39: "Z\u00fcmer", 40: "M\u00fcmin",
    41: "Fussilet", 42: "\u015eura", 43: "Zuhruf", 44: "Duhan", 45: "Casiye",
    46: "Ahkaf", 47: "Muhammed", 48: "Fetih", 49: "Hucurat", 50: "Kaf",
    51: "Zariyat", 52: "Tur", 53: "Necm", 54: "Kamer", 55: "Rahman",
    56: "Vak\u0131a", 57: "Hadid", 58: "Mucadele", 59: "Ha\u015fr",
    60: "M\u00fcmtehine", 61: "Saf", 62: "Cuma", 63: "M\u00fcnafikun",
    64: "Tegabun", 65: "Talak", 66: "Tahrim", 67: "M\u00fclk", 68: "Kalem",
    69: "Hakka", 70: "Mearic", 71: "Nuh", 72: "Cin", 73: "M\u00fczzemmil",
    74: "M\u00fcddesir", 75: "K\u0131yame", 76: "\u0130nsan",
    77: "M\u00fcrselat", 78: "Nebe", 79: "Naziat", 80: "Abese",
    81: "Tekvir", 82: "\u0130nfitar", 83: "Mutaffif\u0131n",
    84: "\u0130n\u015fikak", 85: "B\u00fcruc", 86: "Tar\u0131k", 87: "Ala",
    88: "Ga\u015fiye", 89: "Fecr", 90: "Beled", 91: "\u015eems", 92: "Leyl",
    93: "Duha", 94: "\u0130n\u015firah", 95: "Tin", 96: "Alak", 97: "Kadir",
    98: "Beyyine", 99: "Zilzal", 100: "Adiyat", 101: "Karia",
    102: "Tekas\u00fcr", 103: "Asr", 104: "H\u00fcmeze", 105: "Fil",
    106: "Kurey\u015f", 107: "Maun", 108: "Kevser", 109: "Kafirun",
    110: "Nasr", 111: "Tebbet", 112: "\u0130hlas", 113: "Felak", 114: "Nas",
}

# Sure ayet sayilari (dogrulama icin)
SURAH_VERSE_COUNTS = {
    1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,
    11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
    21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,
    31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
    41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,
    51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
    61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,
    71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
    81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,
    91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
    101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,
    111:5,112:4,113:5,114:6,
}

HEADER_PATTERN = re.compile(r'(\d{1,3})\s*/\s*(\d{1,3})')


# ---------------------------------------------------------------------------
# parse_rich_text — dipnot koordinat sistemi
# ---------------------------------------------------------------------------
SURAH_NUMBERS = {
    "fatiha":1,"bakara":2,"al-i imran":3,"ali imran":3,
    "nisa":4,"maide":5,"enam":6,"en'am":6,"araf":7,"a'raf":7,
    "enfal":8,"tevbe":9,"yunus":10,"hud":11,"yusuf":12,
    "rad":13,"ra'd":13,"ibrahim":14,"hicr":15,"nahl":16,
    "isra":17,"kehf":18,"meryem":19,"taha":20,"ta ha":20,
    "enbiya":21,"hac":22,"muminun":23,"nur":24,"furkan":25,
    "suara":26,"neml":27,"kasas":28,"ankebut":29,"rum":30,
    "lokman":31,"secde":32,"ahzab":33,"sebe":34,"fatir":35,
    "yasin":36,"saffat":37,"sad":38,"zumer":39,"zumer":39,
    "mumin":40,"gafir":40,"fussilet":41,"sura":42,"zuhruf":43,
    "duhan":44,"casiye":45,"ahkaf":46,"muhammed":47,"fetih":48,
    "hucurat":49,"kaf":50,"zariyat":51,"tur":52,"necm":53,
    "kamer":54,"rahman":55,"vakia":56,"hadid":57,"mucadele":58,
    "hasr":59,"mumtehine":60,"saff":61,"cuma":62,"munafikun":63,
    "tegabun":64,"talak":65,"tahrim":66,"mulk":67,"mülk":67,
    "kalem":68,"hakka":69,"mearic":70,"nuh":71,"cin":72,
    "muzzemmil":73,"muddessir":74,"müddesir":74,"kiyame":75,
    "insan":76,"murselat":77,"mürselat":77,"nebe":78,"naziat":79,
    "abese":80,"tekvir":81,"infitar":82,"mutaffifin":83,
    "insikak":84,"buruc":85,"tarik":86,"ala":87,"gasiye":88,
    "fecr":89,"beled":90,"sems":91,"leyl":92,"duha":93,
    "insirah":94,"tin":95,"alak":96,"kadir":97,"beyyine":98,
    "zilzal":99,"adiyat":100,"karia":101,"tekasur":102,"asr":103,
    "humeze":104,"fil":105,"kureys":106,"maun":107,"kevser":108,
    "kafirun":109,"nasr":110,"leheb":111,"ihlas":112,"felak":113,
    "nas":114,
}


def _normalize(name):
    name = name.lower().strip()
    for a, b in [("\u00ee","i"),("\u00e2","a"),("\u00fb","u"),("\u00f6","o"),
                 ("\u00fc","u"),("\u015f","s"),("\u011f","g"),("\u00e7","c"),
                 ("\u0131","i"),("\u2019","'"),("\u00b4","'")]:
        name = name.replace(a, b)
    return name


def _surah_to_id(name):
    return SURAH_NUMBERS.get(_normalize(name))


def _clean_spec(spec):
    return re.sub(r'[\s\n]+', '', spec).strip('.,;)(')


def _expand_range(sid, spec):
    spec = _clean_spec(spec)
    coords = []
    if not spec:
        return coords
    for part in spec.split(','):
        part = part.strip()
        if not part:
            continue
        if '-' in part:
            pieces = part.split('-')
            try:
                s, e = int(pieces[0].strip()), int(pieces[-1].strip())
                if e - s > 300 or s < 1:
                    continue
                coords.extend(f"{sid}:{i}" for i in range(s, e + 1))
            except (ValueError, TypeError):
                pass
        elif part.isdigit():
            coords.append(f"{sid}:{part}")
    return coords


def parse_rich_text(text):
    """Dipnot metnini link/text parcalarina boler."""
    pattern = re.compile(
        r'(?:([A-Z\u00c2\u00ce\u00db\u00c7\u015e\u011e\u00dc\u00d6'
        r'a-z\u00e2\u00ee\u00fb\u00e7\u015f\u011f\u00fc\u00f6\u0131\u0130\'\-]+'
        r'(?:[\s\-][A-Z\u00c2\u00ce\u00db\u00c7\u015e\u011e\u00dc\u00d6'
        r'a-z\u00e2\u00ee\u00fb\u00e7\u015f\u011f\u00fc\u00f6\u0131\u0130\'\-]+)*)'
        r'\s+)?'
        r'(\d{1,3})/\s*(\d[\d\s\-,]*)', re.UNICODE
    )
    segments, connections = [], []
    last_end = 0
    for m in pattern.finditer(text):
        start, end = m.start(), m.end()
        sname = (m.group(1) or "").strip()
        snum = m.group(2)
        aspec = m.group(3)
        sid = _surah_to_id(sname) if sname else None
        if not sid:
            try:
                sid = int(snum)
                if not (1 <= sid <= 114):
                    continue
            except Exception:
                continue
        aspec = _clean_spec(aspec)
        if not aspec:
            continue
        targets = _expand_range(sid, aspec)
        if not targets:
            continue
        if start > last_end:
            t = text[last_end:start]
            if t.strip():
                segments.append({"type": "text", "content": t})
        lc = f"{sname} {snum}/{aspec}" if sname else f"{snum}/{aspec}"
        segments.append({"type": "link", "content": lc, "targets": targets})
        for t in targets:
            connections.append({"target_coordinate": t, "context": lc})
        last_end = end
    if last_end < len(text):
        r = text[last_end:]
        if r.strip():
            segments.append({"type": "text", "content": r})
    return segments, connections


# ---------------------------------------------------------------------------
# Metin karsilastirma yardimcilari
# ---------------------------------------------------------------------------
def normalize_text(text):
    """Karsilastirma icin metni normalize et."""
    if not text:
        return ""
    text = text.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')
    # Coklu bosluk/newline -> tek bosluk
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    return text


def deep_normalize(text):
    """Derin normalize: dipnot/meal icin whitespace farklarini yok et."""
    t = normalize_text(text)
    # Dipnot referans etrafindaki bosluk farklari: "[*]\n" vs "[*] "
    t = re.sub(r'\[\s*(\d*)\s*\*\s*\]\s*', lambda m: f'[{m.group(1)}*] ', t)
    # Araci tirnak/quote farklari
    t = t.replace('\u201c', '"').replace('\u201d', '"')
    t = t.replace('\u2018', "'").replace('\u2019', "'")
    return t


def texts_match(db_text, site_text, tolerance=0.90):
    """
    Iki metni karsilastirir. Whitespace/format farklarini tolere eder.
    Gercek icerik farkli mi kontrol eder.
    """
    a = deep_normalize(db_text)
    b = deep_normalize(site_text)
    if not a and not b:
        return True
    if not a or not b:
        return False
    if a == b:
        return True
    # Uzunluk bazli hizli kontrol
    shorter = min(len(a), len(b))
    longer = max(len(a), len(b))
    if shorter / longer < tolerance:
        return False
    # Karakter bazli benzerlik (ilk N karakter)
    check_len = min(shorter, 80)
    if a[:check_len] == b[:check_len]:
        return True
    # Son N karakter de kontrol et
    if a[-check_len:] == b[-check_len:]:
        return True
    return False


def _split_meal_dipnot(text):
    """Meal ve dipnotu ayirir."""
    text = text.replace('\xa0', ' ').strip()
    m = re.search(r'\n\s*\n\s*\n?\s*\[[\d]*\*\]', text)
    if m:
        return text[:m.start()].strip(), text[m.start():].strip()
    return text, ""


# ---------------------------------------------------------------------------
# Sayfa cekme ve parse
# ---------------------------------------------------------------------------
def fetch_surah_page(sure_no):
    """Sure sayfasini siteden ceker."""
    slug = SURAH_SLUGS.get(sure_no)
    if not slug:
        return None
    url = BASE_URL + url_quote(slug, safe='_-') + ".htm"
    try:
        r = requests.get(url, timeout=30)
        r.encoding = 'utf-8'
        if r.status_code == 200 and len(r.text) > 15000:
            return r.text
    except Exception as e:
        print(f"  ! Sure {sure_no} hata: {e}")
    return None


def parse_surah_page(html, sure_no):
    """HTML'den {ayet_no: {ayet, meal, dipnot}} haritasi cikarir."""
    soup = BeautifulSoup(html, 'html.parser')
    headers = soup.find_all('span', class_='qrHeader')
    tr_texts = soup.find_all('div', class_='trText')
    qr_texts = soup.find_all('div', class_='qrText')

    if len(headers) != len(tr_texts) or len(headers) != len(qr_texts):
        return None

    verses = {}
    for i, (h, qr, tr) in enumerate(zip(headers, qr_texts, tr_texts)):
        ht = h.get_text().strip()
        if i == 0 and 'TEF' in ht.upper() and '/' not in ht:
            continue
        m = HEADER_PATTERN.search(ht)
        if not m:
            continue
        ps, pa = int(m.group(1)), int(m.group(2))
        if ps != sure_no:
            continue

        ayet_text = qr.get_text().strip()
        raw_tr = tr.get_text().replace('\xa0', ' ').strip()
        meal_text, dipnot_text = _split_meal_dipnot(raw_tr)

        verses[pa] = {
            "ayet": ayet_text,
            "meal": meal_text,
            "dipnot": dipnot_text,
        }
    return verses


# ---------------------------------------------------------------------------
# DB islemleri
# ---------------------------------------------------------------------------
def get_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    return db


def get_surah_from_db(db, sure_no):
    """Sure ayetlerini DB'den ceker."""
    rows = db.execute("""
        SELECT id, ayet_no, ayet, meal, dipnot, dipnot_parsed, mapping_data
        FROM verses WHERE sure_no = ? ORDER BY ayet_no
    """, (sure_no,)).fetchall()
    verses = {}
    for r in rows:
        verses[r[1]] = {
            "id": r[0], "ayet_no": r[1],
            "ayet": r[2] or "", "meal": r[3] or "",
            "dipnot": r[4] or "", "dipnot_parsed": r[5] or "",
            "mapping_data": r[6] or "",
        }
    return verses


# ---------------------------------------------------------------------------
# Ana karsilastirma
# ---------------------------------------------------------------------------
def compare_surah(db, sure_no, site_verses, do_fix=False):
    """Bir sureyi DB ile site arasinda karsilastirir."""
    db_verses = get_surah_from_db(db, sure_no)
    expected_count = SURAH_VERSE_COUNTS.get(sure_no, 0)

    diffs = []
    fixes = []

    # Ayet sayisi kontrolu
    if len(site_verses) != expected_count:
        diffs.append({
            "type": "AYET_SAYISI",
            "sure": sure_no,
            "detail": f"Site={len(site_verses)}, Beklenen={expected_count}, DB={len(db_verses)}"
        })

    for ayet_no in range(1, expected_count + 1):
        vid = f"{sure_no}:{ayet_no}"
        db_v = db_verses.get(ayet_no, {})
        site_v = site_verses.get(ayet_no, {})

        if not db_v:
            diffs.append({"type": "DB_EKSIK", "id": vid, "detail": "Ayet DB'de yok"})
            continue
        if not site_v:
            diffs.append({"type": "SITE_EKSIK", "id": vid, "detail": "Ayet sitede yok"})
            continue

        fix_entry = {"id": vid}
        has_fix = False

        # --- ARAPCA METIN ---
        db_ayet = normalize_text(db_v.get("ayet", ""))
        site_ayet = normalize_text(site_v.get("ayet", ""))
        if not db_ayet and site_ayet:
            diffs.append({
                "type": "AYET_BOS", "id": vid, "field": "ayet",
                "site": site_ayet[:60]
            })
            fix_entry["ayet"] = site_v["ayet"]
            has_fix = True
        elif db_ayet and site_ayet and not texts_match(db_ayet, site_ayet):
            diffs.append({
                "type": "AYET_FARKLI", "id": vid, "field": "ayet",
                "db": db_ayet[:60], "site": site_ayet[:60]
            })
            # Arapca metin farki: siteyi tercih et (daha guncel)
            fix_entry["ayet"] = site_v["ayet"]
            has_fix = True

        # --- MEAL ---
        db_meal = normalize_text(db_v.get("meal", ""))
        site_meal = normalize_text(site_v.get("meal", ""))
        if not db_meal and site_meal:
            diffs.append({
                "type": "MEAL_BOS", "id": vid, "field": "meal",
                "site": site_meal[:60]
            })
            fix_entry["meal"] = site_v["meal"]
            has_fix = True
        elif db_meal and site_meal and not texts_match(db_meal, site_meal):
            diffs.append({
                "type": "MEAL_FARKLI", "id": vid, "field": "meal",
                "db": db_meal[:60], "site": site_meal[:60]
            })
            # Meal farki: siteyi tercih et
            fix_entry["meal"] = site_v["meal"]
            has_fix = True

        # --- DIPNOT ---
        db_dipnot = normalize_text(db_v.get("dipnot", ""))
        site_dipnot = normalize_text(site_v.get("dipnot", ""))
        if not db_dipnot and site_dipnot:
            diffs.append({
                "type": "DIPNOT_BOS", "id": vid, "field": "dipnot",
                "site": site_dipnot[:60]
            })
            fix_entry["dipnot"] = site_v["dipnot"]
            # dipnot_parsed ve mapping_data olustur
            segments, connections = parse_rich_text(site_v["dipnot"])
            if segments:
                fix_entry["dipnot_parsed"] = json.dumps(segments, ensure_ascii=False)
            mapping = {"coordinate": vid, "connections": connections}
            # Mevcut mapping_data connections birlestir
            if db_v.get("mapping_data"):
                try:
                    existing = json.loads(db_v["mapping_data"])
                    existing_targets = {c["target_coordinate"]
                                        for c in existing.get("connections", [])}
                    for conn in connections:
                        if conn["target_coordinate"] not in existing_targets:
                            existing["connections"].append(conn)
                    mapping = existing
                except Exception:
                    pass
            fix_entry["mapping_data"] = json.dumps(mapping, ensure_ascii=False)
            has_fix = True
        elif db_dipnot and site_dipnot and not texts_match(db_dipnot, site_dipnot):
            diffs.append({
                "type": "DIPNOT_FARKLI", "id": vid, "field": "dipnot",
                "db": db_dipnot[:60], "site": site_dipnot[:60]
            })
            # Dipnot farki: siteyi tercih et, koordinatlari yeniden parse et
            fix_entry["dipnot"] = site_v["dipnot"]
            segments, connections = parse_rich_text(site_v["dipnot"])
            if segments:
                fix_entry["dipnot_parsed"] = json.dumps(segments, ensure_ascii=False)
            mapping = {"coordinate": vid, "connections": connections}
            if db_v.get("mapping_data"):
                try:
                    existing = json.loads(db_v["mapping_data"])
                    # Tefsir popup connections'lari koru
                    tefsir_conns = [c for c in existing.get("connections", [])
                                    if c not in connections]
                    mapping["connections"] = connections + tefsir_conns
                except Exception:
                    pass
            fix_entry["mapping_data"] = json.dumps(mapping, ensure_ascii=False)
            has_fix = True

        # dipnot dolu ama dipnot_parsed bos? -> re-parse
        if (db_v.get("dipnot", "").strip() or fix_entry.get("dipnot", "").strip()):
            dp_source = fix_entry.get("dipnot", db_v.get("dipnot", "")).strip()
            dp_parsed = fix_entry.get("dipnot_parsed", db_v.get("dipnot_parsed", "")).strip()
            if dp_source and not dp_parsed:
                segments, connections = parse_rich_text(dp_source)
                if segments:
                    fix_entry["dipnot_parsed"] = json.dumps(segments, ensure_ascii=False)
                    has_fix = True

        if has_fix:
            fixes.append(fix_entry)

    return diffs, fixes


def apply_fixes(db, fixes):
    """Duzeltmeleri DB'ye uygular."""
    cursor = db.cursor()
    updated = 0
    for fix in fixes:
        set_parts = []
        params = []
        for col in ["ayet", "meal", "dipnot", "dipnot_parsed", "mapping_data"]:
            if col in fix:
                set_parts.append(f"{col} = ?")
                params.append(fix[col])
        if not set_parts:
            continue
        params.append(fix["id"])
        cursor.execute(f"UPDATE verses SET {', '.join(set_parts)} WHERE id = ?", params)
        updated += cursor.rowcount
    db.commit()
    return updated


# ---------------------------------------------------------------------------
# Ana fonksiyon
# ---------------------------------------------------------------------------
def main():
    do_fix = "--fix" in sys.argv
    report_file = None

    # --sure parametresi
    sure_range = None
    for i, arg in enumerate(sys.argv):
        if arg == "--sure" and i + 1 < len(sys.argv):
            val = sys.argv[i + 1]
            if '-' in val:
                parts = val.split('-')
                sure_range = range(int(parts[0]), int(parts[1]) + 1)
            else:
                sure_range = [int(val)]
        if arg == "--report" and i + 1 < len(sys.argv):
            report_file = sys.argv[i + 1]

    if sure_range is None:
        sure_range = range(1, 115)

    print("=" * 60)
    print("  SemantikGalaksi - DB/Site Senkronizasyon Kontrolu")
    print("=" * 60)
    if do_fix:
        print("  MOD: DUZELTME (--fix)")
    else:
        print("  MOD: SADECE RAPOR (--fix ile duzeltme yapabilirsiniz)")
    print(f"  Sure araligi: {list(sure_range)[0]}-{list(sure_range)[-1]}")
    print(f"  DB: {DB_PATH}")
    print("=" * 60)
    print()

    db = get_db()
    all_diffs = []
    all_fixes = []
    surah_stats = {}

    for sure_no in sure_range:
        slug = SURAH_SLUGS.get(sure_no, "?")
        expected = SURAH_VERSE_COUNTS.get(sure_no, 0)
        sys.stdout.write(f"\r  [{sure_no:3d}/114] {slug:15s} ({expected:3d} ayet) ...")
        sys.stdout.flush()

        html = fetch_surah_page(sure_no)
        if not html:
            print(f"\r  [{sure_no:3d}/114] {slug:15s} ! SAYFA ALINAMADI")
            all_diffs.append({
                "type": "SAYFA_HATA", "sure": sure_no, "detail": "Sayfa alinamadi"
            })
            continue

        site_verses = parse_surah_page(html, sure_no)
        if site_verses is None:
            print(f"\r  [{sure_no:3d}/114] {slug:15s} ! PARSE HATASI")
            all_diffs.append({
                "type": "PARSE_HATA", "sure": sure_no, "detail": "HTML parse hatasi"
            })
            continue

        diffs, fixes = compare_surah(db, sure_no, site_verses, do_fix)

        if diffs:
            # Fark turlerine gore say
            type_counts = defaultdict(int)
            for d in diffs:
                type_counts[d["type"]] += 1
            summary = ", ".join(f"{k}={v}" for k, v in sorted(type_counts.items()))
            print(f"\r  [{sure_no:3d}/114] {slug:15s} {len(diffs):3d} fark ({summary})")
        else:
            print(f"\r  [{sure_no:3d}/114] {slug:15s}  OK")

        surah_stats[sure_no] = {
            "name": slug, "expected": expected,
            "site_count": len(site_verses),
            "diff_count": len(diffs),
            "fix_count": len(fixes),
        }

        all_diffs.extend(diffs)
        all_fixes.extend(fixes)

        time.sleep(0.5)

    # Ozet rapor
    print()
    print("=" * 60)
    print("  OZET RAPOR")
    print("=" * 60)

    type_totals = defaultdict(int)
    for d in all_diffs:
        type_totals[d["type"]] += 1

    print(f"  Kontrol edilen sure : {len(surah_stats)}")
    print(f"  Toplam fark         : {len(all_diffs)}")
    print(f"  Duzeltilecek kayit  : {len(all_fixes)}")
    print()
    print("  Fark turleri:")
    for t, c in sorted(type_totals.items()):
        print(f"    {t:20s}: {c}")

    # Raporu dosyaya yaz
    if report_file:
        report = {
            "summary": {
                "total_diffs": len(all_diffs),
                "total_fixes": len(all_fixes),
                "type_totals": dict(type_totals),
                "surah_stats": surah_stats,
            },
            "diffs": all_diffs,
            "fixes": [{"id": f["id"], "fields": [k for k in f if k != "id"]}
                      for f in all_fixes],
        }
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n  Rapor yazildi: {report_file}")

    # Duzeltme
    if do_fix and all_fixes:
        print(f"\n  DB'ye {len(all_fixes)} duzeltme uygulanıyor...")
        updated = apply_fixes(db, all_fixes)
        print(f"  {updated} satir guncellendi.")

        # Dogrulama
        for col in ["ayet", "meal", "dipnot"]:
            remaining = db.execute(
                f"SELECT COUNT(*) FROM verses WHERE {col} IS NULL OR TRIM({col}) = ''"
            ).fetchone()[0]
            print(f"  Kalan bos {col:15s}: {remaining}")
    elif do_fix:
        print("\n  Duzeltilecek fark yok.")

    db.close()
    print("\n  Islem tamamlandi.")


if __name__ == "__main__":
    main()
