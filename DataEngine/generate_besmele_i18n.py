"""
Gemini TTS ile çoklu dil besmele ses dosyası üretici.
Her dil için locales/ klasörüne besmele_{code}.wav kaydeder.

Kullanım:
    python generate_besmele_i18n.py <API_KEY>
    python generate_besmele_i18n.py                (interaktif key girişi)
    python generate_besmele_i18n.py <API_KEY> en    (sadece İngilizce)
"""
import urllib.request
import json
import base64
import wave
import sys
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOCALES_DIR = os.path.join(SCRIPT_DIR, '..', 'Frontend', 'locales')

TTS_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent"
VOICE_NAME = "Orus"
SAMPLE_RATE = 24000

# ── Dil bazlı besmele metinleri ve TTS talimatları
LANGUAGES = {
    'en': {
        'text': "I seek refuge in Allah from the accursed Satan. In the name of Allah, the Most Gracious, the Most Merciful.",
        'prompt': "Read this English prayer with a strong, deep and confident male voice. "
                  "Keep consistent volume throughout, do not lower your voice at the end of sentences. "
                  "Speak clearly and powerfully: ",
        'output': 'besmele_en.wav'
    },
    'ru': {
        'text': "Прибегаю к Аллаху от проклятого шайтана. Именем Аллаха, Милостивого, Милосердного.",
        'prompt': "Прочитай эту молитву на русском языке сильным, уверенным мужским голосом. "
                  "Держи одинаковую громкость на протяжении всего текста, не понижай голос в конце предложений. "
                  "Говори чётко и мощно: ",
        'output': 'besmele_ru.wav'
    },
    'it': {
        'text': "Mi rifugio in Allah dal maledetto Satana. Nel nome di Allah, il Misericordioso, il Compassionevole.",
        'prompt': "Leggi questa preghiera in italiano con una voce maschile forte, profonda e sicura. "
                  "Mantieni un volume costante, non abbassare la voce alla fine delle frasi. "
                  "Parla in modo chiaro e potente: ",
        'output': 'besmele_it.wav'
    },
    'es': {
        'text': "Me refugio en Allah del maldito Satanás. En el nombre de Allah, el Misericordioso, el Compasivo.",
        'prompt': "Lee esta oración en español con una voz masculina fuerte, profunda y segura. "
                  "Mantén un volumen constante, no bajes la voz al final de las oraciones. "
                  "Habla de forma clara y poderosa: ",
        'output': 'besmele_es.wav'
    }
}


def _normalize_pcm(pcm_bytes):
    """PCM verisini normalize et — ses seviyesini dengele"""
    import struct as st
    n = len(pcm_bytes) // 2
    samples = list(st.unpack(f'<{n}h', pcm_bytes))
    peak = max(abs(s) for s in samples) or 1
    target = 28000
    ratio = target / peak
    samples = [max(-32767, min(32767, int(s * ratio))) for s in samples]
    return st.pack(f'<{n}h', *samples)


def generate_one(api_key: str, lang_code: str) -> bool:
    if lang_code not in LANGUAGES:
        print(f"❌ Bilinmeyen dil kodu: {lang_code}")
        print(f"   Geçerli kodlar: {', '.join(LANGUAGES.keys())}")
        return False

    lang = LANGUAGES[lang_code]
    output_path = os.path.join(LOCALES_DIR, lang['output'])

    payload = json.dumps({
        "contents": [{
            "parts": [{
                "text": lang['prompt'] + lang['text']
            }]
        }],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": VOICE_NAME}
                }
            }
        }
    }).encode("utf-8")

    url = f"{TTS_URL}?key={api_key}"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    print(f"⏳ [{lang_code.upper()}] Gemini TTS API çağrılıyor...")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"❌ [{lang_code.upper()}] API hatası ({e.code}): {body[:300]}")
        return False
    except Exception as e:
        print(f"❌ [{lang_code.upper()}] Bağlantı hatası: {e}")
        return False

    part = (result.get("candidates") or [{}])[0]
    part = (part.get("content", {}).get("parts") or [{}])[0]
    inline = part.get("inlineData", {})

    if not inline.get("data"):
        print(f"❌ [{lang_code.upper()}] API'den ses verisi alınamadı.")
        return False

    pcm_bytes = base64.b64decode(inline["data"])
    pcm_bytes = _normalize_pcm(pcm_bytes)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with wave.open(output_path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm_bytes)

    size_kb = os.path.getsize(output_path) / 1024
    duration = len(pcm_bytes) / (SAMPLE_RATE * 2)
    print(f"✅ [{lang_code.upper()}] Kaydedildi: {output_path}")
    print(f"   Boyut: {size_kb:.1f} KB | Süre: ~{duration:.1f}s")
    return True


def generate_all(api_key: str) -> dict:
    results = {}
    for i, code in enumerate(LANGUAGES):
        if i > 0:
            print("   ⏸ 3 saniye bekleniyor (rate limit)...")
            time.sleep(3)
        results[code] = generate_one(api_key, code)
    return results


if __name__ == "__main__":
    if len(sys.argv) > 1:
        key = sys.argv[1]
    else:
        key = input("🔑 Gemini API Key: ").strip()

    if not key:
        print("❌ API key boş olamaz.")
        sys.exit(1)

    if len(sys.argv) > 2:
        lang = sys.argv[2].lower()
        ok = generate_one(key, lang)
    else:
        print("🌐 Tüm diller için besmele üretiliyor...")
        print(f"   Diller: {', '.join(c.upper() for c in LANGUAGES)}")
        print(f"   Çıktı: {LOCALES_DIR}/")
        print()
        results = generate_all(key)
        ok = all(results.values())
        print()
        print("═" * 50)
        for code, success in results.items():
            status = "✅" if success else "❌"
            print(f"  {status} {code.upper()} — {LANGUAGES[code]['output']}")
        print("═" * 50)

    sys.exit(0 if ok else 1)
