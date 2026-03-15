# -*- coding: utf-8 -*-
"""SemantikGalaksi -- Eksik Mealleri Doldurma Scripti

Sueleymaniye Vakfi Meali web sitesinden eksik (bos) meal alanlarini
dogrudan HTML parse ile doldurur. AI kullanmaz, direkt BeautifulSoup
ile div.trText / span.qrHeader eslestirir.

Kullanim:
    python fill_missing_meals.py [--dry-run]

--dry-run: DB'ye yazmadan sadece ne bulundugunu raporlar.
"""

import sqlite3
import requests
import re
import time
import sys
import os
from collections import defaultdict
from bs4 import BeautifulSoup

# --- Yapilandirma ---
DOMAIN = "https://www.suleymaniyevakfimeali.com"
BASE_URL = DOMAIN + "/Meal/"
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quran.db")

# Sure slug haritasi — quran_extractor_v3.py'deki Turk karakterli orijinal slug'lar
# Site, Turk karaktersiz (ASCII) slug'larda bos template donduruyor.
# URL-encoded Turk karakterli slug'lar gercek icerigi donduruyor.
SURAH_SLUGS = {
    1: "Fatiha", 2: "Bakara", 3: "Al-i_İmran", 4: "Nisa", 5: "Maide",
    6: "Enam", 7: "Araf", 8: "Enfal", 9: "Tevbe", 10: "Yunus",
    11: "Hud", 12: "Yusuf", 13: "Rad", 14: "İbrahim", 15: "Hicr",
    16: "Nahl", 17: "İsra", 18: "Kehf", 19: "Meryem", 20: "Ta_Ha",
    21: "Enbiya", 22: "Hac", 23: "Müminun", 24: "Nur", 25: "Furkan",
    26: "Şuara", 27: "Neml", 28: "Kasas", 29: "Ankebut", 30: "Rum",
    31: "Lokman", 32: "Secde", 33: "Ahzab", 34: "Sebe", 35: "Fatır",
    36: "Yasin", 37: "Saffat", 38: "Sad", 39: "Zümer", 40: "Mümin",
    41: "Fussilet", 42: "Şura", 43: "Zuhruf", 44: "Duhan", 45: "Casiye",
    46: "Ahkaf", 47: "Muhammed", 48: "Fetih", 49: "Hucurat", 50: "Kaf",
    51: "Zariyat", 52: "Tur", 53: "Necm", 54: "Kamer", 55: "Rahman",
    56: "Vakıa", 57: "Hadid", 58: "Mucadele", 59: "Haşr", 60: "Mümtehine",
    61: "Saf", 62: "Cuma", 63: "Münafikun", 64: "Tegabun", 65: "Talak",
    66: "Tahrim", 67: "Mülk", 68: "Kalem", 69: "Hakka", 70: "Mearic",
    71: "Nuh", 72: "Cin", 73: "Müzzemmil", 74: "Müddesir", 75: "Kıyame",
    76: "İnsan", 77: "Mürselat", 78: "Nebe", 79: "Naziat", 80: "Abese",
    81: "Tekvir", 82: "İnfitar", 83: "Mutaffifın", 84: "İnşikak",
    85: "Büruc", 86: "Tarık", 87: "Ala", 88: "Gaşiye", 89: "Fecr",
    90: "Beled", 91: "Şems", 92: "Leyl", 93: "Duha", 94: "İnşirah",
    95: "Tin", 96: "Alak", 97: "Kadir", 98: "Beyyine", 99: "Zilzal",
    100: "Adiyat", 101: "Karia", 102: "Tekasür", 103: "Asr", 104: "Hümeze",
    105: "Fil", 106: "Kureyş", 107: "Maun", 108: "Kevser", 109: "Kafirun",
    110: "Nasr", 111: "Tebbet", 112: "İhlas", 113: "Felak", 114: "Nas",
}

# qrHeader regex: "(SureName sure_no/ayet_no)" seklinde
HEADER_PATTERN = re.compile(r'(\d{1,3})\s*/\s*(\d{1,3})')


def get_db():
    """SQLite baglantisi ac."""
    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    return db


def get_missing_meals(db):
    """Meali bos ayetlerin ID ve sure bilgilerini dondurur."""
    rows = db.execute("""
        SELECT id, sure_no, ayet_no FROM verses
        WHERE meal IS NULL OR TRIM(meal) = ''
        ORDER BY sure_no, ayet_no
    """).fetchall()
    grouped = defaultdict(list)
    for verse_id, sure_no, ayet_no in rows:
        grouped[sure_no].append((verse_id, ayet_no))
    return grouped


