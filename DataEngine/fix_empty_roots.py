"""
Boş Kök Düzeltici — quran_roots.json içindeki meaning/derived boş kökleri doldurur
═══════════════════════════════════════════════════════════════════════════════════
Sadece eksik kökleri Gemini AI ile tamamlar, geri kalanına dokunmaz.

Kullanım:
    python fix_empty_roots.py
"""

import os
import asyncio
import aiohttp
import json
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import gemini_client as gemini

ROOTS_FILE = "quran_roots.json"
FRONTEND_FILE = os.path.join("..", "Frontend", "quran_roots.json")

CONCURRENCY = 3

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


async def fix_root(session, root, entry, semaphore):
    """Tek bir boş kökü Gemini ile doldurur."""
    prompt = ROOT_DETAIL_PROMPT.format(root=root)
    result = await gemini.call_gemini_json(session, prompt, semaphore)

    if isinstance(result, dict):
        entry["meaning"] = result.get("meaning", "")
        entry["meaning_ar"] = result.get("meaning_ar", "")
        entry["pronunciation"] = result.get("pronunciation", "")
        entry["derived"] = result.get("derived", [])
        return True
    return False


async def main():
    if not gemini.is_configured():
        print("HATA: GEMINI_API_KEY ayarlanmamis!")
        return

    with open(ROOTS_FILE, "r", encoding="utf-8") as f:
        roots_dict = json.load(f)

    empty_roots = {k: v for k, v in roots_dict.items() if not v.get("meaning")}
    total = len(empty_roots)

    if total == 0:
        print("Tum kokler dolu, duzeltilecek bir sey yok.")
        return

    print(f"Bos kok sayisi: {total}")
    print(f"Ornekler: {list(empty_roots.keys())[:10]}")
    print()

    semaphore = asyncio.Semaphore(CONCURRENCY)
    fixed = 0
    failed = 0

    async with aiohttp.ClientSession() as session:
        for i, (root, entry) in enumerate(empty_roots.items(), 1):
            print(f"[{i}/{total}] {root} ... ", end="", flush=True)
            ok = await fix_root(session, root, entry, semaphore)
            if ok:
                fixed += 1
                print(f"OK -> {entry.get('meaning', '?')}")
                roots_dict[root] = entry
            else:
                failed += 1
                print("BASARISIZ")

            if i % 10 == 0:
                with open(ROOTS_FILE, "w", encoding="utf-8") as f:
                    json.dump(roots_dict, f, ensure_ascii=False, indent=2)
                print(f"  [ara kayit: {fixed} duzeltildi]")

    with open(ROOTS_FILE, "w", encoding="utf-8") as f:
        json.dump(roots_dict, f, ensure_ascii=False, indent=2)

    if os.path.isdir(os.path.dirname(FRONTEND_FILE)):
        with open(FRONTEND_FILE, "w", encoding="utf-8") as f:
            json.dump(roots_dict, f, ensure_ascii=False, indent=2)
        print(f"\nFrontend kopyasi da guncellendi: {FRONTEND_FILE}")

    print(f"\nSONUC: {fixed} duzeltildi, {failed} basarisiz, toplam {total}")


if __name__ == "__main__":
    asyncio.run(main())
