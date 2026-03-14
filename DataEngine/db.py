# -*- coding: utf-8 -*-
"""SemantikGalaksi — Veritabani Erisim Katmani (db.py)

CRUD islemleri, JSON export ve butunluk kontrolu.
desktop_app.py bu modulu kullanarak SQLite uzerinden veri yonetir.
Her yazma isleminden sonra ilgili JSON dosyasi otomatik guncellenir.
"""

import json
import os
import sys
import sqlite3
import time
import threading

from db_schema import get_connection, init_db, get_integrity_report, DB_PATH

# Thread-safe erisim icin kilit
_db_lock = threading.Lock()

# --- JSON Export Yollari ---
def _base_dir():
    if getattr(sys, 'frozen', False):
        if hasattr(sys, '_MEIPASS'):
            return sys._MEIPASS
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FRONTEND_DIR = os.path.join(_base_dir(), 'Frontend')
QURAN_DATA_PATH = os.path.join(FRONTEND_DIR, 'quran_data.json')
QURAN_ROOTS_PATH = os.path.join(FRONTEND_DIR, 'quran_roots.json')
LOCALES_DIR = os.path.join(FRONTEND_DIR, 'locales')


# ===================================================================
#  BAGLANTI YONETIMI
# ===================================================================

_conn = None

def get_db():
    """Thread-safe tekil baglanti (check_same_thread=False ile)."""
    global _conn
    with _db_lock:
        if _conn is None:
            _conn = init_db()
        return _conn


def close_db():
    global _conn
    with _db_lock:
        if _conn:
            _conn.close()
            _conn = None


# ===================================================================
#  JSON EXPORT (Frontend icin)
# ===================================================================

