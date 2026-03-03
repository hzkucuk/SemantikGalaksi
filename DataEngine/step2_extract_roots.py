"""
ADIM 2 — Kök Ayıklayıcı (Gemini AI)
═════════════════════════════════════
Her ayetin Arapça metninden sülasi (üç harfli) kökleri çıkarır.

Akış:
    quran_raw.json  ──▶  [Gemini AI]  ──▶  quran_data.json
    (step1 çıktısı)                        (ayet + kökler)

Kullanım:
    python step2_extract_roots.py

Özellikler:
    ✦ Resume   — Kesintide kaldığı yerden devam eder (progress_step2.json)
    ✦ Batch    — 10'ar ayet toplu Gemini çağrısı
    ✦ Backoff  — Rate limit'te otomatik bekleme
    ✦ Sıralama — Final çıktı sure:ayet sırasına göre
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

INPUT_FILE    = "quran_raw.json"
OUTPUT_FILE   = "quran_data.json"
PROGRESS_FILE = "progress_step2.json"

# ── İşlem Parametreleri ─────────────────────────────────────

BATCH_SIZE  = 10
CONCURRENCY = 5

# ── Kök Çıkarma Prompt'u ───────────────────────────────────

ROOT_PROMPT = """Aşağıdaki Arapça ayet metnindeki kelimelerin sülasi (üç harfli) köklerini bul.
Sadece kök harflerini içeren bir JSON listesi döndür. Başka hiçbir metin ekleme.
Kökleri boşluksuz yaz (örn: "حمد" doğru, "ح م د" yanlış).
Örnek: ["حمد", "اله", "ربب"]
Metin: {ayah_text}"""


# ── Tek Ayet İşleme ────────────────────────────────────────

async def extract_roots_for_ayah(session, arabic_text, semaphore):
    """Bir ayetin Arapça metninden kökleri çıkarır."""
    prompt = ROOT_PROMPT.format(ayah_text=arabic_text)
    result = await gemini.call_gemini_json(session, prompt, semaphore)

    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        return result.get("roots", [])
    return []


# ── İlerleme Yönetimi ──────────────────────────────────────

def load_progress():
    """Önceki oturumdan kalan ilerlemeyi yükler."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            progress = json.load(f)
            return {n["id"]: n for n in progress.get("nodes", [])}
    return {}


def save_progress(processed):
    """Mevcut ilerlemeyi diske yazar."""
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"nodes": list(processed.values())}, f, ensure_ascii=False, indent=2)


# ── Ana İşlem ──────────────────────────────────────────────

async def run():
    if not gemini.is_configured():
        print("HATA: .env dosyasında API_KEY bulunamadı!")
        sys.exit(1)

    if not os.path.exists(INPUT_FILE):
        print(f"HATA: {INPUT_FILE} bulunamadı! Önce step1'i çalıştırın.")
        sys.exit(1)

    print("=" * 60)
    print("  ADIM 2 — Kök Ayıklama (Gemini AI)")
    print(f"  Model: {gemini.MODEL_NAME}")
    print("=" * 60)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw_data = json.load(f)["nodes"]

    processed = load_progress()
    remaining = [n for n in raw_data if n["id"] not in processed]
    total = len(raw_data)
    done  = len(processed)

    if not remaining:
        print("\n  ✓ Tüm ayetler zaten işlenmiş!")
    else:
        if done > 0:
            print(f"\n  ℹ Önceki oturumdan {done} ayet yüklendi.")
        print(f"  {done}/{total} tamamlanmış, {len(remaining)} kaldı.\n")

        semaphore = asyncio.Semaphore(CONCURRENCY)
        async with aiohttp.ClientSession() as session:
            for i in range(0, len(remaining), BATCH_SIZE):
                batch = remaining[i:i + BATCH_SIZE]
                tasks = [
                    extract_roots_for_ayah(session, n["text"], semaphore)
                    for n in batch
                ]
                results = await asyncio.gather(*tasks)

                for node, roots in zip(batch, results):
                    processed[node["id"]] = {
                        "id": node["id"],
                        "surah": node["surah"],
                        "text": node["text"],
                        "translation": node["translation"],
                        "roots": roots,
                        "dipnot": ""
                    }

                save_progress(processed)
                done = len(processed)
                print(f"  İlerleme: {done}/{total}  ({done * 100 // total}%)", end="\r")
                await asyncio.sleep(2)

    # ── Sıralı final çıktısı ──
    def sort_key(node):
        s, a = map(int, node["id"].split(":"))
        return (s, a)

    all_nodes = sorted(processed.values(), key=sort_key)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"nodes": all_nodes}, f, ensure_ascii=False, indent=2)

    # ── İstatistik ──
    roots_total = sum(len(n.get("roots", [])) for n in all_nodes)
    unique_roots = len(set(r for n in all_nodes for r in n.get("roots", [])))
    print(f"\n\n{'=' * 60}")
    print(f"  ✓ {len(all_nodes)} ayet işlendi → {OUTPUT_FILE}")
    print(f"  ✓ {roots_total} kök referansı ({unique_roots} benzersiz)")
    print(f"{'=' * 60}")
    print(f"\n  Sonraki adım: python step3_build_root_dict.py")


# ── Giriş Noktası ──────────────────────────────────────────

if __name__ == "__main__":
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
