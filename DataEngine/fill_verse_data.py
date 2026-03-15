# -*- coding: utf-8 -*-
"""SemantikGalaksi -- Kapsamli Veri Doldurucu

Sueleymaniye Vakfi Meali sitesinden eksik alanlari doldurur:
  - ayet   (Arapca metin)
  - meal   (Turkce ceviri)
  - dipnot (aciklama metni)
  - dipnot_parsed (link/text JSON parcalari)
  - mapping_data  (koordinat baglantilari)

Tefsir bu versiyonda dahil DEGIL.

Kullanim:
    python fill_verse_data.py [--dry-run] [--field ayet|meal|dipnot|all]

--dry-run  : DB'ye yazmadan sadece rapor uretir.
--field    : Hangi alan(lar) doldurulacak. Varsayilan: all
"""

import sqlite3
import requests
import re
import json
import time
import sys
import os
from collections import defaultdict
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Yapilandirma
# ---------------------------------------------------------------------------
DOMAIN = "https://www.suleymaniyevakfimeali.com"
BASE_URL = DOMAIN + "/Meal/"
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quran.db")

# Sure slug haritasi — Turk karakterli orijinal slug'lar
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
    56: "Vak\u0131a", 57: "Hadid", 58: "Mucadele", 59: "Ha\u015fr", 60: "M\u00fcmtehine",
    61: "Saf", 62: "Cuma", 63: "M\u00fcnafikun", 64: "Tegabun", 65: "Talak",
    66: "Tahrim", 67: "M\u00fclk", 68: "Kalem", 69: "Hakka", 70: "Mearic",
    71: "Nuh", 72: "Cin", 73: "M\u00fczzemmil", 74: "M\u00fcddesir", 75: "K\u0131yame",
    76: "\u0130nsan", 77: "M\u00fcrselat", 78: "Nebe", 79: "Naziat", 80: "Abese",
    81: "Tekvir", 82: "\u0130nfitar", 83: "Mutaffif\u0131n", 84: "\u0130n\u015fikak",
    85: "B\u00fcruc", 86: "Tar\u0131k", 87: "Ala", 88: "Ga\u015fiye", 89: "Fecr",
    90: "Beled", 91: "\u015eems", 92: "Leyl", 93: "Duha", 94: "\u0130n\u015firah",
    95: "Tin", 96: "Alak", 97: "Kadir", 98: "Beyyine", 99: "Zilzal",
    100: "Adiyat", 101: "Karia", 102: "Tekas\u00fcr", 103: "Asr", 104: "H\u00fcmeze",
    105: "Fil", 106: "Kurey\u015f", 107: "Maun", 108: "Kevser", 109: "Kafirun",
    110: "Nasr", 111: "Tebbet", 112: "\u0130hlas", 113: "Felak", 114: "Nas",
}

# qrHeader regex: sure_no/ayet_no
HEADER_PATTERN = re.compile(r'(\d{1,3})\s*/\s*(\d{1,3})')

