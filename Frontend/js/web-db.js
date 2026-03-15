/** SemantikGalaksi — Web Modu SQLite Okuyucu (sql.js) */

var WebDB = {
    _db: null,
    _ready: false,

    async init() {
        if (this._ready) return this._db;
        try {
            var SQL = await initSqlJs({
                locateFile: f => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/' + f
            });
            var resp = await fetch('../DataEngine/quran.db');
            if (!resp.ok) throw new Error('DB fetch failed: ' + resp.status);
            var buf = await resp.arrayBuffer();
            this._db = new SQL.Database(new Uint8Array(buf));
            this._ready = true;
            return this._db;
        } catch (e) {
            console.error('WebDB init failed:', e);
            return null;
        }
    },

    _query(sql, params) {
        if (!this._db) return [];
        var stmt = this._db.prepare(sql);
        if (params) stmt.bind(params);
        var rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
    },

    getFullData() {
        var verses = this._query(
            "SELECT id, surah, ayet, meal, dipnot, dipnot_parsed, mapping_data, tefsir_popup, audio FROM verses ORDER BY sure_no, ayet_no"
        );
        var nodes = [];
        for (var i = 0; i < verses.length; i++) {
            var v = verses[i];
            var node = {
                id: v.id,
                surah: v.surah || '',
                text: v.ayet,
                translation: v.meal || ''
            };
            var roots = this._query(
                "SELECT root FROM verse_roots WHERE verse_id=? ORDER BY position",
                [v.id]
            );
            node.roots = roots.length ? roots.map(function(r) { return r.root; }) : null;
            if (v.dipnot) node.dipnot = v.dipnot;
            if (v.dipnot_parsed) {
                try { node.dipnot_parsed = JSON.parse(v.dipnot_parsed); } catch(e) {}
            }
            if (v.mapping_data) {
                try { node.mapping_data = JSON.parse(v.mapping_data); } catch(e) {}
            }
            if (v.tefsir_popup) {
                try { node.tefsir_popup = JSON.parse(v.tefsir_popup); } catch(e) {}
            }
            if (v.audio) node.audio = v.audio;
            nodes.push(node);
        }
        return { nodes: nodes };
    },

    getFullRoots() {
        var roots = this._query("SELECT * FROM roots ORDER BY root");
        var result = {};
        for (var i = 0; i < roots.length; i++) {
            var r = roots[i];
            var entry = {
                meaning: r.meaning_tr,
                meaning_ar: r.meaning_ar || '',
                pronunciation: r.pronunciation || ''
            };
            var derived = this._query(
                "SELECT word, meaning_tr FROM derived_words WHERE root=?",
                [r.root]
            );
            entry.derived = derived.map(function(d) {
                return { word: d.word, meaning: d.meaning_tr };
            });
            var ayahs = this._query(
                "SELECT verse_id FROM verse_roots WHERE root=? ORDER BY verse_id",
                [r.root]
            );
            entry.ayahs = ayahs.map(function(a) { return a.verse_id; });
            entry.count = ayahs.length;
            result[r.root] = entry;
        }
        return result;
    },

    getLocales() {
        return this._query("SELECT * FROM locale_meta ORDER BY lang");
    },

    getLocale(langCode) {
        var rows = this._query(
            "SELECT key, value FROM ui_translations WHERE lang=?",
            [langCode]
        );
        var result = {};
        for (var i = 0; i < rows.length; i++) {
            result[rows[i].key] = rows[i].value;
        }
        return result;
    }
};
