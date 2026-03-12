"""
Gemini TTS ile Eûzü Besmele ses dosyası üretici.
Kullanım:
    python generate_besmele_audio.py <API_KEY>
    python generate_besmele_audio.py           (interaktif key girişi)
"""
import urllib.request
import json
import base64
import wave
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'Frontend', 'besmele.wav')

BESMELE_TEXT = (
    "Kovulmuş şeytandan Allah'a sığınırım! "
    "İyiliği sonsuz, ikramı bol Allah'ın adıyla."
)

TTS_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent"
VOICE_NAME = "Orus"
SAMPLE_RATE = 24000


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


def generate(api_key: str) -> bool:
    payload = json.dumps({
        "contents": [{
            "parts": [{
                "text": (
                    "Bu Türkçe duayı güçlü, tok ve kararlı bir erkek sesiyle oku. "
                    "Her kelimeyi aynı ses yüksekliğinde, net ve güçlü söyle. "
                    "Cümle sonlarında sesi kısma, son kelimeleri de güçlü bitir: "
                    + BESMELE_TEXT
                )
            }]
        }],
        "generationConfig": {
            "temperature": 0,
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

    print("⏳ Gemini TTS API çağrılıyor...")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"❌ API hatası ({e.code}): {body[:300]}")
        return False
    except Exception as e:
        print(f"❌ Bağlantı hatası: {e}")
        return False

    part = (result.get("candidates") or [{}])[0]
    part = (part.get("content", {}).get("parts") or [{}])[0]
    inline = part.get("inlineData", {})

    if not inline.get("data"):
        print("❌ API'den ses verisi alınamadı.")
        print(json.dumps(result, indent=2, ensure_ascii=False)[:500])
        return False

    pcm_bytes = base64.b64decode(inline["data"])
    print(f"✅ PCM verisi alındı: {len(pcm_bytes)} byte")

    pcm_bytes = _normalize_pcm(pcm_bytes)
    print("✅ Ses normalize edildi")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with wave.open(OUTPUT_PATH, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm_bytes)

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"✅ Ses dosyası kaydedildi: {OUTPUT_PATH}")
    print(f"   Boyut: {size_kb:.1f} KB | Süre: ~{len(pcm_bytes) / (SAMPLE_RATE * 2):.1f}s")
    return True


if __name__ == "__main__":
    if len(sys.argv) > 1:
        key = sys.argv[1]
    else:
        key = input("🔑 Gemini API Key: ").strip()

    if not key:
        print("❌ API key boş olamaz.")
        sys.exit(1)

    ok = generate(key)
    sys.exit(0 if ok else 1)