# ---------------------------------------------------------------------------
# parse_rich_text — quran_extractor_v3.py'den kopyalandi
# Dipnot metnini link/text JSON parcalarina boler + koordinat baglantilari
# ---------------------------------------------------------------------------
SURAH_NUMBERS = {
    "fatiha":1,"bakara":2,"al-i imran":3,"ali imran":3,"\u00e2l-i imran":3,
    "nisa":4,"nis\u00e2":4,"maide":5,"m\u00e2ide":5,"enam":6,"en'am":6,
    "en'\u00e2m":6,"en\u00b4am":6,"araf":7,"a'raf":7,"a'r\u00e2f":7,
    "a\u00b4raf":7,"enfal":8,"enf\u00e2l":8,"tevbe":9,
    "yunus":10,"y\u00fbnus":10,"hud":11,"h\u00fbd":11,"yusuf":12,"y\u00fbsuf":12,
    "rad":13,"ra'd":13,"ibrahim":14,"ibr\u00e2h\u00eem":14,"hicr":15,"nahl":16,
    "isra":17,"kehf":18,"meryem":19,"taha":20,"t\u00e2h\u00e2":20,"ta ha":20,
    "enbiya":21,"enbiy\u00e2":21,"hac":22,"muminun":23,"m\u00fc'min\u00fbn":23,
    "m\u00fc\u00b4minun":23,"nur":24,"n\u00fbr":24,"furkan":25,"furk\u00e2n":25,
    "suara":26,"\u015fuar\u00e2":26,"neml":27,"kasas":28,"ankebut":29,
    "ankeb\u00fbt":29,"rum":30,"r\u00fbm":30,"lokman":31,"lokm\u00e2n":31,
    "secde":32,"ahzab":33,"ahz\u00e2b":33,"sebe":34,"fatir":35,"f\u00e2t\u0131r":35,
    "yasin":36,"y\u00e2s\u00een":36,"saffat":37,"s\u00e2ff\u00e2t":37,"sad":38,
    "s\u00e2d":38,"zumer":39,"z\u00fcmer":39,"mumin":40,"m\u00fc'min":40,"gafir":40,
    "fussilet":41,"sura":42,"\u015f\u00fbr\u00e2":42,"zuhruf":43,"duhan":44,
    "duh\u00e2n":44,"casiye":45,"c\u00e2siye":45,"ahkaf":46,"ahk\u00e2f":46,
    "muhammed":47,"fetih":48,"hucurat":49,"hucur\u00e2t":49,"kaf":50,"k\u00e2f":50,
    "zariyat":51,"z\u00e2riy\u00e2t":51,"tur":52,"t\u00fbr":52,"necm":53,"kamer":54,
    "rahman":55,"rahm\u00e2n":55,"vakia":56,"v\u00e2k\u0131a":56,"hadid":57,
    "had\u00eed":57,"mucadele":58,"m\u00fcc\u00e2dele":58,"hasr":59,"ha\u015fr":59,
    "mumtehine":60,"m\u00fcmtehine":60,"saff":61,"cuma":62,"munafikun":63,
    "m\u00fcn\u00e2fik\u00fbn":63,"tegabun":64,"teg\u00e2bun":64,"talak":65,
    "tal\u00e2k":65,"tahrim":66,"tahr\u00eem":66,"mulk":67,"m\u00fclk":67,
    "kalem":68,"hakka":69,"h\u00e2kka":69,"mearic":70,"me\u00e2ric":70,"nuh":71,
    "n\u00fbh":71,"cin":72,"muzzemmil":73,"m\u00fczzemmil":73,"muddessir":74,
    "m\u00fcddessir":74,"kiyame":75,"k\u0131y\u00e2me":75,"insan":76,
    "ins\u00e2n":76,"murselat":77,"m\u00fcrsel\u00e2t":77,"nebe":78,"nebe'":78,
    "naziat":79,"n\u00e2zi\u00e2t":79,"abese":80,"tekvir":81,"tekv\u00eer":81,
    "infitar":82,"infit\u00e2r":82,"mutaffifin":83,"mutaffif\u00een":83,
    "insikak":84,"buruc":85,"bur\u00fbc":85,"tarik":86,"t\u00e2r\u0131k":86,
    "ala":87,"a'l\u00e2":87,"gasiye":88,"g\u00e2\u015fiye":88,"fecr":89,
    "beled":90,"sems":91,"\u015fems":91,"leyl":92,"duha":93,"duh\u00e2":93,
    "insirah":94,"tin":95,"t\u00een":95,"alak":96,"kadir":97,"beyyine":98,
    "zilzal":99,"zilz\u00e2l":99,"adiyat":100,"\u00e2diy\u00e2t":100,
    "karia":101,"k\u00e2ria":101,"tekasur":102,"tek\u00e2s\u00fcr":102,
    "asr":103,"humeze":104,"h\u00fcmeze":104,"fil":105,"f\u00eel":105,
    "kureys":106,"kurey\u015f":106,"maun":107,"m\u00e2\u00fbn":107,
    "kevser":108,"kafirun":109,"k\u00e2fir\u00fbn":109,"nasr":110,"leheb":111,
    "ihlas":112,"felak":113,"nas":114,"n\u00e2s":114,
    "k\u0131yamet":75,"k\u0131y\u00e2met":75,
}


def _normalize_surah(name):
    name = name.lower().strip()
    for a, b in [("\u00ee","i"),("\u00e2","a"),("\u00fb","u"),("\u00f6","o"),
                 ("\u00fc","u"),("\u015f","s"),("\u011f","g"),("\u00e7","c"),
                 ("\u0131","i"),("\u2019","'"),("\u00b4","'")]:
        name = name.replace(a, b)
    return name