def get_neighbor_meals(db, sure_no, ayet_no):
    """Onceki ve sonraki ayetin mealini dondurur (cross-check icin)."""
    prev_meal = None
    next_meal = None
    # Onceki ayet
    if ayet_no > 1:
        row = db.execute(
            "SELECT meal FROM verses WHERE sure_no=? AND ayet_no=?",
            (sure_no, ayet_no - 1)
        ).fetchone()
        if row and row[0]:
            prev_meal = row[0].strip()[:80]
    # Sonraki ayet
    row = db.execute(
        "SELECT meal FROM verses WHERE sure_no=? AND ayet_no=?",
        (sure_no, ayet_no + 1)
    ).fetchone()
    if row and row[0]:
        next_meal = row[0].strip()[:80]
    return prev_meal, next_meal


def fetch_surah_page(sure_no):
    """Sure sayfasini Sueleymaniye Vakfi'ndan ceker.
    Slug'lar Turk karakterli; urllib.parse.quote ile URL-encode edilir.
    ASCII slug 200 dondurur ama ~14KB bos template olur, gercek icerik > 15KB.
    """
    from urllib.parse import quote as url_quote
    slug = SURAH_SLUGS.get(sure_no)
    if not slug:
        print(f"  ! Sure {sure_no} icin slug bulunamadi")
        return None

    encoded_slug = url_quote(slug, safe='_-')
    url = BASE_URL + encoded_slug + ".htm"

    try:
        response = requests.get(url, timeout=30)
        response.encoding = 'utf-8'
        if response.status_code == 200 and len(response.text) > 15000:
            return response.text
        elif response.status_code == 200:
            print(f"  ! Sure {sure_no} ({slug}): Sayfa geldi ama bos template ({len(response.text)} byte)")
    except Exception as e:
        print(f"  ! Sure {sure_no} URL hatasi ({url}): {e}")

    print(f"  ! Sure {sure_no} ({slug}) sayfa alinamadi")
    return None


