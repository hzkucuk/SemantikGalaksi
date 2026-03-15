# -*- coding: utf-8 -*-
"""SemantikGalaksi — SQLite Veritabani Semasi ve Yardimci Fonksiyonlar

Tablolar:
    verses          — 6236 ayet (id, sure_no, ayet_no, ayet, meal, dipnot, audio, ...)
    roots           — Kok sozlugu (root PK, meaning_tr, meaning_ar, pronunciation)
    verse_roots     — Ayet-kok M:N iliskisi (FK: verses + roots)
    derived_words   — Turetilmis kelimeler (FK: roots)
    root_translations — Cok dilli kok cevirileri (FK: roots)
    change_log      — Degisiklik gecmisi (trigger + manuel)
    ui_translations — UI ceviri key-value ciftleri (lang, key, value)
    locale_meta     — Dil meta bilgileri (ad, bayrak, yon, besmele ses)

Referansiyel Butunluk:
    - verse_roots.root REFERENCES roots(root)
    - verse_roots.verse_id REFERENCES verses(id)
    - derived_words.root REFERENCES roots(root)
    - root_translations.root REFERENCES roots(root)
"""

import sqlite3
import os
import sys

# --- Veritabani Konum ---
def _get_db_dir():
    if getattr(sys, 'frozen', False):
        appdata = os.environ.get('APPDATA', os.path.expanduser('~'))
        return os.path.join(appdata, 'SemantikGalaksi')
    return os.path.dirname(os.path.abspath(__file__))

DB_DIR = _get_db_dir()
DB_PATH = os.path.join(DB_DIR, 'quran.db')

# --- Sema Tanimlari ---
SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Ayetler
CREATE TABLE IF NOT EXISTS verses (
    id TEXT PRIMARY KEY,
    sure_no INTEGER NOT NULL,
    ayet_no INTEGER NOT NULL,
    ayet TEXT NOT NULL,
    meal TEXT,
    dipnot TEXT,
    dipnot_parsed TEXT,
    mapping_data TEXT,
    tefsir_popup TEXT,
    local_overrides TEXT DEFAULT NULL,
    audio TEXT,
    surah TEXT,
    UNIQUE(sure_no, ayet_no)
);

-- Kok sozlugu
CREATE TABLE IF NOT EXISTS roots (
    root TEXT PRIMARY KEY,
    meaning_tr TEXT NOT NULL DEFAULT '',
    meaning_ar TEXT DEFAULT '',
    pronunciation TEXT DEFAULT '',
    CHECK(length(root) >= 2)
);

