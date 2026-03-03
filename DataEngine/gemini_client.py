"""
Gemini API İstemcisi — Ortak Yardımcı Modül
────────────────────────────────────────────
step2 ve step3 tarafından kullanılan paylaşımlı Gemini API fonksiyonları.

İçerik:
    - Config yükleme (.env → API_KEY, GEMINI_MODEL)
    - JSON yanıt temizleme (markdown code fence kaldırma)
    - Async Gemini API çağrısı (exponential backoff + semaphore)

Not: Bu modül doğrudan çalıştırılmaz, import edilir.
"""

import os
import re
import json
import asyncio
import aiohttp
from dotenv import load_dotenv

load_dotenv()

# ── Konfigürasyon ──────────────────────────────────────────

API_KEY    = os.getenv("API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
API_URL    = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"

RETRY_DELAYS = [1, 2, 4, 8, 16]


# ── Yardımcı Fonksiyonlar ──────────────────────────────────

def is_configured():
    """API anahtarının tanımlı olup olmadığını kontrol eder."""
    return bool(API_KEY)


def clean_json_response(raw_text):
    """Gemini yanıtındaki ```json ... ``` bloklarını temizler."""
    cleaned = re.sub(r'```json\s*|```\s*', '', raw_text).strip()
    return cleaned


def parse_gemini_result(response_json):
    """Gemini API yanıtından metin içeriğini çıkarır."""
    return (
        response_json
        .get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )


# ── Async API Çağrısı ──────────────────────────────────────

async def call_gemini(session, prompt, semaphore, response_mime="application/json"):
    """
    Gemini API'ye prompt gönderir, JSON yanıt döner.

    Args:
        session:  aiohttp.ClientSession
        prompt:   Gemini'ye gönderilecek metin
        semaphore: asyncio.Semaphore (eşzamanlılık kontrolü)
        response_mime: Yanıt formatı (varsayılan JSON)

    Returns:
        str | None — Ham metin yanıt (parse edilmemiş)
    """
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": response_mime}
    }

    async with semaphore:
        for delay in RETRY_DELAYS:
            try:
                async with session.post(API_URL, json=payload, timeout=30) as response:
                    if response.status == 200:
                        result = await response.json()
                        return parse_gemini_result(result)
                    elif response.status == 429:
                        print(f"  ⏳ Rate limit, {delay}sn bekleniyor...")
                        await asyncio.sleep(delay)
                    elif 500 <= response.status < 600:
                        print(f"  ⚠ Sunucu hatası ({response.status}), {delay}sn bekleniyor...")
                        await asyncio.sleep(delay)
                    else:
                        print(f"  ✗ Beklenmeyen HTTP {response.status}")
                        break
            except asyncio.TimeoutError:
                print(f"  ⏳ Zaman aşımı, {delay}sn bekleniyor...")
                await asyncio.sleep(delay)
            except Exception as e:
                print(f"  ⚠ Bağlantı hatası: {e}")
                await asyncio.sleep(delay)
        return None


async def call_gemini_json(session, prompt, semaphore):
    """
    Gemini'yi çağırıp yanıtı parse edilmiş JSON olarak döner.

    Returns:
        dict | list | None
    """
    raw = await call_gemini(session, prompt, semaphore)
    if raw is None:
        return None

    cleaned = clean_json_response(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None
