"""
Gemini API ile Kur'an kök anlamlarını toplu çeviri scripti.
quran_roots.json'dan 2139 kök anlamını (meaning + derived[].meaning) EN/RU/IT/ES dillerine çevirir.

Kullanım:
    python generate_root_translations.py <API_KEY>
    python generate_root_translations.py <API_KEY> en        (sadece İngilizce)
    python generate_root_translations.py                     (interaktif key girişi)

Çıktı:
    Frontend/locales/roots_en.json
    Frontend/locales/roots_ru.json
    Frontend/locales/roots_it.json
    Frontend/locales/roots_es.json
"""
import json
import os
import sys
import time
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOTS_PATH = os.path.join(SCRIPT_DIR, '..', 'Frontend', 'quran_roots.json')
LOCALES_DIR = os.path.join(SCRIPT_DIR, '..', 'Frontend', 'locales')

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

LANGUAGES = {
    'en': {'name': 'English', 'output': 'roots_en.json'},
    'ru': {'name': 'Russian', 'output': 'roots_ru.json'},
    'it': {'name': 'Italian', 'output': 'roots_it.json'},
    'es': {'name': 'Spanish', 'output': 'roots_es.json'},
}

BATCH_SIZE = 75  # Her API çağrısında kaç kök gönderilecek


def load_roots():
    with open(ROOTS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_batch_prompt(batch, target_lang):
    """Bir grup kök için çeviri prompt'u oluşturur."""
    prompt = (
        f"You are a professional translator specializing in Quranic Arabic terminology. "
        f"Translate the following Turkish meanings of Arabic root words into {target_lang}. "
        f"Return ONLY a valid JSON object — no markdown, no explanation, no code fences.\n\n"
        f"Input is a JSON object where each key is an Arabic root. Each root has:\n"
        f'- "meaning": the Turkish meaning of the root (translate this)\n'
        f'- "derived": array of derived words, each with a "meaning" field in Turkish (translate these too)\n\n'
        f"Return the EXACT same structure with the same Arabic keys, but with meanings translated to {target_lang}.\n"
        f"Keep Arabic words (the root keys and derived[].word) unchanged.\n"
        f"Keep meaning_ar unchanged if present.\n\n"
        f"Input:\n{json.dumps(batch, ensure_ascii=False, indent=None)}"
    )
    return prompt


def call_gemini(api_key, prompt):
    """Gemini API'yi çağırır ve text yanıtını döndürür."""
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }).encode('utf-8')

    url = f"{API_URL}?key={api_key}"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=300) as resp:
        result = json.loads(resp.read().decode('utf-8'))

    candidates = result.get('candidates', [{}])
    parts = candidates[0].get('content', {}).get('parts', [{}])
    text = parts[0].get('text', '')
    return text


def parse_response(text):
    """API yanıtından JSON parse eder (code fence temizliği dahil)."""
    text = text.strip()
    if text.startswith('```'):
        lines = text.split('\n')
        lines = lines[1:]  # İlk satır (```json) atla
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        text = '\n'.join(lines)
    return json.loads(text)


def translate_roots_for_lang(api_key, roots, lang_code):
    """Tüm kökleri batch'ler halinde çevirir."""
    lang = LANGUAGES[lang_code]
    print(f"\n{'=' * 60}")
    print(f"  [{lang_code.upper()}] {lang['name']} cevirisi basliyor...")
    print(f"  Toplam kok: {len(roots)} | Batch boyutu: {BATCH_SIZE}")
    print(f"{'=' * 60}")

    root_keys = list(roots.keys())
    translated = {}
    total_batches = (len(root_keys) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(root_keys), BATCH_SIZE):
        batch_num = i // BATCH_SIZE + 1
        batch_keys = root_keys[i:i + BATCH_SIZE]

        # Batch verisi hazırla (sadece meaning + derived)
        batch_data = {}
        for k in batch_keys:
            entry = roots[k]
            batch_entry = {'meaning': entry.get('meaning', '')}
            if 'derived' in entry and entry['derived']:
                batch_entry['derived'] = [
                    {'word': d.get('word', ''), 'meaning': d.get('meaning', '')}
                    for d in entry['derived']
                ]
            batch_data[k] = batch_entry

        prompt = build_batch_prompt(batch_data, lang['name'])

        retry = 0
        max_retries = 3
        while retry < max_retries:
            try:
                print(f"  [{batch_num}/{total_batches}] {len(batch_keys)} kok cevriliyor...", end=' ', flush=True)
                text = call_gemini(api_key, prompt)
                result = parse_response(text)

                # Sonuçları birleştir
                for k in batch_keys:
                    if k in result:
                        translated[k] = result[k]
                    else:
                        # API bu kökü döndürmediyse orijinali koru
                        translated[k] = batch_data[k]

                print(f"OK ({len(result)} kok)")
                break

            except urllib.error.HTTPError as e:
                body = e.read().decode('utf-8', errors='replace')[:200]
                retry += 1
                if e.code == 429:
                    wait = 15 * retry
                    print(f"WAIT: Rate limit, {wait}s bekleniyor...")
                    time.sleep(wait)
                elif retry < max_retries:
                    print(f"FAIL: HTTP {e.code}: {body[:100]}")
                    time.sleep(5)
                else:
                    print(f"FAIL: (HTTP {e.code})")
                    for k in batch_keys:
                        translated[k] = batch_data[k]

            except Exception as e:
                retry += 1
                print(f"ERROR: {e}")
                if retry < max_retries:
                    time.sleep(5)
                else:
                    for k in batch_keys:
                        translated[k] = batch_data[k]

        # Rate limit — batch'ler arası bekleme
        if batch_num < total_batches:
            time.sleep(2)

    # Dosyaya kaydet
    output_path = os.path.join(LOCALES_DIR, lang['output'])
    os.makedirs(LOCALES_DIR, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(translated, f, ensure_ascii=False, indent=2)

    print(f"\n  DONE: {output_path}")
    print(f"  Cevrilen kok: {len(translated)}/{len(roots)}")
    return translated


def main():
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
    else:
        # .env dosyasından oku
        env_path = os.path.join(SCRIPT_DIR, '.env')
        api_key = ''
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break
        if not api_key:
            api_key = input("Gemini API Key: ").strip()

    if not api_key:
        print("ERROR: API key bos olamaz.")
        sys.exit(1)

    roots = load_roots()
    print(f"{len(roots)} kok yuklendi.")

    # Tek dil mi yoksa tüm diller mi?
    if len(sys.argv) > 2:
        lang = sys.argv[2].lower()
        if lang not in LANGUAGES:
            print(f"ERROR: Unknown lang: {lang}")
            print(f"   Valid: {', '.join(LANGUAGES.keys())}")
            sys.exit(1)
        translate_roots_for_lang(api_key, roots, lang)
    else:
        print("All languages translation starting...")
        print(f"   Languages: {', '.join(c.upper() for c in LANGUAGES)}")
        results = {}
        for code in LANGUAGES:
            results[code] = translate_roots_for_lang(api_key, roots, code)

        print(f"\n{'=' * 60}")
        print("  SUMMARY:")
        for code in LANGUAGES:
            count = len(results[code]) if results[code] else 0
            status = "OK" if count == len(roots) else f"PARTIAL {count}/{len(roots)}"
            print(f"  {status} {code.upper()} - {LANGUAGES[code]['output']}")
        print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
