# -*- coding: utf-8 -*-
"""Locale JSON dosyalarini SQLite ui_translations + locale_meta tablolarina aktarir.

Kullanim:
    python migrate_locales_to_db.py

Kaynak:  Frontend/locales/{LANG-region}.json  (meta + ceviri key-value)
Hedef:   quran.db -> ui_translations, locale_meta
"""

import json
import os
import sys
import glob

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(SCRIPT_DIR, '..')
LOCALES_DIR = os.path.join(BASE_DIR, 'Frontend', 'locales')

# Schema + DB
sys.path.insert(0, SCRIPT_DIR)
from db_schema import init_db, DB_PATH


def migrate():
    conn = init_db()
    pattern = os.path.join(LOCALES_DIR, '*.json')
    files = [f for f in glob.glob(pattern) if not os.path.basename(f).startswith('roots_')]

    total_keys = 0
    total_langs = 0

    for filepath in sorted(files):
        fname = os.path.basename(filepath)
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        meta = data.get('meta', {})
        lang = meta.get('code', fname.replace('.json', ''))

        # locale_meta tablosuna ekle
        conn.execute("""
            INSERT OR REPLACE INTO locale_meta (lang, name, native_name, flag, direction, besmele_audio)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            lang,
            meta.get('name', ''),
            meta.get('nativeName', ''),
            meta.get('flag', ''),
            meta.get('direction', 'ltr'),
            meta.get('besmeleAudio', '')
        ))

        # ui_translations tablosuna key-value ciftlerini ekle
        count = 0
        for key, value in data.items():
            if key == 'meta':
                continue
            if isinstance(value, str):
                conn.execute("""
                    INSERT OR REPLACE INTO ui_translations (lang, key, value)
                    VALUES (?, ?, ?)
                """, (lang, key, value))
                count += 1

        total_keys += count
        total_langs += 1
        print(f"  {lang}: {count} key aktarildi")

    conn.commit()
    print(f"\nToplam: {total_langs} dil, {total_keys} ceviri kaydi")
    print(f"Veritabani: {DB_PATH}")
    conn.close()


if __name__ == '__main__':
    print("=== Locale JSON -> SQLite Migrasyonu ===\n")
    migrate()
    print("\nTamamlandi.")