-- Ayet-Kok iliskisi (M:N)
CREATE TABLE IF NOT EXISTS verse_roots (
    verse_id TEXT NOT NULL,
    root TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (verse_id, root),
    FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE,
    FOREIGN KEY (root) REFERENCES roots(root) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Turetilmis kelimeler
CREATE TABLE IF NOT EXISTS derived_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    root TEXT NOT NULL,
    word TEXT NOT NULL,
    meaning_tr TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (root) REFERENCES roots(root) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Cok dilli kok cevirileri
CREATE TABLE IF NOT EXISTS root_translations (
    root TEXT NOT NULL,
    lang TEXT NOT NULL,
    meaning TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (root, lang),
    FOREIGN KEY (root) REFERENCES roots(root) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Cok dilli turetilmis kelime cevirileri
CREATE TABLE IF NOT EXISTS derived_translations (
    derived_id INTEGER NOT NULL,
    lang TEXT NOT NULL,
    meaning TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (derived_id, lang),
    FOREIGN KEY (derived_id) REFERENCES derived_words(id) ON DELETE CASCADE
);

-- Degisiklik gecmisi
CREATE TABLE IF NOT EXISTS change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT NOT NULL DEFAULT 'system',
    changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- UI cevirileri (locale dosyalari yerine)
CREATE TABLE IF NOT EXISTS ui_translations (
    lang TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (lang, key)
);

-- Locale meta bilgileri
CREATE TABLE IF NOT EXISTS locale_meta (
    lang TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    native_name TEXT NOT NULL,
    flag TEXT NOT NULL DEFAULT '',
    direction TEXT NOT NULL DEFAULT 'ltr',
    besmele_audio TEXT NOT NULL DEFAULT ''
);

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_verse_roots_root ON verse_roots(root);
CREATE INDEX IF NOT EXISTS idx_verse_roots_verse ON verse_roots(verse_id);
CREATE INDEX IF NOT EXISTS idx_derived_root ON derived_words(root);
CREATE INDEX IF NOT EXISTS idx_translations_root ON root_translations(root);
CREATE INDEX IF NOT EXISTS idx_changelog_table ON change_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_changelog_date ON change_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_verses_sure ON verses(sure_no, ayet_no);

-- Triggerlar: Kok degisikliklerini otomatik kaydet
CREATE TRIGGER IF NOT EXISTS trg_roots_insert AFTER INSERT ON roots
BEGIN
    INSERT INTO change_log(table_name, record_id, action, field_name, new_value)
    VALUES ('roots', NEW.root, 'INSERT', 'meaning_tr', NEW.meaning_tr);
END;

CREATE TRIGGER IF NOT EXISTS trg_roots_update AFTER UPDATE ON roots
WHEN OLD.meaning_tr != NEW.meaning_tr OR OLD.meaning_ar != NEW.meaning_ar
BEGIN
    INSERT INTO change_log(table_name, record_id, action, field_name, old_value, new_value)
    VALUES ('roots', NEW.root, 'UPDATE', 'meaning_tr',
            OLD.meaning_tr || '|' || COALESCE(OLD.meaning_ar,''),
            NEW.meaning_tr || '|' || COALESCE(NEW.meaning_ar,''));
END;

CREATE TRIGGER IF NOT EXISTS trg_roots_delete AFTER DELETE ON roots
BEGIN
    INSERT INTO change_log(table_name, record_id, action, field_name, old_value)
    VALUES ('roots', OLD.root, 'DELETE', 'meaning_tr', OLD.meaning_tr);
END;

-- Triggerlar: Ayet-kok iliskisi degisiklikleri
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
"""


def get_connection(db_path=None):
    """Veritabani baglantisi olusturur (thread-safe: check_same_thread=False)."""
    path = db_path or DB_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path=None):
    """Semayi olusturur (tablolar, indeksler, triggerlar)."""
    conn = get_connection(db_path)
    conn.executescript(SCHEMA_SQL)
    # Migration: local_overrides sutunu yoksa ekle
    cols = [r[1] for r in conn.execute("PRAGMA table_info(verses)").fetchall()]
    if 'local_overrides' not in cols:
        conn.execute("ALTER TABLE verses ADD COLUMN local_overrides TEXT DEFAULT NULL")
    conn.commit()
    return conn


def get_integrity_report(conn):
    """Referansiyel butunluk raporu uretir."""
    report = {
        'verses': conn.execute("SELECT COUNT(*) FROM verses").fetchone()[0],
        'roots': conn.execute("SELECT COUNT(*) FROM roots").fetchone()[0],
        'verse_roots': conn.execute("SELECT COUNT(*) FROM verse_roots").fetchone()[0],
        'derived_words': conn.execute("SELECT COUNT(*) FROM derived_words").fetchone()[0],
        'root_translations': conn.execute("SELECT COUNT(*) FROM root_translations").fetchone()[0],
        'change_log': conn.execute("SELECT COUNT(*) FROM change_log").fetchone()[0],
        'ui_translations': conn.execute("SELECT COUNT(*) FROM ui_translations").fetchone()[0],
        'locale_meta': conn.execute("SELECT COUNT(*) FROM locale_meta").fetchone()[0],
        'fk_violations': [],
        'orphan_roots': [],
        'missing_meanings': [],
        'missing_translations': {},
    }

    # FK ihlalleri (PRAGMA ile)
    violations = conn.execute("PRAGMA foreign_key_check").fetchall()
    report['fk_violations'] = [dict(v) for v in violations]

    # Sozlukte olup hicbir ayette kullanilmayan kokler
    orphans = conn.execute("""
        SELECT r.root FROM roots r
        LEFT JOIN verse_roots vr ON r.root = vr.root
        WHERE vr.root IS NULL
    """).fetchall()
    report['orphan_roots'] = [row[0] for row in orphans]

    # Anlami bos kokler
    missing = conn.execute(
        "SELECT root FROM roots WHERE meaning_tr IS NULL OR TRIM(meaning_tr) = ''"
    ).fetchall()
    report['missing_meanings'] = [row[0] for row in missing]

    # Dil bazli eksik ceviriler
    langs = conn.execute(
        "SELECT DISTINCT lang FROM root_translations"
    ).fetchall()
    total_roots = report['roots']
    for row in langs:
        lang = row[0]
        count = conn.execute(
            "SELECT COUNT(*) FROM root_translations WHERE lang=?", (lang,)
        ).fetchone()[0]
        if count < total_roots:
            missing_in_lang = conn.execute("""
                SELECT r.root FROM roots r
                LEFT JOIN root_translations rt ON r.root = rt.root AND rt.lang = ?
                WHERE rt.root IS NULL
            """, (lang,)).fetchall()
            report['missing_translations'][lang] = {
                'count': total_roots - count,
                'roots': [row[0] for row in missing_in_lang[:20]]
            }

    report['healthy'] = (
        len(report['fk_violations']) == 0
        and len(report['orphan_roots']) == 0
        and len(report['missing_meanings']) == 0
    )

    return report