def parse_surah_meals(html_content, sure_no):
    """
    HTML'den ayet numarasi -> meal haritasi cikarir.
    Doner: {ayet_no: {"meal": str, "dipnot": str}}
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    headers = soup.find_all('span', class_='qrHeader')
    tr_texts = soup.find_all('div', class_='trText')

    if len(headers) != len(tr_texts):
        print(f"  ! Sure {sure_no}: header ({len(headers)}) != trText ({len(tr_texts)}) sayisi uyumsuz")
        return {}

    meals = {}
    for i, (header, tr) in enumerate(zip(headers, tr_texts)):
        header_text = header.get_text().strip()

        # Besmele ("TEFSiR" basligi, ayet numarasi yok)
        if i == 0 and 'TEF' in header_text.upper() and '/' not in header_text:
            continue

        # Ayet numarasini cek
        m = HEADER_PATTERN.search(header_text)
        if not m:
            continue

        parsed_sure = int(m.group(1))
        parsed_ayet = int(m.group(2))

        # Sure numarasi uyumsuzsa atla
        if parsed_sure != sure_no:
            continue

        # Meal metnini al
        raw_text = tr.get_text()
        # \xa0 (non-breaking space) temizle
        raw_text = raw_text.replace('\xa0', ' ')
        # Bosluk/satir temizligi
        raw_text = raw_text.strip()

        if not raw_text:
            continue

        # Meal ve dipnotu ayir
        # Dipnot genellikle [*], [1*], [2*] vb. ile baslar
        # Ilk dipnot isaretinden once = meal, sonrasi = dipnot
        meal_text, dipnot_text = split_meal_dipnot(raw_text)

        meals[parsed_ayet] = {
            "meal": meal_text,
            "dipnot": dipnot_text,
        }

    return meals


def split_meal_dipnot(text):
    """
    Meal metnini meal ve dipnot olarak ayirir.
    Dipnot genellikle satir basinda [*] veya [1*] ile baslar.
    """
    # Dipnot baslangic pattern'leri: satir sonu + [*] veya [sayı*]
    # Ilk \n\n sonrasi gelen [*] veya [\d*] dipnot baslangicindir
    dipnot_pattern = re.compile(r'\n\s*\n\s*\n?\s*\[[\d]*\*\]')

    m = dipnot_pattern.search(text)
    if m:
        meal = text[:m.start()].strip()
        dipnot = text[m.start():].strip()
        return meal, dipnot
    else:
        return text.strip(), ""


def cross_check_with_neighbors(db, sure_no, ayet_no, site_meal, site_prev_meal, site_next_meal):
    """
    DB'deki komsu ayet mealleriyle site verisini karsilastirir.
    Uyumsuzluk varsa uyari verir ama yine de True dondurur (bilgilendirme amacli).
    """
    db_prev, db_next = get_neighbor_meals(db, sure_no, ayet_no)
    warnings = []

    # Site'daki onceki ayetin meali, DB'deki oncekiyle eslesiyor mu?
    if db_prev and site_prev_meal:
        # Ilk 40 karakteri karsilastir (kucuk farkliliklari tolere et)
        db_start = db_prev[:40].strip()
        site_start = site_prev_meal[:40].strip()
        if db_start and site_start:
            # Basit benzerlik: ilk 20 karakter uyuyor mu?
            overlap = min(len(db_start), len(site_start), 20)
            if db_start[:overlap] != site_start[:overlap]:
                warnings.append(f"  ? Onceki ayet meali farkli: DB=[{db_start[:30]}...] Site=[{site_start[:30]}...]")

    if db_next and site_next_meal:
        db_start = db_next[:40].strip()
        site_start = site_next_meal[:40].strip()
        if db_start and site_start:
            overlap = min(len(db_start), len(site_start), 20)
            if db_start[:overlap] != site_start[:overlap]:
                warnings.append(f"  ? Sonraki ayet meali farkli: DB=[{db_start[:30]}...] Site=[{site_start[:30]}...]")

    return warnings


def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("=== DRY RUN MODU - DB'ye yazilmayacak ===\n")

    print("--- Eksik Meal Doldurma Islemi ---")
    print(f"DB: {DB_PATH}\n")

    db = get_db()

    # 1. Eksik mealleri bul
    missing = get_missing_meals(db)
    total_missing = sum(len(v) for v in missing.values())
    print(f"Toplam eksik meal: {total_missing} ayet, {len(missing)} sure\n")

    if total_missing == 0:
        print("Tum mealler dolu, islem gerekmez.")
        db.close()
        return

    filled = 0
    failed = 0
    skipped = 0
    warnings_total = 0
    results = []

    # 2. Her sure icin islem yap
    for sure_no in sorted(missing.keys()):
        verse_list = missing[sure_no]
        slug = SURAH_SLUGS.get(sure_no, "?")
        print(f"Sure {sure_no} ({slug}) - {len(verse_list)} eksik ayet")

        # Sayfayi cek
        html = fetch_surah_page(sure_no)
        if not html:
            print(f"  X Sayfa alinamadi, {len(verse_list)} ayet atlaniyor")
            failed += len(verse_list)
            continue

        # HTML'den tum mealleri parse et
        site_meals = parse_surah_meals(html, sure_no)
        print(f"  Siteden {len(site_meals)} ayet meali parse edildi")

        # 3. Eksik ayetleri doldur
        for verse_id, ayet_no in verse_list:
            site_data = site_meals.get(ayet_no)

            if not site_data or not site_data["meal"]:
                print(f"  X {verse_id}: Sitede de meal bulunamadi")
                failed += 1
                continue

            meal = site_data["meal"]
            dipnot = site_data["dipnot"]

            # Komsu ayetlerle cross-check
            site_prev = site_meals.get(ayet_no - 1, {}).get("meal", "")
            site_next = site_meals.get(ayet_no + 1, {}).get("meal", "")
            warnings = cross_check_with_neighbors(db, sure_no, ayet_no, meal, site_prev, site_next)
            for w in warnings:
                print(w)
                warnings_total += 1

            # Meal uzunluk kontrolu (cok kisa = supeli)
            if len(meal) < 5:
                print(f"  ? {verse_id}: Meal cok kisa ({len(meal)} kar), atlaniyor: [{meal}]")
                skipped += 1
                continue

            results.append({
                "id": verse_id,
                "sure_no": sure_no,
                "ayet_no": ayet_no,
                "meal": meal,
                "dipnot": dipnot,
            })
            print(f"  + {verse_id}: [{meal[:60]}...]")
            filled += 1

        # Rate limit - sureler arasi bekleme
        time.sleep(1)

    # 4. Sonuclari DB'ye yaz
    print(f"\n--- Sonuc ---")
    print(f"Bulunan : {filled}")
    print(f"Basarisiz: {failed}")
    print(f"Atlanan : {skipped}")
    print(f"Uyari   : {warnings_total}")

    if not dry_run and results:
        print(f"\nDB'ye {len(results)} meal yaziliyor...")
        cursor = db.cursor()
        for r in results:
            # Sadece bos olan mealleri guncelle (guvenlik)
            cursor.execute("""
                UPDATE verses SET meal = ?, dipnot = CASE
                    WHEN (dipnot IS NULL OR TRIM(dipnot) = '') AND ? != ''
                    THEN ? ELSE dipnot END
                WHERE id = ? AND (meal IS NULL OR TRIM(meal) = '')
            """, (r["meal"], r["dipnot"], r["dipnot"], r["id"]))
        db.commit()
        print(f"DB guncellendi. {cursor.rowcount} satir etkilendi.")

        # Dogrulama
        remaining = db.execute("""
            SELECT COUNT(*) FROM verses
            WHERE meal IS NULL OR TRIM(meal) = ''
        """).fetchone()[0]
        print(f"Kalan bos meal: {remaining}")
    elif dry_run:
        print("\n[DRY RUN] DB'ye yazilmadi.")
    else:
        print("\nHic meal bulunamadi, DB degismedi.")

    db.close()
    print("\n--- Islem tamamlandi ---")


if __name__ == "__main__":
    main()