def _surah_name_to_id(name):
    return SURAH_NUMBERS.get(_normalize_surah(name))


def _clean_ayah_spec(spec):
    return re.sub(r'[\s\n]+', '', spec).strip('.,;)(')


def _expand_range(surah_id, spec):
    spec = _clean_ayah_spec(spec)
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
                start = int(pieces[0].strip())
                end = int(pieces[-1].strip())
                if end - start > 300 or start < 1:
                    continue
                for i in range(start, end + 1):
                    coords.append(f"{surah_id}:{i}")
            except (ValueError, TypeError):
                pass
        elif part.isdigit():
            coords.append(f"{surah_id}:{part}")
    return coords


def parse_rich_text(text):
    """
    Dipnot metnini link/text JSON parcalarina boler.
    Doner: (segments_list, connections_list)
    segments: [{"type":"text","content":"..."}, {"type":"link","content":"...","targets":["2:3"]}]
    connections: [{"target_coordinate":"2:3","context":"Bakara 2/3"}]
    """
    pattern = re.compile(
        r'(?:([A-Z\u00c2\u00ce\u00db\u00c7\u015e\u011e\u00dc\u00d6'
        r'a-z\u00e2\u00ee\u00fb\u00e7\u015f\u011f\u00fc\u00f6\u0131\u0130\'\-]+'
        r'(?:[\s\-][A-Z\u00c2\u00ce\u00db\u00c7\u015e\u011e\u00dc\u00d6'
        r'a-z\u00e2\u00ee\u00fb\u00e7\u015f\u011f\u00fc\u00f6\u0131\u0130\'\-]+)*)'
        r'\s+)?'
        r'(\d{1,3})'
        r'/\s*'
        r'(\d[\d\s\-,]*)',
        re.UNICODE
    )

    segments = []
    connections = []
    last_end = 0

    for m in pattern.finditer(text):
        start, end = m.start(), m.end()
        surah_name = (m.group(1) or "").strip()
        surah_num_str = m.group(2)
        ayah_spec_raw = m.group(3)

        surah_id = _surah_name_to_id(surah_name) if surah_name else None
        if not surah_id:
            try:
                surah_id = int(surah_num_str)
                if not (1 <= surah_id <= 114):
                    continue
            except Exception:
                continue

        ayah_spec = _clean_ayah_spec(ayah_spec_raw)
        if not ayah_spec:
            continue

        targets = _expand_range(surah_id, ayah_spec)
        if not targets:
            continue

        if start > last_end:
            seg_text = text[last_end:start]
            if seg_text.strip():
                segments.append({"type": "text", "content": seg_text})

        if surah_name:
            link_content = f"{surah_name} {surah_num_str}/{ayah_spec}"
        else:
            link_content = f"{surah_num_str}/{ayah_spec}"

        segments.append({"type": "link", "content": link_content, "targets": targets})
        for t in targets:
            connections.append({"target_coordinate": t, "context": link_content})
        last_end = end

    if last_end < len(text):
        remaining = text[last_end:]
        if remaining.strip():
            segments.append({"type": "text", "content": remaining})

    return segments, connections


# ---------------------------------------------------------------------------
# DB islemleri
# ---------------------------------------------------------------------------
def get_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    return db


def get_verses_needing_update(db, fields):
    """Guncellenmesi gereken ayetleri bulur.
    fields: ['ayet', 'meal', 'dipnot'] gibi liste
    """
    conditions = []
    for f in fields:
        conditions.append(f"({f} IS NULL OR TRIM({f}) = '')")

    where = " OR ".join(conditions)
    rows = db.execute(f"""
        SELECT id, sure_no, ayet_no, ayet, meal, dipnot, dipnot_parsed, mapping_data
        FROM verses
        WHERE {where}
        ORDER BY sure_no, ayet_no
    """).fetchall()

    grouped = defaultdict(list)
    for row in rows:
        grouped[row[1]].append({
            "id": row[0], "sure_no": row[1], "ayet_no": row[2],
            "ayet": row[3] or "", "meal": row[4] or "",
            "dipnot": row[5] or "", "dipnot_parsed": row[6] or "",
            "mapping_data": row[7] or "",
        })
    return grouped


