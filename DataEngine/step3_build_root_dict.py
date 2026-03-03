"""
ADIM 3 — Kök Sözlüğü Oluşturucu (Gemini AI)
═════════════════════════════════════════════
Tüm benzersiz kökleri tarar, her kök için detaylı bilgi üretir.

Akış:
    quran_data.json  ──▶  [Gemini AI]  ──▶  quran_roots.json
    (step2 çıktısı)                         (kök sözlüğü)

Her kök için üretilen bilgiler:
    • meaning       — Türkçe anlam (2-5 kelime)
    • meaning_ar    — Arapça kısa açıklama
    • pronunciation — Latin telaffuz (ör: "r-ḥ-m")
    • derived       — Kur'an'daki türemiş kelimeler [{word, meaning}]
    • ayahs         — Geçtiği ayet listesi ["1:1", "2:37", ...]
    • count         — Toplam geçiş sayısı

Kullanım:
    python step3_build_root_dict.py

Özellikler:
    ✦ Resume   — Kesintide kaldığı yerden devam eder (progress_step3.json)
    ✦ Batch    — 5'er kök paralel işleme
    ✦ Backoff  — Rate limit'te otomatik bekleme
    ✦ Fallback — Başarısız kökler boş şablonla kaydedilir
"""

import os
import asyncio
import aiohttp
import json
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import gemini_client as gemini

# ── Dosya Yolları ───────────────────────────────────────────

INPUT_FILE    = "quran_data.json"
OUTPUT_FILE   = "quran_roots.json"
PROGRESS_FILE = "progress_step3.json"

# ── İşlem Parametreleri ─────────────────────────────────────

CONCURRENCY = 3
BATCH_SIZE  = 5

# ── Kök Detay Prompt'u ─────────────────────────────────────

ROOT_DETAIL_PROMPT = """Arapça kök: "{root}"

Bu kökle ilgili şu bilgileri JSON olarak döndür:
1. "meaning": Bu kökün Türkçe anlamı (kısa, 2-5 kelime)
2. "meaning_ar": Kökün Arapça kısa açıklaması (2-5 kelime)
3. "pronunciation": Latin harflerle telaffuz (örn: "r-ḥ-m")
4. "derived": Kur'an-ı Kerim'de bu kökten türeyen kelimelerin listesi. Her biri:
   - "word": Arapça kelime (harekeli)
   - "meaning": Türkçe anlamı (1-3 kelime)

Sadece Kur'an'da geçen türemiş kelimeleri dahil et. Maksimum 10 kelime.
Örnek çıktı:
{{
  "meaning": "merhamet, şefkat",
  "meaning_ar": "الرأفة والعطف",
  "pronunciation": "r-ḥ-m",
  "derived": [
    {{"word": "الرَّحْمَٰنِ", "meaning": "Rahman (çok merhametli)"}},
    {{"word": "رَحِيم", "meaning": "Rahim (merhametli)"}},
    {{"word": "رَحْمَة", "meaning": "rahmet"}}
  ]
}}"""


# ── Kök → Ayet Haritası ────────────────────────────────────

def collect_roots_and_ayahs(nodes):
    """quran_data.json'dan tüm benzersiz kökleri ve geçtikleri ayetleri çıkarır."""
    root_ayahs = {}
    for node in nodes:
        ayah_id = node["id"]
        for root in node.get("roots", []):
            root_clean = root.replace(" ", "")
            if root_clean:
                root_ayahs.setdefault(root_clean, []).append(ayah_id)
    return root_ayahs


# ── Tek Kök İşleme ─────────────────────────────────────────

def empty_root_entry(ayah_ids):
    """Başarısız kökler için boş şablon oluşturur."""
    return {
        "meaning": "",
        "meaning_ar": "",
        "pronunciation": "",
        "derived": [],
        "ayahs": ayah_ids,
        "count": len(ayah_ids)
    }


async def fetch_root_details(session, root, ayah_ids, semaphore):
    """Gemini'den bir kökün anlam + türemiş kelime bilgisini alır."""
    prompt = ROOT_DETAIL_PROMPT.format(root=root)
    result = await gemini.call_gemini_json(session, prompt, semaphore)

    if isinstance(result, dict):
        result["ayahs"] = ayah_ids
        result["count"] = len(ayah_ids)
        return result

    return empty_root_entry(ayah_ids)


# ── İlerleme Yönetimi ──────────────────────────────────────

def load_progress():
    """Önceki oturumdan kalan ilerlemeyi yükler."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_progress(root_dict):
    """Mevcut ilerlemeyi diske yazar."""
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(root_dict, f, ensure_ascii=False, indent=2)


# ── Ana İşlem ──────────────────────────────────────────────

async def run():
    if not gemini.is_configured():
        print("HATA: .env dosyasında API_KEY bulunamadı!")
        sys.exit(1)

    if not os.path.exists(INPUT_FILE):
        print(f"HATA: {INPUT_FILE} bulunamadı! Önce step2'yi çalıştırın.")
        sys.exit(1)

    print("=" * 60)
    print("  ADIM 3 — Kök Sözlüğü (Gemini AI)")
    print(f"  Model: {gemini.MODEL_NAME}")
    print("=" * 60)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        nodes = json.load(f)["nodes"]

    root_ayahs = collect_roots_and_ayahs(nodes)
    total = len(root_ayahs)
    print(f"\n  {total} benzersiz kök bulundu.")

    root_dict = load_progress()
    remaining = {r: a for r, a in root_ayahs.items() if r not in root_dict}
    done = len(root_dict)

    if not remaining:
        print("  ✓ Tüm kökler zaten işlenmiş!")
    else:
        if done > 0:
            print(f"  ℹ Önceki oturumdan {done} kök yüklendi.")
        print(f"  {done}/{total} tamamlanmış, {len(remaining)} kaldı.\n")

        roots_list = list(remaining.items())
        semaphore = asyncio.Semaphore(CONCURRENCY)

        async with aiohttp.ClientSession() as session:
            for i in range(0, len(roots_list), BATCH_SIZE):
                batch = roots_list[i:i + BATCH_SIZE]
                tasks = [
                    fetch_root_details(session, root, ayahs, semaphore)
                    for root, ayahs in batch
                ]
                results = await asyncio.gather(*tasks)

                for (root, _), result in zip(batch, results):
                    root_dict[root] = result

                save_progress(root_dict)
                done = len(root_dict)
                print(f"  İlerleme: {done}/{total}  ({done * 100 // total}%)", end="\r")
                await asyncio.sleep(2)

    # ── Final çıktısı ──
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(root_dict, f, ensure_ascii=False, indent=2)

    # ── İstatistik ──
    filled = sum(1 for v in root_dict.values() if v.get("meaning"))
    total_derived = sum(len(v.get("derived", [])) for v in root_dict.values())
    print(f"\n\n{'=' * 60}")
    print(f"  ✓ {len(root_dict)} kök → {OUTPUT_FILE}")
    print(f"  ✓ {filled} kök anlamı dolduruldu")
    print(f"  ✓ {total_derived} türemiş kelime kaydedildi")
    print(f"{'=' * 60}")
    print(f"\n  Frontend'e kopyala: cp {OUTPUT_FILE} ../Frontend/")


# ── Giriş Noktası ──────────────────────────────────────────

if __name__ == "__main__":
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