def export_quran_data(conn=None):
    """quran_data.json dosyasini SQLite'tan yeniden olusturur."""
    db = conn or get_db()
    nodes = []
    verses = db.execute(
        "SELECT * FROM verses ORDER BY sure_no, ayet_no"
    ).fetchall()

    for v in verses:
        node = {
            'id': v['id'],
            'surah': v['surah'] or '',
            'text': v['ayet'],
            'translation': v['meal'] or '',
        }

        # Kokleri ekle
        roots = db.execute(
            "SELECT root FROM verse_roots WHERE verse_id=? ORDER BY position",
            (v['id'],)
        ).fetchall()
        node['roots'] = [r['root'] for r in roots] if roots else None

        # Dipnot
        if v['dipnot']:
            node['dipnot'] = v['dipnot']
        if v['dipnot_parsed']:
            try:
                node['dipnot_parsed'] = json.loads(v['dipnot_parsed'])
            except Exception:
                pass
        # Mapping data
        if v['mapping_data']:
            try:
                node['mapping_data'] = json.loads(v['mapping_data'])
            except Exception:
                pass
        # Tefsir popup
        if v['tefsir_popup']:
            try:
                node['tefsir_popup'] = json.loads(v['tefsir_popup'])
            except Exception:
                pass
        # Audio
        if v['audio']:
            node['audio'] = v['audio']

        nodes.append(node)

    data = {'nodes': nodes}
    with open(QURAN_DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return len(nodes)


def export_quran_roots(conn=None):
    """quran_roots.json dosyasini SQLite'tan yeniden olusturur."""
    db = conn or get_db()
    result = {}

    roots = db.execute("SELECT * FROM roots ORDER BY root").fetchall()
    for r in roots:
        entry = {
            'meaning': r['meaning_tr'],
            'meaning_ar': r['meaning_ar'] or '',
            'pronunciation': r['pronunciation'] or '',
        }

        # Turetilmis kelimeler
        derived = db.execute(
            "SELECT word, meaning_tr FROM derived_words WHERE root=?",
            (r['root'],)
        ).fetchall()
        if derived:
            entry['derived'] = [
                {'word': d['word'], 'meaning': d['meaning_tr']}
                for d in derived
            ]
        else:
            entry['derived'] = []

        # Ayet listesi ve sayisi
        ayahs = db.execute(
            "SELECT verse_id FROM verse_roots WHERE root=? ORDER BY verse_id",
            (r['root'],)
        ).fetchall()
        entry['ayahs'] = [a['verse_id'] for a in ayahs]
        entry['count'] = len(ayahs)

        result[r['root']] = entry

    with open(QURAN_ROOTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return len(result)


def export_locale_roots(lang, conn=None):
    """roots_{lang}.json dosyasini SQLite'tan yeniden olusturur."""
    db = conn or get_db()
    result = {}

    translations = db.execute(
        "SELECT rt.root, rt.meaning FROM root_translations rt WHERE rt.lang=?",
        (lang,)
    ).fetchall()

    for t in translations:
        entry = {'meaning': t['meaning']}

        # Turetilmis kelime cevirileri
        derived = db.execute("""
            SELECT dw.word, dt.meaning
            FROM derived_words dw
            JOIN derived_translations dt ON dw.id = dt.derived_id
            WHERE dw.root = ? AND dt.lang = ?
        """, (t['root'], lang)).fetchall()

        if derived:
            entry['derived'] = [
                {'word': d['word'], 'meaning': d['meaning']}
                for d in derived
            ]

        result[t['root']] = entry

    path = os.path.join(LOCALES_DIR, f'roots_{lang}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return len(result)


def export_all(conn=None):
    """Tum JSON dosyalarini yeniden olusturur."""
    db = conn or get_db()
    results = {
        'quran_data': export_quran_data(db),
        'quran_roots': export_quran_roots(db),
        'locale_roots': {}
    }

    # Mevcut dilleri bul
    langs = db.execute(
        "SELECT DISTINCT lang FROM root_translations"
    ).fetchall()
    for row in langs:
        lang = row['lang']
        results['locale_roots'][lang] = export_locale_roots(lang, db)

    return results


# ===================================================================
#  KOK CRUD
# ===================================================================

def get_root(root_key, conn=None):
    """Tek bir kok bilgisi dondurur."""
    db = conn or get_db()
    row = db.execute("SELECT * FROM roots WHERE root=?", (root_key,)).fetchone()
    if not row:
        return None
    result = dict(row)
    result['derived'] = [
        dict(d) for d in
        db.execute("SELECT * FROM derived_words WHERE root=?", (root_key,)).fetchall()
    ]
    result['verse_count'] = db.execute(
        "SELECT COUNT(*) FROM verse_roots WHERE root=?", (root_key,)
    ).fetchone()[0]
    return result


def update_root(root_key, meaning_tr=None, meaning_ar=None, pronunciation=None,
                user='system', conn=None):
    """Kok bilgilerini gunceller."""
    db = conn or get_db()
    fields = []
    values = []
    if meaning_tr is not None:
        fields.append("meaning_tr=?")
        values.append(meaning_tr)
    if meaning_ar is not None:
        fields.append("meaning_ar=?")
        values.append(meaning_ar)
    if pronunciation is not None:
        fields.append("pronunciation=?")
        values.append(pronunciation)

    if not fields:
        return False

    values.append(root_key)
    # changed_by'i trigger'a eklemek icin user context
    db.execute(
        "INSERT INTO change_log(table_name, record_id, action, field_name, old_value, new_value, changed_by) "
        "SELECT 'roots', root, 'UPDATE', 'manual', meaning_tr, ?, ? "
        "FROM roots WHERE root=?",
        (meaning_tr or '', user, root_key)
    )
    db.execute(f"UPDATE roots SET {','.join(fields)} WHERE root=?", values)
    db.commit()
    return True


def save_roots_bulk(roots_data, user='system', conn=None):
    """Tum kok sozlugunu toplu kaydeder (editor'den gelen veri).
    Mevcut kokleri gunceller, yenileri ekler.
    Dondurur: (added, updated, removed) sayilari."""
    db = conn or get_db()

    existing = {row[0] for row in db.execute("SELECT root FROM roots").fetchall()}
    incoming = {k for k in roots_data.keys() if k != '_meta'}

    added = 0
    updated = 0

    for root_key, root_val in roots_data.items():
        if root_key == '_meta':
            continue
        meaning_tr = root_val.get('meaning', '')
        meaning_ar = root_val.get('meaning_ar', '')
        pronunciation = root_val.get('pronunciation', '')

        if root_key in existing:
            db.execute(
                "UPDATE roots SET meaning_tr=?, meaning_ar=?, pronunciation=? WHERE root=?",
                (meaning_tr, meaning_ar, pronunciation, root_key)
            )
            updated += 1
        else:
            db.execute(
                "INSERT INTO roots (root, meaning_tr, meaning_ar, pronunciation) VALUES (?, ?, ?, ?)",
                (root_key, meaning_tr, meaning_ar, pronunciation)
            )
            added += 1

        # Turetilmis kelimeleri guncelle
        db.execute("DELETE FROM derived_words WHERE root=?", (root_key,))
        for d in root_val.get('derived', []):
            db.execute(
                "INSERT INTO derived_words (root, word, meaning_tr) VALUES (?, ?, ?)",
                (root_key, d.get('word', ''), d.get('meaning', ''))
            )

    # Silinmis kokler (incoming'de olmayan)
    removed_roots = existing - incoming
    removed = 0
    for r in removed_roots:
        db.execute("DELETE FROM verse_roots WHERE root=?", (r,))
        db.execute("DELETE FROM roots WHERE root=?", (r,))
        removed += 1

    # Degisiklik loglama
    db.execute(
        "INSERT INTO change_log(table_name, record_id, action, field_name, new_value, changed_by) "
        "VALUES ('roots', 'bulk', 'UPDATE', 'count', ?, ?)",
        (f"added={added},updated={updated},removed={removed}", user)
    )
    db.commit()

    # JSON export
    export_quran_roots(db)

    return added, updated, removed


# ===================================================================
#  AYET-KOK CRUD
# ===================================================================

def get_verse_roots(verse_id, conn=None):
    """Bir ayetin koklerini dondurur."""
    db = conn or get_db()
    rows = db.execute(
        "SELECT root, position FROM verse_roots WHERE verse_id=? ORDER BY position",
        (verse_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def set_verse_roots(verse_id, roots, user='system', conn=None):
    """Bir ayetin koklerini ayarlar."""
    db = conn or get_db()
    db.execute("DELETE FROM verse_roots WHERE verse_id=?", (verse_id,))
    for idx, root in enumerate(roots):
        if not root:
            continue
        # Kok sozlukte var mi?
        exists = db.execute("SELECT 1 FROM roots WHERE root=?", (root,)).fetchone()
        if not exists:
            raise ValueError(f"Kok '{root}' sozlukte bulunamadi. Once sozluge ekleyin.")
        db.execute(
            "INSERT INTO verse_roots (verse_id, root, position) VALUES (?, ?, ?)",
            (verse_id, root, idx)
        )
    db.commit()
    return True


# ===================================================================
#  CEVIRI CRUD
# ===================================================================

def save_root_translations(lang, translations_data, user='system', conn=None):
    """Bir dildeki tum kok cevirilerini kaydeder.
    Dondurur: (added, updated) sayilari."""
    db = conn or get_db()

    existing = {row[0] for row in
                db.execute("SELECT root FROM root_translations WHERE lang=?", (lang,)).fetchall()}
    added = 0
    updated = 0

    for root_key, root_val in translations_data.items():
        if root_key == '_meta':
            continue
        meaning = root_val.get('meaning', '')
        # Kok ana sozlukte var mi?
        exists = db.execute("SELECT 1 FROM roots WHERE root=?", (root_key,)).fetchone()
        if not exists:
            continue

        if root_key in existing:
            db.execute(
                "UPDATE root_translations SET meaning=? WHERE root=? AND lang=?",
                (meaning, root_key, lang)
            )
            updated += 1
        else:
            db.execute(
                "INSERT INTO root_translations (root, lang, meaning) VALUES (?, ?, ?)",
                (root_key, lang, meaning)
            )
            added += 1

        # Turetilmis kelime cevirileri
        for d in root_val.get('derived', []):
            word = d.get('word', '')
            d_meaning = d.get('meaning', '')
            if word and d_meaning:
                dw = db.execute(
                    "SELECT id FROM derived_words WHERE root=? AND word=?",
                    (root_key, word)
                ).fetchone()
                if dw:
                    db.execute(
                        "INSERT OR REPLACE INTO derived_translations (derived_id, lang, meaning) VALUES (?, ?, ?)",
                        (dw[0], lang, d_meaning)
                    )

    db.execute(
        "INSERT INTO change_log(table_name, record_id, action, field_name, new_value, changed_by) "
        "VALUES ('root_translations', ?, 'UPDATE', 'count', ?, ?)",
        (lang, f"added={added},updated={updated}", user)
    )
    db.commit()

    # JSON export
    export_locale_roots(lang, db)

    return added, updated


# ===================================================================
#  BUTUNLUK KONTROLU
# ===================================================================

def check_integrity(conn=None):
    """Tam butunluk raporu dondurur."""
    db = conn or get_db()
    return get_integrity_report(db)


# ===================================================================
#  DEGISIKLIK GECMISI
# ===================================================================

def get_change_log(table_name=None, limit=100, conn=None):
    """Degisiklik gecmisini dondurur."""
    db = conn or get_db()
    query = "SELECT * FROM change_log"
    params = []
    if table_name:
        query += " WHERE table_name=?"
        params.append(table_name)
    query += " ORDER BY changed_at DESC LIMIT ?"
    params.append(limit)
    rows = db.execute(query, params).fetchall()
    return [dict(r) for r in rows]


# ===================================================================
#  ISTATISTIKLER
# ===================================================================

def get_stats(conn=None):
    """Genel istatistikler."""
    db = conn or get_db()
    return {
        'verses': db.execute("SELECT COUNT(*) FROM verses").fetchone()[0],
        'roots': db.execute("SELECT COUNT(*) FROM roots").fetchone()[0],
        'verse_roots': db.execute("SELECT COUNT(*) FROM verse_roots").fetchone()[0],
        'derived_words': db.execute("SELECT COUNT(*) FROM derived_words").fetchone()[0],
        'translations': db.execute("SELECT COUNT(*) FROM root_translations").fetchone()[0],
        'languages': [r[0] for r in db.execute("SELECT DISTINCT lang FROM root_translations").fetchall()],
        'change_log_entries': db.execute("SELECT COUNT(*) FROM change_log").fetchone()[0],
    }