def get_neighbor_meals(db, sure_no, ayet_no):
    """Onceki ve sonraki ayetin mealini dondurur."""
    prev_meal = next_meal = None
    if ayet_no > 1:
        row = db.execute(
            "SELECT meal FROM verses WHERE sure_no=? AND ayet_no=?",
            (sure_no, ayet_no - 1)).fetchone()
        if row and row[0]:
            prev_meal = row[0].strip()[:80]
    row = db.execute(
        "SELECT meal FROM verses WHERE sure_no=? AND ayet_no=?",
        (sure_no, ayet_no + 1)).fetchone()
    if row and row[0]:
        next_meal = row[0].strip()[:80]
    return prev_meal, next_meal


# ---------------------------------------------------------------------------
# Web scraping
# ---------------------------------------------------------------------------
def fetch_surah_page(sure_no):
    """Sure sayfasini siteden ceker. URL-encode ile Turk karakterleri handle eder."""
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
            print(f"  ! Sure {sure_no} ({slug}): Bos template ({len(response.text)} byte)")
    except Exception as e:
        print(f"  ! Sure {sure_no} URL hatasi: {e}")

    print(f"  ! Sure {sure_no} ({slug}) sayfa alinamadi")
    return None


def parse_surah_page(html_content, sure_no):
    """
    HTML'den ayet verisini parse eder.
    Doner: {ayet_no: {"ayet": str, "meal": str, "dipnot": str,
                       "dipnot_parsed": list|None, "mapping_data": dict|None}}
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    headers = soup.find_all('span', class_='qrHeader')
    tr_texts = soup.find_all('div', class_='trText')
    qr_texts = soup.find_all('div', class_='qrText')

    if len(headers) != len(tr_texts) or len(headers) != len(qr_texts):
        print(f"  ! Sure {sure_no}: eleman sayilari uyumsuz "
              f"(h={len(headers)} tr={len(tr_texts)} qr={len(qr_texts)})")
        return {}

    verses = {}
    for i, (header, qr, tr) in enumerate(zip(headers, qr_texts, tr_texts)):
        header_text = header.get_text().strip()

        # Besmele (ilk eleman, ayet numarasi yok)
        if i == 0 and 'TEF' in header_text.upper() and '/' not in header_text:
            continue

        m = HEADER_PATTERN.search(header_text)
        if not m:
            continue

        parsed_sure = int(m.group(1))
        parsed_ayet = int(m.group(2))

        if parsed_sure != sure_no:
            continue

        # Arapca metin
        ayet_text = qr.get_text().strip()

        # Turkce meal + dipnot
        raw_tr = tr.get_text().replace('\xa0', ' ').strip()
        meal_text, dipnot_text = _split_meal_dipnot(raw_tr)

        # Dipnot parse -> link/text segments + connections
        dipnot_parsed = None
        mapping_data = None
        if dipnot_text:
            segments, connections = parse_rich_text(dipnot_text)
            if segments:
                dipnot_parsed = segments
            mapping_data = {
                "coordinate": f"{sure_no}:{parsed_ayet}",
                "connections": connections
            }

        verses[parsed_ayet] = {
            "ayet": ayet_text,
            "meal": meal_text,
            "dipnot": dipnot_text,
            "dipnot_parsed": dipnot_parsed,
            "mapping_data": mapping_data,
        }

    return verses


def _split_meal_dipnot(text):
    """Meal metnini meal ve dipnot olarak ayirir."""
    dipnot_pattern = re.compile(r'\n\s*\n\s*\n?\s*\[[\d]*\*\]')
    m = dipnot_pattern.search(text)
    if m:
        return text[:m.start()].strip(), text[m.start():].strip()
    return text.strip(), ""


# ---------------------------------------------------------------------------
# Cross-check
# ---------------------------------------------------------------------------
def cross_check_neighbors(db, sure_no, ayet_no, site_meals):
    """Komsu ayet meallerini DB ile karsilastirir."""
    warnings = []
    db_prev, db_next = get_neighbor_meals(db, sure_no, ayet_no)

    site_prev = site_meals.get(ayet_no - 1, {}).get("meal", "")
    site_next = site_meals.get(ayet_no + 1, {}).get("meal", "")

    if db_prev and site_prev:
        overlap = min(len(db_prev), len(site_prev), 20)
        if overlap > 5 and db_prev[:overlap] != site_prev[:overlap]:
            warnings.append(
                f"  ? Onceki ayet farkli: DB=[{db_prev[:30]}...] "
                f"Site=[{site_prev[:30]}...]")

    if db_next and site_next:
        overlap = min(len(db_next), len(site_next), 20)
        if overlap > 5 and db_next[:overlap] != site_next[:overlap]:
            warnings.append(
                f"  ? Sonraki ayet farkli: DB=[{db_next[:30]}...] "
                f"Site=[{site_next[:30]}...]")

    return warnings


# ---------------------------------------------------------------------------
# Ana islem
# ---------------------------------------------------------------------------
def main():
    dry_run = "--dry-run" in sys.argv

    # Hangi alanlar guncellenecek?
    field_arg = "all"
    for i, arg in enumerate(sys.argv):
        if arg == "--field" and i + 1 < len(sys.argv):
            field_arg = sys.argv[i + 1]

    if field_arg == "all":
        target_fields = ["ayet", "meal", "dipnot"]
    else:
        target_fields = [f.strip() for f in field_arg.split(",")]

    if dry_run:
        print("=== DRY RUN MODU ===\n")

    print("--- Kapsamli Veri Doldurma Islemi ---")
    print(f"DB   : {DB_PATH}")
    print(f"Alanlar: {target_fields}\n")

    db = get_db()

    # Eksik alanlara sahip ayetleri bul
    grouped = get_verses_needing_update(db, target_fields)
    total = sum(len(v) for v in grouped.values())
    print(f"Guncellenmesi gereken: {total} ayet, {len(grouped)} sure\n")

    if total == 0:
        print("Tum alanlar dolu, islem gerekmez.")
        db.close()
        return

    stats = {"ayet": 0, "meal": 0, "dipnot": 0, "dipnot_parsed": 0,
             "skipped": 0, "failed": 0, "warnings": 0}
    updates = []

    for sure_no in sorted(grouped.keys()):
        verse_list = grouped[sure_no]
        slug = SURAH_SLUGS.get(sure_no, "?")
        print(f"Sure {sure_no} ({slug}) - {len(verse_list)} ayet")

        html = fetch_surah_page(sure_no)
        if not html:
            stats["failed"] += len(verse_list)
            continue

        site_data = parse_surah_page(html, sure_no)
        print(f"  Siteden {len(site_data)} ayet parse edildi")

        for verse in verse_list:
            vid = verse["id"]
            ayet_no = verse["ayet_no"]
            site = site_data.get(ayet_no)

            if not site:
                print(f"  X {vid}: Sitede bulunamadi")
                stats["failed"] += 1
                continue

            update = {"id": vid}
            updated_any = False

            # --- Arapca metin ---
            if "ayet" in target_fields and not verse["ayet"].strip():
                if site["ayet"] and len(site["ayet"]) >= 2:
                    update["ayet"] = site["ayet"]
                    stats["ayet"] += 1
                    updated_any = True
                    print(f"  + {vid} ayet: [{site['ayet'][:50]}...]")
                else:
                    print(f"  ? {vid}: Sitede Arapca metin bulunamadi")

            # --- Meal ---
            if "meal" in target_fields and not verse["meal"].strip():
                if site["meal"] and len(site["meal"]) >= 5:
                    update["meal"] = site["meal"]
                    stats["meal"] += 1
                    updated_any = True
                    print(f"  + {vid} meal: [{site['meal'][:50]}...]")

                    # Cross-check
                    warnings = cross_check_neighbors(db, sure_no, ayet_no, site_data)
                    for w in warnings:
                        print(w)
                        stats["warnings"] += 1
                else:
                    print(f"  ? {vid}: Sitede meal bulunamadi/cok kisa")

            # --- Dipnot (metin + parsed + mapping) ---
            if "dipnot" in target_fields and not verse["dipnot"].strip():
                if site["dipnot"]:
                    update["dipnot"] = site["dipnot"]
                    stats["dipnot"] += 1
                    updated_any = True
                    print(f"  + {vid} dipnot: [{site['dipnot'][:50]}...]")

                    # dipnot_parsed & mapping_data olustur
                    if site["dipnot_parsed"]:
                        update["dipnot_parsed"] = json.dumps(
                            site["dipnot_parsed"], ensure_ascii=False)
                        stats["dipnot_parsed"] += 1

                    if site["mapping_data"]:
                        # Mevcut mapping_data varsa connections'i birlestir
                        existing_md = {}
                        if verse["mapping_data"]:
                            try:
                                existing_md = json.loads(verse["mapping_data"])
                            except Exception:
                                pass
                        new_md = site["mapping_data"]
                        if existing_md.get("connections"):
                            existing_targets = {c["target_coordinate"]
                                                for c in existing_md["connections"]}
                            for conn in new_md.get("connections", []):
                                if conn["target_coordinate"] not in existing_targets:
                                    existing_md["connections"].append(conn)
                            update["mapping_data"] = json.dumps(
                                existing_md, ensure_ascii=False)
                        else:
                            update["mapping_data"] = json.dumps(
                                new_md, ensure_ascii=False)

            # dipnot dolu ama dipnot_parsed bos olan durum
            if not verse["dipnot_parsed"].strip() and verse["dipnot"].strip():
                segments, connections = parse_rich_text(verse["dipnot"])
                if segments:
                    update["dipnot_parsed"] = json.dumps(segments, ensure_ascii=False)
                    stats["dipnot_parsed"] += 1
                    updated_any = True
                    print(f"  + {vid} dipnot_parsed: mevcut dipnottan parse edildi")
                    # mapping_data guncelle
                    if connections:
                        existing_md = {}
                        if verse["mapping_data"]:
                            try:
                                existing_md = json.loads(verse["mapping_data"])
                            except Exception:
                                pass
                        if not existing_md.get("coordinate"):
                            existing_md["coordinate"] = vid
                        existing_targets = {c["target_coordinate"]
                                            for c in existing_md.get("connections", [])}
                        if "connections" not in existing_md:
                            existing_md["connections"] = []
                        for conn in connections:
                            if conn["target_coordinate"] not in existing_targets:
                                existing_md["connections"].append(conn)
                                existing_targets.add(conn["target_coordinate"])
                        update["mapping_data"] = json.dumps(
                            existing_md, ensure_ascii=False)

            if updated_any or len(update) > 1:
                updates.append(update)
            else:
                stats["skipped"] += 1

        time.sleep(1)

    # Sonuclari yaz
    print(f"\n{'='*50}")
    print(f"Arapca dolduruldu  : {stats['ayet']}")
    print(f"Meal dolduruldu    : {stats['meal']}")
    print(f"Dipnot dolduruldu  : {stats['dipnot']}")
    print(f"Dipnot parsed      : {stats['dipnot_parsed']}")
    print(f"Basarisiz          : {stats['failed']}")
    print(f"Atlanan            : {stats['skipped']}")
    print(f"Komsu uyarilari    : {stats['warnings']}")
    print(f"Toplam guncelleme  : {len(updates)}")

    if not dry_run and updates:
        print(f"\nDB'ye {len(updates)} kayit yaziliyor...")
        cursor = db.cursor()
        updated_rows = 0
        for u in updates:
            set_parts = []
            params = []
            for col in ["ayet", "meal", "dipnot", "dipnot_parsed", "mapping_data"]:
                if col in u:
                    set_parts.append(f"{col} = ?")
                    params.append(u[col])
            if not set_parts:
                continue
            params.append(u["id"])
            sql = f"UPDATE verses SET {', '.join(set_parts)} WHERE id = ?"
            cursor.execute(sql, params)
            updated_rows += cursor.rowcount

        db.commit()
        print(f"DB guncellendi. {updated_rows} satir etkilendi.")

        # Dogrulama
        for col in target_fields:
            remaining = db.execute(
                f"SELECT COUNT(*) FROM verses WHERE {col} IS NULL OR TRIM({col}) = ''"
            ).fetchone()[0]
            print(f"Kalan bos {col:15s}: {remaining}")

        # dipnot_parsed dogrulama
        dp_empty = db.execute(
            "SELECT COUNT(*) FROM verses WHERE dipnot_parsed IS NULL OR TRIM(dipnot_parsed) = ''"
        ).fetchone()[0]
        print(f"Kalan bos dipnot_parsed: {dp_empty}")

    elif dry_run:
        print("\n[DRY RUN] DB'ye yazilmadi.")

    db.close()
    print("\n--- Islem tamamlandi ---")


if __name__ == "__main__":
    main()
