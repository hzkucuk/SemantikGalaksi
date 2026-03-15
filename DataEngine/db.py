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

def get_change_log(table_name=None, limit=100, page=1, search='', conn=None):
    """Degisiklik gecmisini sayfalamali dondurur."""
    db = conn or get_db()
    where_parts = []
    params = []
    if table_name:
        where_parts.append("table_name=?")
        params.append(table_name)
    if search:
        where_parts.append("(record_id LIKE ? OR field_name LIKE ? OR old_value LIKE ? OR new_value LIKE ? OR changed_by LIKE ?)")
        s = f'%{search}%'
        params.extend([s, s, s, s, s])
    where_sql = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
    total = db.execute(f"SELECT COUNT(*) FROM change_log{where_sql}", params).fetchone()[0]
    offset = (page - 1) * limit
    rows = db.execute(
        f"SELECT * FROM change_log{where_sql} ORDER BY changed_at DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    tables = [r[0] for r in db.execute("SELECT DISTINCT table_name FROM change_log ORDER BY table_name").fetchall()]
    return {
        'items': [dict(r) for r in rows],
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit if total > 0 else 1,
        'tables': tables,
    }


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


# ===================================================================
#  VERI DENETIMI (Data Audit)
# ===================================================================

def data_audit(conn=None):
    """Kapsamli veri butunluk ve eksiklik raporu uretir."""
    db = conn or get_db()
    total_verses = db.execute("SELECT COUNT(*) FROM verses").fetchone()[0]
    total_roots = db.execute("SELECT COUNT(*) FROM roots").fetchone()[0]

    # 1. Koku olmayan ayetler
    no_roots = db.execute("""
        SELECT v.id, v.surah, v.ayet FROM verses v
        LEFT JOIN verse_roots vr ON v.id = vr.verse_id
        WHERE vr.verse_id IS NULL
        ORDER BY v.sure_no, v.ayet_no
    """).fetchall()

    # 2. Meali bos ayetler
    empty_meal = db.execute("""
        SELECT id, surah, ayet FROM verses
        WHERE meal IS NULL OR TRIM(meal) = ''
        ORDER BY sure_no, ayet_no
    """).fetchall()

    # 3. Dipnotu bos ayetler
    empty_dipnot = db.execute("""
        SELECT id, surah FROM verses
        WHERE dipnot IS NULL OR TRIM(dipnot) = ''
        ORDER BY sure_no, ayet_no
    """).fetchall()

    # 4. Anlami bos kokler
    empty_meaning = db.execute("""
        SELECT root FROM roots
        WHERE meaning_tr IS NULL OR TRIM(meaning_tr) = ''
    """).fetchall()

    # 5. Telaffuzu bos kokler
    empty_pronunciation = db.execute("""
        SELECT root FROM roots
        WHERE pronunciation IS NULL OR TRIM(pronunciation) = ''
    """).fetchall()

    # 6. Sozlukte olup hicbir ayette kullanilmayan kokler (yetim)
    orphan_roots = db.execute("""
        SELECT r.root FROM roots r
        LEFT JOIN verse_roots vr ON r.root = vr.root
        WHERE vr.root IS NULL
    """).fetchall()

    # 7. Ayette kullanilip sozlukte olmayan kokler (tanımsiz)
    undefined_roots = db.execute("""
        SELECT DISTINCT vr.root FROM verse_roots vr
        LEFT JOIN roots r ON vr.root = r.root
        WHERE r.root IS NULL
    """).fetchall()

    # 8. Dil bazli eksik kok cevirileri
    langs = [r[0] for r in db.execute(
        "SELECT DISTINCT lang FROM root_translations"
    ).fetchall()]
    missing_translations = {}
    for lang in langs:
        count = db.execute(
            "SELECT COUNT(DISTINCT root) FROM root_translations WHERE lang=?", (lang,)
        ).fetchone()[0]
        if count < total_roots:
            missing_translations[lang] = total_roots - count

    # 9. FK ihlalleri
    fk_violations = db.execute("PRAGMA foreign_key_check").fetchall()

    # 10. Sure bazli eksiklik ozeti
    surah_summary = db.execute("""
        SELECT v.surah,
            COUNT(*) as total,
            SUM(CASE WHEN vr_cnt IS NULL OR vr_cnt = 0 THEN 1 ELSE 0 END) as no_roots,
            SUM(CASE WHEN v.meal IS NULL OR TRIM(v.meal) = '' THEN 1 ELSE 0 END) as no_meal,
            SUM(CASE WHEN v.dipnot IS NULL OR TRIM(v.dipnot) = '' THEN 1 ELSE 0 END) as no_dipnot
        FROM verses v
        LEFT JOIN (
            SELECT verse_id, COUNT(*) as vr_cnt FROM verse_roots GROUP BY verse_id
        ) vrc ON v.id = vrc.verse_id
        GROUP BY v.sure_no
        ORDER BY v.sure_no
    """).fetchall()

    # Skor hesapla (yuzdelik)
    filled_meal = total_verses - len(empty_meal)
    filled_roots = total_verses - len(no_roots)
    score = round(((filled_meal + filled_roots) / (total_verses * 2)) * 100, 1) if total_verses > 0 else 0

    return {
        'score': score,
        'total_verses': total_verses,
        'total_roots': total_roots,
        'no_roots': [{'id': r['id'], 'surah': r['surah']} for r in no_roots],
        'empty_meal': [{'id': r['id'], 'surah': r['surah']} for r in empty_meal],
        'empty_dipnot_count': len(empty_dipnot),
        'empty_meaning': [r['root'] for r in empty_meaning],
        'empty_pronunciation': [r['root'] for r in empty_pronunciation],
        'orphan_roots': [r['root'] for r in orphan_roots],
        'undefined_roots': [r['root'] for r in undefined_roots],
        'missing_translations': missing_translations,
        'fk_violations': len(fk_violations),
        'surah_summary': [dict(r) for r in surah_summary],
    }


# ===================================================================
#  TAM VERI YUKLEMESI (Frontend 3D viz icin — JSON yerine)
# ===================================================================

def get_full_data(conn=None):
    """Frontend processData() icin tam veri. quran_data.json yerine."""
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
        roots = db.execute(
            "SELECT root FROM verse_roots WHERE verse_id=? ORDER BY position",
            (v['id'],)
        ).fetchall()
        node['roots'] = [r['root'] for r in roots] if roots else None
        if v['dipnot']:
            node['dipnot'] = v['dipnot']
        if v['dipnot_parsed']:
            try:
                node['dipnot_parsed'] = json.loads(v['dipnot_parsed'])
            except Exception:
                pass
        if v['mapping_data']:
            try:
                node['mapping_data'] = json.loads(v['mapping_data'])
            except Exception:
                pass
        if v['tefsir_popup']:
            try:
                node['tefsir_popup'] = json.loads(v['tefsir_popup'])
            except Exception:
                pass
        if v['audio']:
            node['audio'] = v['audio']
        nodes.append(node)
    return {'nodes': nodes}


def get_full_roots(conn=None):
    """Frontend rootDictionary icin tam veri. quran_roots.json yerine."""
    db = conn or get_db()
    result = {}
    roots = db.execute("SELECT * FROM roots ORDER BY root").fetchall()
    for r in roots:
        entry = {
            'meaning': r['meaning_tr'],
            'meaning_ar': r['meaning_ar'] or '',
            'pronunciation': r['pronunciation'] or '',
        }
        derived = db.execute(
            "SELECT word, meaning_tr FROM derived_words WHERE root=?",
            (r['root'],)
        ).fetchall()
        entry['derived'] = [
            {'word': d['word'], 'meaning': d['meaning_tr']} for d in derived
        ] if derived else []
        ayahs = db.execute(
            "SELECT verse_id FROM verse_roots WHERE root=? ORDER BY verse_id",
            (r['root'],)
        ).fetchall()
        entry['ayahs'] = [a['verse_id'] for a in ayahs]
        entry['count'] = len(ayahs)
        result[r['root']] = entry
    return result


# ===================================================================
#  KOK CEVIRILERI (Frontend i18n icin)
# ===================================================================

def get_root_translations(lang, conn=None):
    """Belirli bir dil icin kok cevirilerini dondurur. roots_{lang}.json yerine."""
    db = conn or get_db()
    result = {}
    translations = db.execute(
        "SELECT rt.root, rt.meaning FROM root_translations rt WHERE rt.lang=?",
        (lang,)
    ).fetchall()
    for t in translations:
        entry = {'meaning': t['meaning']}
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
    return result


# ===================================================================
#  UI LOCALE (Dil dosyalari SQLite'tan)
# ===================================================================

def list_ui_languages(conn=None):
    """Mevcut UI dil listesini meta bilgileriyle dondurur."""
    db = conn or get_db()
    rows = db.execute("SELECT * FROM locale_meta ORDER BY lang").fetchall()
    return [dict(r) for r in rows]


def get_ui_locale(lang, conn=None):
    """Belirli bir dil icin UI cevirilerini + meta dondurur."""
    db = conn or get_db()
    meta_row = db.execute("SELECT * FROM locale_meta WHERE lang=?", (lang,)).fetchone()
    if not meta_row:
        return None
    result = {
        'meta': {
            'code': meta_row['lang'],
            'name': meta_row['name'],
            'nativeName': meta_row['native_name'],
            'flag': meta_row['flag'],
            'direction': meta_row['direction'],
            'besmeleAudio': meta_row['besmele_audio']
        }
    }
    rows = db.execute(
        "SELECT key, value FROM ui_translations WHERE lang=? ORDER BY key",
        (lang,)
    ).fetchall()
    for r in rows:
        result[r['key']] = r['value']
    return result


def save_ui_locale(lang, data, user='system', conn=None):
    """UI cevirilerini kaydeder/gunceller. data = {meta: {...}, key: value, ...}"""
    db = conn or get_db()
    meta = data.get('meta', {})
    if meta:
        db.execute("""
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
    # Mevcut key'leri sil ve yeniden ekle
    db.execute("DELETE FROM ui_translations WHERE lang=?", (lang,))
    count = 0
    for key, value in data.items():
        if key == 'meta' or not isinstance(value, str):
            continue
        db.execute(
            "INSERT INTO ui_translations (lang, key, value) VALUES (?, ?, ?)",
            (lang, key, value)
        )
        count += 1
    # Changelog
    db.execute("""
        INSERT INTO change_log (table_name, record_id, action, field_name, new_value, changed_by)
        VALUES ('ui_translations', ?, 'UPDATE', 'count', ?, ?)
    """, (lang, str(count), user))
    db.commit()
    return count


# ===================================================================
#  SAYFALAMALI SORGULAR (Editor Grid icin)
# ===================================================================

def list_verses(page=1, limit=50, search='', conn=None):
    """Sayfalamali ayet listesi. Arama: sure no, ayet no, metin, meal."""
    db = conn or get_db()
    offset = (page - 1) * limit
    base_where = ""
    params = []
    if search:
        base_where = "WHERE v.id LIKE ? OR v.ayet LIKE ? OR v.meal LIKE ? OR v.surah LIKE ?"
        s = f'%{search}%'
        params = [s, s, s, s]

    total = db.execute(
        f"SELECT COUNT(*) FROM verses v {base_where}", params
    ).fetchone()[0]

    rows = db.execute(
        f"SELECT v.* FROM verses v {base_where} ORDER BY v.sure_no, v.ayet_no LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()

    items = []
    for v in rows:
        roots = db.execute(
            "SELECT root FROM verse_roots WHERE verse_id=? ORDER BY position",
            (v['id'],)
        ).fetchall()
        items.append({
            'id': v['id'],
            'sure_no': v['sure_no'],
            'ayet_no': v['ayet_no'],
            'surah': v['surah'] or '',
            'ayet': v['ayet'],
            'meal': v['meal'] or '',
            'dipnot': v['dipnot'] or '',
            'tefsir_popup': v['tefsir_popup'] or '',
            'roots': [r['root'] for r in roots],
        })

    return {
        'items': items,
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
    }


def list_roots(page=1, limit=50, search='', conn=None):
    """Sayfalamali kok listesi. Arama: kok, anlam, telaffuz."""
    db = conn or get_db()
    offset = (page - 1) * limit
    base_where = ""
    params = []
    if search:
        base_where = "WHERE r.root LIKE ? OR r.meaning_tr LIKE ? OR r.pronunciation LIKE ?"
        s = f'%{search}%'
        params = [s, s, s]

    total = db.execute(
        f"SELECT COUNT(*) FROM roots r {base_where}", params
    ).fetchone()[0]

    rows = db.execute(
        f"SELECT r.* FROM roots r {base_where} ORDER BY r.root LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()

    items = []
    for r in rows:
        verse_count = db.execute(
            "SELECT COUNT(*) FROM verse_roots WHERE root=?", (r['root'],)
        ).fetchone()[0]
        derived_count = db.execute(
            "SELECT COUNT(*) FROM derived_words WHERE root=?", (r['root'],)
        ).fetchone()[0]
        items.append({
            'root': r['root'],
            'meaning_tr': r['meaning_tr'],
            'meaning_ar': r['meaning_ar'] or '',
            'pronunciation': r['pronunciation'] or '',
            'verse_count': verse_count,
            'derived_count': derived_count,
        })

    return {
        'items': items,
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
    }


def list_translations(lang=None, page=1, limit=50, search='', conn=None):
    """Sayfalamali ceviri listesi."""
    db = conn or get_db()
    offset = (page - 1) * limit
    conditions = []
    params = []
    if lang:
        conditions.append("rt.lang=?")
        params.append(lang)
    if search:
        conditions.append("(rt.root LIKE ? OR rt.meaning LIKE ?)")
        s = f'%{search}%'
        params.extend([s, s])

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total = db.execute(
        f"SELECT COUNT(*) FROM root_translations rt {where}", params
    ).fetchone()[0]

    rows = db.execute(
        f"SELECT rt.* FROM root_translations rt {where} ORDER BY rt.lang, rt.root LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()

    items = [dict(r) for r in rows]
    langs = [r[0] for r in db.execute("SELECT DISTINCT lang FROM root_translations ORDER BY lang").fetchall()]

    return {
        'items': items,
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
        'languages': langs,
    }


# ===================================================================
#  TEKIL CRUD (Editor icin)
# ===================================================================

def update_verse(verse_id, meal=None, dipnot=None, tefsir_popup=None, user='system', conn=None):
    """Tek bir ayetin meal/dipnot/tefsir_popup alanlarini gunceller."""
    db = conn or get_db()
    existing = db.execute("SELECT * FROM verses WHERE id=?", (verse_id,)).fetchone()
    if not existing:
        return False

    fields = []
    values = []
    if meal is not None:
        fields.append("meal=?")
        values.append(meal)
        db.execute(
            "INSERT INTO change_log(table_name, record_id, action, field_name, old_value, new_value, changed_by) "
            "VALUES ('verses', ?, 'UPDATE', 'meal', ?, ?, ?)",
            (verse_id, existing['meal'] or '', meal, user)
        )
    if dipnot is not None:
        fields.append("dipnot=?")
        values.append(dipnot)
        db.execute(
            "INSERT INTO change_log(table_name, record_id, action, field_name, old_value, new_value, changed_by) "
            "VALUES ('verses', ?, 'UPDATE', 'dipnot', ?, ?, ?)",
            (verse_id, existing['dipnot'] or '', dipnot, user)
        )
    if tefsir_popup is not None:
        fields.append("tefsir_popup=?")
        values.append(tefsir_popup)
        db.execute(
            "INSERT INTO change_log(table_name, record_id, action, field_name, old_value, new_value, changed_by) "
            "VALUES ('verses', ?, 'UPDATE', 'tefsir_popup', ?, ?, ?)",
            (verse_id, existing['tefsir_popup'] or '', tefsir_popup, user)
        )

    if not fields:
        return False

    values.append(verse_id)
    db.execute(f"UPDATE verses SET {','.join(fields)} WHERE id=?", values)
    db.commit()
    return True


def update_verse_roots(verse_id, roots, user='system', conn=None):
    """Bir ayetin koklerini gunceller (butunluk kontrollu)."""
    db = conn or get_db()
    existing = db.execute("SELECT 1 FROM verses WHERE id=?", (verse_id,)).fetchone()
    if not existing:
        raise ValueError(f"Ayet '{verse_id}' bulunamadi.")

    # Tum koklerin sozlukte var olduğunu dogrula
    for root in roots:
        if not root:
            continue
        r = db.execute("SELECT 1 FROM roots WHERE root=?", (root,)).fetchone()
        if not r:
            raise ValueError(f"Kok '{root}' sozlukte bulunamadi. Once sozluge ekleyin.")

    old_roots = [r['root'] for r in db.execute(
        "SELECT root FROM verse_roots WHERE verse_id=? ORDER BY position",
        (verse_id,)
    ).fetchall()]

    db.execute("DELETE FROM verse_roots WHERE verse_id=?", (verse_id,))
    for idx, root in enumerate(roots):
        if not root:
            continue
        db.execute(
            "INSERT INTO verse_roots (verse_id, root, position) VALUES (?, ?, ?)",
            (verse_id, root, idx)
        )

    db.execute(
        "INSERT INTO change_log(table_name, record_id, action, field_name, old_value, new_value, changed_by) "
        "VALUES ('verse_roots', ?, 'UPDATE', 'roots', ?, ?, ?)",
        (verse_id, ','.join(old_roots), ','.join(roots), user)
    )
    db.commit()
    return True


def add_root(root_key, meaning_tr='', meaning_ar='', pronunciation='',
             user='system', conn=None):
    """Yeni kok ekler."""
    db = conn or get_db()
    existing = db.execute("SELECT 1 FROM roots WHERE root=?", (root_key,)).fetchone()
    if existing:
        raise ValueError(f"Kok '{root_key}' zaten mevcut.")

    db.execute(
        "INSERT INTO roots (root, meaning_tr, meaning_ar, pronunciation) VALUES (?, ?, ?, ?)",
        (root_key, meaning_tr, meaning_ar, pronunciation)
    )
    db.execute(
        "INSERT INTO change_log(table_name, record_id, action, field_name, new_value, changed_by) "
        "VALUES ('roots', ?, 'INSERT', 'root', ?, ?)",
        (root_key, root_key, user)
    )
    db.commit()
    return True


def delete_root(root_key, user='system', conn=None):
    """Kok siler. FK kontrolu yapar."""
    db = conn or get_db()
    existing = db.execute("SELECT 1 FROM roots WHERE root=?", (root_key,)).fetchone()
    if not existing:
        raise ValueError(f"Kok '{root_key}' bulunamadi.")

    # FK kontrolu: bu kok herhangi bir ayette kullaniliyor mu?
    usage = db.execute(
        "SELECT COUNT(*) FROM verse_roots WHERE root=?", (root_key,)
    ).fetchone()[0]
    if usage > 0:
        raise ValueError(f"Kok '{root_key}' {usage} ayette kullaniliyor. Once ayet koklerinden kaldirin.")

    db.execute("DELETE FROM derived_words WHERE root=?", (root_key,))
    db.execute("DELETE FROM root_translations WHERE root=?", (root_key,))
    db.execute("DELETE FROM roots WHERE root=?", (root_key,))
    db.execute(
        "INSERT INTO change_log(table_name, record_id, action, field_name, old_value, changed_by) "
        "VALUES ('roots', ?, 'DELETE', 'root', ?, ?)",
        (root_key, root_key, user)
    )
    db.commit()
    return True


def get_root_detail(root_key, conn=None):
    """Tek bir kokun tam detayini dondurur (editor icin)."""
    db = conn or get_db()
    row = db.execute("SELECT * FROM roots WHERE root=?", (root_key,)).fetchone()
    if not row:
        return None
    result = {
        'root': row['root'],
        'meaning_tr': row['meaning_tr'],
        'meaning_ar': row['meaning_ar'] or '',
        'pronunciation': row['pronunciation'] or '',
    }
    result['derived'] = [
        {'id': d['id'], 'word': d['word'], 'meaning_tr': d['meaning_tr']}
        for d in db.execute("SELECT * FROM derived_words WHERE root=?", (root_key,)).fetchall()
    ]
    result['verses'] = [
        r['verse_id'] for r in
        db.execute("SELECT verse_id FROM verse_roots WHERE root=? ORDER BY verse_id", (root_key,)).fetchall()
    ]
    # Ceviriler
    result['translations'] = {}
    for t_row in db.execute("SELECT lang, meaning FROM root_translations WHERE root=?", (root_key,)).fetchall():
        result['translations'][t_row['lang']] = t_row['meaning']
    return result
