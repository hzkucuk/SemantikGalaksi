# -*- coding: utf-8 -*-
"""SemantikGalaksi — JSON'dan SQLite'a Migrasyon Scripti

Kaynak dosyalar:
    Frontend/quran_data.json   — 6236 ayet node (id, text, roots[], ...)
    Frontend/quran_roots.json  — 1651 kok (meaning, derived[], ayahs[], ...)
    Frontend/locales/roots_*.json — Cok dilli kok cevirileri (EN/ES/IT/RU)

Hedef:
    DataEngine/quran.db (SQLite)

Kullanim:
    python json_to_sqlite.py [--db quran.db]
"""

import json
import os
import sys
import time

# Schema modulu
from db_schema import init_db, get_integrity_report, DB_PATH


def _base_dir():
    """Proje kok dizini."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def migrate(db_path=None):
    target = db_path or DB_PATH
    base = _base_dir()

    print("=" * 60)
    print("  SemantikGalaksi — JSON -> SQLite Migrasyon")
    print("=" * 60)
    print(f"  Hedef: {target}")
    print()

    # --- Kaynaklari yukle ---
    print("[1/6] Kaynak dosyalar yukleniyor...")
    data_path = os.path.join(base, 'Frontend', 'quran_data.json')
    roots_path = os.path.join(base, 'Frontend', 'quran_roots.json')

    quran_data = load_json(data_path)
    roots_dict = load_json(roots_path)
    nodes = quran_data['nodes']

    print(f"      quran_data.json: {len(nodes)} node")
    print(f"      quran_roots.json: {len(roots_dict)} kok")

    # Locale root dosyalari
    locales_dir = os.path.join(base, 'Frontend', 'locales')
    locale_roots = {}
    if os.path.isdir(locales_dir):
        for f in sorted(os.listdir(locales_dir)):
            if f.startswith('roots_') and f.endswith('.json'):
                lang = f.replace('roots_', '').replace('.json', '')
                locale_roots[lang] = load_json(os.path.join(locales_dir, f))
                print(f"      roots_{lang}.json: {len(locale_roots[lang])} kok")

    # --- Veritabanini olustur ---
    print("\n[2/6] SQLite semasi olusturuluyor...")
    conn = init_db(target)
    cursor = conn.cursor()

    # Mevcut verileri temizle (re-run guvenli)
    for table in ['change_log', 'derived_translations', 'root_translations',
                  'derived_words', 'verse_roots', 'roots', 'verses']:
        cursor.execute(f"DELETE FROM {table}")
    conn.commit()

    # Triggerlari gecici kapat (bulk insert icin performans)
    cursor.execute("DROP TRIGGER IF EXISTS trg_roots_insert")
    cursor.execute("DROP TRIGGER IF EXISTS trg_verse_roots_insert")
    cursor.execute("DROP TRIGGER IF EXISTS trg_verse_roots_delete")
    conn.commit()

    # --- Kokleri ekle ---
    print("[3/6] Kokler ekleniyor...")
    root_count = 0
    derived_count = 0
    for root_key, root_val in roots_dict.items():
        if root_key == '_meta':
            continue
        meaning_tr = root_val.get('meaning', '')
        meaning_ar = root_val.get('meaning_ar', '')
        pronunciation = root_val.get('pronunciation', '')

        cursor.execute(
            "INSERT INTO roots (root, meaning_tr, meaning_ar, pronunciation) VALUES (?, ?, ?, ?)",
            (root_key, meaning_tr, meaning_ar, pronunciation)
        )
        root_count += 1

        # Turetilmis kelimeler
        for d in root_val.get('derived', []):
            cursor.execute(
                "INSERT INTO derived_words (root, word, meaning_tr) VALUES (?, ?, ?)",
                (root_key, d.get('word', ''), d.get('meaning', ''))
            )
            derived_count += 1

    conn.commit()
    print(f"      {root_count} kok, {derived_count} turetilmis kelime eklendi")

    # --- Ayetleri ekle ---
    print("[4/6] Ayetler ekleniyor...")
    verse_count = 0
    vr_count = 0
    skipped_roots = set()
    seen_ids = set()

    for node in nodes:
        vid = node['id']
        # Duplike ID kontrolu (Uthmani/Diyanet ciftleri)
        if vid in seen_ids:
            continue
        seen_ids.add(vid)

        parts = vid.split(':')
        sure_no = int(parts[0])
        ayet_no = int(parts[1])

        # Kompleks alanlari JSON string olarak sakla
        dipnot_parsed = json.dumps(node.get('dipnot_parsed'), ensure_ascii=False) if node.get('dipnot_parsed') else None
        mapping_data = json.dumps(node.get('mapping_data'), ensure_ascii=False) if node.get('mapping_data') else None
        tefsir_popup = json.dumps(node.get('tefsir_popup'), ensure_ascii=False) if node.get('tefsir_popup') else None

        cursor.execute(
            """INSERT INTO verses (id, sure_no, ayet_no, ayet, meal, dipnot,
               dipnot_parsed, mapping_data, tefsir_popup, audio, surah)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (vid, sure_no, ayet_no,
             node.get('text', ''),
             node.get('translation', ''),
             node.get('dipnot'),
             dipnot_parsed,
             mapping_data,
             tefsir_popup,
             node.get('audio'),
             node.get('surah', ''))
        )
        verse_count += 1

        # Ayet-kok iliskileri
        roots = node.get('roots') or []
        for idx, root in enumerate(roots):
            if not root:
                continue
            # Kok sozlukte var mi kontrol et
            exists = cursor.execute(
                "SELECT 1 FROM roots WHERE root=?", (root,)
            ).fetchone()
            if exists:
                cursor.execute(
                    "INSERT OR IGNORE INTO verse_roots (verse_id, root, position) VALUES (?, ?, ?)",
                    (vid, root, idx)
                )
                vr_count += 1
            else:
                skipped_roots.add(root)

    conn.commit()
    print(f"      {verse_count} ayet, {vr_count} ayet-kok iliskisi eklendi")
    if skipped_roots:
        print(f"      UYARI: {len(skipped_roots)} kok sozlukte bulunamadi: {list(skipped_roots)[:10]}")

    # --- Cok dilli ceviriler ---
    print("[5/6] Cok dilli ceviriler ekleniyor...")
    trans_count = 0
    derived_trans_count = 0
    for lang, lang_roots in locale_roots.items():
        for root_key, root_val in lang_roots.items():
            if root_key == '_meta':
                continue
            # Kok sozlukte var mi?
            exists = cursor.execute(
                "SELECT 1 FROM roots WHERE root=?", (root_key,)
            ).fetchone()
            if not exists:
                continue
            meaning = root_val.get('meaning', '')
            cursor.execute(
                "INSERT OR REPLACE INTO root_translations (root, lang, meaning) VALUES (?, ?, ?)",
                (root_key, lang, meaning)
            )
            trans_count += 1

            # Turetilmis kelime cevirileri
            for d in root_val.get('derived', []):
                word = d.get('word', '')
                d_meaning = d.get('meaning', '')
                if word and d_meaning:
                    # derived_words tablosundan esleseni bul
                    dw = cursor.execute(
                        "SELECT id FROM derived_words WHERE root=? AND word=?",
                        (root_key, word)
                    ).fetchone()
                    if dw:
                        cursor.execute(
                            "INSERT OR REPLACE INTO derived_translations (derived_id, lang, meaning) VALUES (?, ?, ?)",
                            (dw[0], lang, d_meaning)
                        )
                        derived_trans_count += 1

    conn.commit()
    print(f"      {trans_count} kok cevirisi, {derived_trans_count} turetilmis kelime cevirisi eklendi")

    # --- Triggerlari yeniden olustur ---
    cursor.executescript("""
    CREATE TRIGGER IF NOT EXISTS trg_roots_insert AFTER INSERT ON roots
    BEGIN
        INSERT INTO change_log(table_name, record_id, action, field_name, new_value)
        VALUES ('roots', NEW.root, 'INSERT', 'meaning_tr', NEW.meaning_tr);
    END;

    CREATE TRIGGER IF NOT EXISTS trg_verse_roots_insert AFTER INSERT ON verse_roots
    BEGIN
        INSERT INTO change_log(table_name, record_id, action, field_name, new_value)
        VALUES ('verse_roots', NEW.verse_id, 'INSERT', 'root', NEW.root);
    END;

    CREATE TRIGGER IF NOT EXISTS trg_verse_roots_delete AFTER DELETE ON verse_roots
    BEGIN
        INSERT INTO change_log(table_name, record_id, action, field_name, old_value)
        VALUES ('verse_roots', OLD.verse_id, 'DELETE', 'root', OLD.root);
    END;
    """)
    conn.commit()

    # --- Butunluk raporu ---
    print("\n[6/6] Butunluk raporu...")
    report = get_integrity_report(conn)
    print(f"      Ayetler:        {report['verses']}")
    print(f"      Kokler:         {report['roots']}")
    print(f"      Ayet-Kok:       {report['verse_roots']}")
    print(f"      Turetilmis:     {report['derived_words']}")
    print(f"      Ceviriler:      {report['root_translations']}")
    print(f"      FK ihlalleri:   {len(report['fk_violations'])}")
    print(f"      Orphan kokler:  {len(report['orphan_roots'])}")
    print(f"      Bos anlamlar:   {len(report['missing_meanings'])}")

    for lang, info in report.get('missing_translations', {}).items():
        print(f"      Eksik {lang}:      {info['count']} kok")

    if report['healthy']:
        print("\n      --- BUTUNLUK KONTROLU: BASARILI ---")
    else:
        print("\n      --- BUTUNLUK KONTROLU: SORUNLAR VAR ---")
        if report['fk_violations']:
            print(f"      FK ihlalleri: {report['fk_violations'][:5]}")
        if report['orphan_roots']:
            print(f"      Orphan kokler: {report['orphan_roots'][:10]}")
        if report['missing_meanings']:
            print(f"      Bos anlamlar: {report['missing_meanings'][:10]}")

    conn.close()
    print(f"\n  Veritabani olusturuldu: {target}")
    print(f"  Boyut: {os.path.getsize(target) / 1024 / 1024:.2f} MB")
    print("=" * 60)

    return report


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='JSON -> SQLite migrasyon')
    parser.add_argument('--db', default=None, help='Hedef veritabani yolu')
    args = parser.parse_args()
    migrate(args.db)
