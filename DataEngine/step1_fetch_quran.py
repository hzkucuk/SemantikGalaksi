"""
ADIM 1: Kur'an Veri Çekici
─────────────────────────
Quran API'den tüm ayetleri çeker (Arapça Uthmani + Türkçe Diyanet meali).
Çıktı: quran_raw.json

Kullanım:
    python step1_fetch_quran.py
"""

import json
import requests
import sys


API_ARABIC  = "https://api.alquran.cloud/v1/quran/quran-uthmani"
API_TURKISH = "https://api.alquran.cloud/v1/quran/tr.diyanet"
OUTPUT_FILE = "quran_raw.json"


def fetch_quran():
    print("=" * 60)
    print("  ADIM 1: Kur'an Verisi Çekiliyor")
    print("=" * 60)

    # ── Arapça metin ──
    print("\n[1/2] Arapça metin indiriliyor...")
    try:
        ar_res = requests.get(API_ARABIC, timeout=30).json()
        ar_surahs = ar_res["data"]["surahs"]
        print(f"      ✓ {sum(len(s['ayahs']) for s in ar_surahs)} ayet alındı.")
    except Exception as e:
        print(f"      ✗ Arapça veri indirilemedi: {e}")
        sys.exit(1)

    # ── Türkçe meal ──
    print("[2/2] Türkçe meal indiriliyor...")
    try:
        tr_res = requests.get(API_TURKISH, timeout=30).json()
        tr_surahs = tr_res["data"]["surahs"]
        print(f"      ✓ {sum(len(s['ayahs']) for s in tr_surahs)} meal alındı.")
    except Exception as e:
        print(f"      ✗ Türkçe meal indirilemedi: {e}")
        sys.exit(1)

    # ── Eşleştir ──
    if len(ar_surahs) != len(tr_surahs):
        print("HATA: Arapça ve Türkçe sure sayısı uyuşmuyor!")
        sys.exit(1)

    nodes = []
    for ar_surah, tr_surah in zip(ar_surahs, tr_surahs):
        surah_num = ar_surah["number"]
        surah_name = ar_surah["englishName"]
        for ar_ayah, tr_ayah in zip(ar_surah["ayahs"], tr_surah["ayahs"]):
            ayah_num = ar_ayah["numberInSurah"]
            nodes.append({
                "id": f"{surah_num}:{ayah_num}",
                "surah": surah_name,
                "text": ar_ayah["text"],
                "translation": tr_ayah["text"]
            })

    # ── Kaydet ──
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"nodes": nodes}, f, ensure_ascii=False, indent=2)

    print(f"\n✓ {len(nodes)} ayet → {OUTPUT_FILE}")
    print("  Sonraki adım: python step2_extract_roots.py")


if __name__ == "__main__":
    fetch_quran()
