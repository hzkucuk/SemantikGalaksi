// --- datasets.js — Veritabani Editor & Yardimci Fonksiyonlar ---

// =====================================================
//  DIPNOT
// =====================================================
window.toggleDipnot = () => {
    var div = document.getElementById('hud-dipnot');
    div.classList.toggle('hidden');
};
window.showDipnotPopup = (btn, nodeId) => {
    var item = btn.closest('.ayah-list-item');
    var existing = item.querySelector('.dipnot-inline');
    if (existing) { existing.remove(); return; }
    document.querySelectorAll('.dipnot-inline').forEach(el => el.remove());
    var node = nodes.find(n => n.id === nodeId);
    var text = node?.dipnot || t('hud.noDipnot');
    var div = document.createElement('div');
    div.className = 'dipnot-inline';
    div.style.cssText = 'margin-top:8px;padding:10px 14px;background:rgba(120,53,15,0.3);border:1px solid rgba(245,158,11,0.2);border-radius:10px;font-size:12px;color:rgba(253,230,138,0.8);font-style:italic;line-height:1.6;';
    div.textContent = text;
    item.appendChild(div);
};

// =====================================================
//  DB GRID EDITOR — State
// =====================================================
var _dbTab = 'verses';
var _dbPage = 1;
var _dbLimit = 50;
var _dbSearch = '';
var _dbData = null;
var _dbTimer = null;
var _dbTransLang = null;
var _dbLogTable = '';
var _kbTarget = null;

// =====================================================
//  DB GRID EDITOR — Open / Close / Tabs
// =====================================================
window.openEditor = async () => {
    if (typeof isDesktopMode !== 'undefined' && !isDesktopMode) {
        await showAlert(t('editor.desktopOnly'));
        return;
    }
    document.getElementById('json-editor').style.display = 'flex';
    document.getElementById('editor-title').textContent = '\uD83D\uDDC4 ' + t('editor.dbTitle');
    _dbTab = 'verses';
    _dbPage = 1;
    _dbSearch = '';
    _dbTransLang = null;
    _dbRenderTabs();
    await _dbLoad();
};
window.openDatasets = () => { openEditor(); };
window.closeEditor = () => {
    document.getElementById('json-editor').style.display = 'none';
};

window.dbSwitchTab = async (tab) => {
    if (tab === _dbTab) return;
    _dbTab = tab;
    _dbPage = 1;
    _dbSearch = '';
    _dbTransLang = null;
    _dbLogTable = '';
    _dbRenderTabs();
    await _dbLoad();
};

var _dbRenderTabs = () => {
    var tabs = document.getElementById('editor-tabs');
    var isAdmin = (typeof authRole !== 'undefined' && authRole === 'admin');
    var items = [
        { id: 'verses', label: t('editor.tabVerses'), icon: '\uD83D\uDCDC' },
        { id: 'roots', label: t('editor.tabRoots'), icon: '\uD83C\uDF31' },
        { id: 'translations', label: t('editor.tabTranslations'), icon: '\uD83C\uDF10' },
    ];
    if (isAdmin) items.push({ id: 'logs', label: t('editor.tabLogs'), icon: '\uD83D\uDCCB' });
    tabs.innerHTML = items.map(function(i) {
        return '<button class="editor-tab ' + (_dbTab === i.id ? 'active' : '') +
            '" onclick="dbSwitchTab(\'' + i.id + '\')">' +
            '<span class="tab-dot"></span>' + i.icon + ' ' + i.label + '</button>';
    }).join('');
};

// =====================================================
//  DB GRID EDITOR — Data Loading
// =====================================================
var _dbLoad = async () => {
    var main = document.getElementById('editor-main');
    if (!main) return;
    main.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;">' + t('editor.loading') + '...</div>';
    try {
        var url;
        if (_dbTab === 'verses') url = '/api/db/verses';
        else if (_dbTab === 'roots') url = '/api/db/roots-list';
        else if (_dbTab === 'logs') url = '/api/db/changelog';
        else url = '/api/db/translations';
        var params = ['page=' + _dbPage, 'limit=' + _dbLimit];
        if (_dbSearch) params.push('search=' + encodeURIComponent(_dbSearch));
        if (_dbTab === 'translations' && _dbTransLang) params.push('lang=' + encodeURIComponent(_dbTransLang));
        if (_dbTab === 'logs' && _dbLogTable) params.push('table=' + encodeURIComponent(_dbLogTable));
        url += '?' + params.join('&');
        var res = await authFetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        _dbData = await res.json();
        _dbRenderMain();
    } catch(e) {
        main.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;">' + t('editor.loadError') + ': ' + e.message + '</div>';
    }
};

// =====================================================
//  DB GRID EDITOR — Column Definitions
// =====================================================
var _dbGetCols = () => {
    var defs = {
        verses: [
            { key: 'id', label: t('editor.colId'), w: '70px' },
            { key: 'surah', label: t('editor.colSurah'), w: '90px' },
            { key: 'ayet', label: t('editor.colText'), w: '28%', rtl: true },
            { key: 'meal', label: t('editor.colMeal'), w: '28%', edit: 'editor' },
            { key: 'roots', label: t('editor.colRoots'), w: '14%', rtl: true, edit: 'admin', type: 'roots' },
            { key: 'dipnot', label: t('editor.colDipnot'), w: '10%', edit: 'editor' },
        ],
        roots: [
            { key: 'root', label: t('editor.colRoot'), w: '80px', rtl: true },
            { key: 'meaning_tr', label: t('editor.colMeaningTr'), w: '24%', edit: 'admin' },
            { key: 'meaning_ar', label: t('editor.colMeaningAr'), w: '18%', rtl: true, edit: 'admin' },
            { key: 'pronunciation', label: t('editor.colPronunciation'), w: '14%', edit: 'admin' },
            { key: 'verse_count', label: t('editor.colVerseCount'), w: '70px' },
            { key: 'derived_count', label: t('editor.colDerived'), w: '80px' },
        ],
        translations: [
            { key: 'root', label: t('editor.colRoot'), w: '80px', rtl: true },
            { key: 'lang', label: t('editor.colLang'), w: '60px' },
            { key: 'meaning', label: t('editor.colMeaning'), w: '70%' },
        ],
        logs: [
            { key: 'id', label: 'ID', w: '50px' },
            { key: 'table_name', label: t('editor.logTable'), w: '10%' },
            { key: 'record_id', label: t('editor.logRecord'), w: '10%' },
            { key: 'action', label: t('editor.logAction'), w: '7%' },
            { key: 'field_name', label: t('editor.logField'), w: '10%' },
            { key: 'old_value', label: t('editor.logOldVal'), w: '18%' },
            { key: 'new_value', label: t('editor.logNewVal'), w: '18%' },
            { key: 'changed_by', label: t('editor.logUser'), w: '7%' },
            { key: 'changed_at', label: t('editor.logDate'), w: '12%' },
        ]
    };
    return defs[_dbTab] || [];
};

// =====================================================
//  DB GRID EDITOR — Main Render
// =====================================================
var _escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
var _escAttr = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

var _dbRenderMain = () => {
    var main = document.getElementById('editor-main');
    if (!_dbData) return;
    var isAdmin = (typeof authRole !== 'undefined' && authRole === 'admin');
    var isViewer = (typeof authRole !== 'undefined' && authRole === 'viewer');
    var canEdit = !isViewer;
    var h = '';

    // --- Toolbar ---
    h += '<div class="db-toolbar">';
    h += '<div class="db-toolbar-left">';
    h += '<input type="text" id="db-search" class="db-search-input" placeholder="' + t('editor.searchPlaceholder') + '" value="' + _escHtml(_dbSearch) + '" oninput="dbSearchInput(this.value)" onfocus="_kbTarget=this">';
    if (_dbTab === 'translations' && _dbData.languages) {
        h += '<select class="db-lang-select" onchange="dbFilterLang(this.value)">';
        h += '<option value="">' + t('editor.allLanguages') + '</option>';
        _dbData.languages.forEach(function(l) {
            h += '<option value="' + l + '"' + (_dbTransLang === l ? ' selected' : '') + '>' + l.toUpperCase() + '</option>';
        });
        h += '</select>';
    }
    if (_dbTab === 'logs' && _dbData.tables) {
        h += '<select class="db-lang-select" onchange="dbFilterLogTable(this.value)">';
        h += '<option value="">' + t('editor.allTables') + '</option>';
        _dbData.tables.forEach(function(tbl) {
            h += '<option value="' + tbl + '"' + (_dbLogTable === tbl ? ' selected' : '') + '>' + tbl + '</option>';
        });
        h += '</select>';
    }
    h += '</div><div class="db-toolbar-right">';
    if (_dbTab === 'roots' && isAdmin) {
        h += '<button class="db-btn db-btn-add" onclick="dbAddRoot()">+ ' + t('editor.addRoot') + '</button>';
    }
    if (isAdmin) {
        h += '<button class="db-btn db-btn-export" onclick="dbExportAll()">\u2B07 ' + t('editor.exportJson') + '</button>';
    }
    h += '<div class="db-pagination">';
    h += '<button class="db-page-btn" onclick="dbPrevPage()"' + (_dbPage <= 1 ? ' disabled' : '') + '>\u25C0</button>';
    h += '<span class="db-page-info">' + _dbPage + ' / ' + (_dbData.pages || 1) + '</span>';
    h += '<button class="db-page-btn" onclick="dbNextPage()"' + (_dbPage >= (_dbData.pages || 1) ? ' disabled' : '') + '>\u25B6</button>';
    h += '</div></div></div>';

    // --- Table ---
    var cols = _dbGetCols();
    var isLogs = (_dbTab === 'logs');
    var extraCol = (_dbTab === 'roots' && isAdmin) ? 1 : 0;
    h += '<div class="db-grid-scroll"><table class="db-grid"><thead><tr>';
    cols.forEach(function(c) {
        h += '<th style="width:' + c.w + (c.rtl ? ';direction:rtl;text-align:right' : '') + '">' + c.label + '</th>';
    });
    if (extraCol) h += '<th style="width:50px">' + t('editor.colActions') + '</th>';
    h += '</tr></thead><tbody>';

    if (!_dbData.items || _dbData.items.length === 0) {
        h += '<tr><td colspan="' + (cols.length + extraCol) + '" style="text-align:center;padding:30px;color:#64748b">' + t('editor.noResults') + '</td></tr>';
    } else {
        _dbData.items.forEach(function(row) {
            h += '<tr>';
            cols.forEach(function(c) {
                var val = c.type === 'roots' ? (row[c.key] || []).join(', ') : (row[c.key] != null ? row[c.key] : '');
                var editable = !isLogs && c.edit && ((c.edit === 'admin' && isAdmin) || (c.edit === 'editor' && canEdit));
                var cellCls = 'db-cell' + (c.rtl ? ' rtl' : '') + (editable ? ' editable' : '');
                var rowId = _dbTab === 'verses' ? row.id : (_dbTab === 'roots' ? row.root : (isLogs ? row.id : (row.root + ':' + row.lang)));
                if (editable) {
                    h += '<td class="' + cellCls + '" ondblclick="dbStartEdit(this,\'' + _escAttr(rowId) + '\',\'' + c.key + '\',\'' + (c.type || '') + '\')" title="' + t('editor.dblClickEdit') + '">';
                } else {
                    h += '<td class="' + cellCls + '">';
                }
                if (c.type === 'roots') {
                    (row[c.key] || []).forEach(function(r) {
                        h += '<span class="db-root-tag">' + _escHtml(r) + '</span>';
                    });
                } else if (isLogs && c.key === 'action') {
                    var acCls = val === 'INSERT' ? 'log-insert' : (val === 'DELETE' ? 'log-delete' : 'log-update');
                    h += '<span class="db-log-badge ' + acCls + '">' + _escHtml(val) + '</span>';
                } else {
                    h += '<span class="db-cell-text">' + _escHtml(val) + '</span>';
                }
                h += '</td>';
            });
            if (extraCol) {
                h += '<td class="db-cell db-actions"><button class="db-act-btn" onclick="dbDeleteRoot(\'' + _escAttr(row.root) + '\')" title="' + t('editor.deleteRoot') + '">\uD83D\uDDD1</button></td>';
            }
            h += '</tr>';
        });
    }
    h += '</tbody></table></div>';

    // --- Status ---
    h += '<div class="db-status">';
    h += '<span>\u2713 ' + (_dbData.total || 0) + ' ' + t('editor.records') + '</span>';
    h += '<span>' + t('editor.page') + ' ' + _dbPage + '/' + (_dbData.pages || 1) + ' \u00B7 ' + (_dbData.items ? _dbData.items.length : 0) + ' ' + t('editor.showing') + '</span>';
    h += '</div>';

    main.innerHTML = h;
};

// =====================================================
//  PAGINATION
// =====================================================
window.dbNextPage = async () => {
    if (_dbData && _dbPage < _dbData.pages) { _dbPage++; await _dbLoad(); }
};
window.dbPrevPage = async () => {
    if (_dbPage > 1) { _dbPage--; await _dbLoad(); }
};

// =====================================================
//  SEARCH
// =====================================================
window.dbSearchInput = (val) => {
    if (_dbTimer) clearTimeout(_dbTimer);
    _dbTimer = setTimeout(function() {
        _dbSearch = val.trim();
        _dbPage = 1;
        _dbLoad();
    }, 400);
};
window.dbFilterLang = async (lang) => {
    _dbTransLang = lang || null;
    _dbPage = 1;
    await _dbLoad();
};
window.dbFilterLogTable = async (tbl) => {
    _dbLogTable = tbl || '';
    _dbPage = 1;
    await _dbLoad();
};

// =====================================================
//  INLINE EDITING
// =====================================================
window.dbStartEdit = (td, rowId, field, type) => {
    if (td.querySelector('input, textarea')) return;
    var currentVal;
    if (type === 'roots') {
        currentVal = Array.from(td.querySelectorAll('.db-root-tag')).map(function(t) { return t.textContent; }).join(', ');
    } else {
        var span = td.querySelector('.db-cell-text');
        currentVal = span ? span.textContent : '';
    }
    td.dataset.originalVal = currentVal;
    td.dataset.rowId = rowId;
    td.dataset.field = field;
    td.dataset.type = type || '';
    var isLongText = (field === 'meal' || field === 'dipnot');
    var input;
    if (isLongText) {
        input = document.createElement('textarea');
        input.className = 'db-edit-input';
        input.rows = 3;
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'db-edit-input';
    }
    input.value = currentVal;
    if (td.classList.contains('rtl')) input.style.direction = 'rtl';
    input.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dbSaveEdit(td); }
        if (e.key === 'Escape') dbCancelEdit(td);
    };
    input.onblur = function() {
        setTimeout(function() { if (td.querySelector('input, textarea')) dbSaveEdit(td); }, 200);
    };
    input.onfocus = function() { _kbTarget = input; };
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();
};

window.dbSaveEdit = async (td) => {
    var input = td.querySelector('input, textarea');
    if (!input) return;
    var newVal = input.value.trim();
    var origVal = td.dataset.originalVal;
    var rowId = td.dataset.rowId;
    var field = td.dataset.field;
    var type = td.dataset.type;
    if (newVal === origVal) { dbCancelEdit(td); return; }
    input.disabled = true;
    input.style.opacity = '0.5';
    try {
        var url, body, method = 'PUT';
        if (_dbTab === 'verses') {
            if (type === 'roots') {
                url = '/api/db/verse/' + encodeURIComponent(rowId) + '/roots';
                var rootsList = newVal.split(/[,\u060C]\s*/).map(function(r) { return r.trim(); }).filter(function(r) { return r; });
                body = { roots: rootsList };
            } else {
                url = '/api/db/verse/' + encodeURIComponent(rowId);
                body = {};
                body[field] = newVal;
            }
        } else if (_dbTab === 'roots') {
            url = '/api/db/root/' + encodeURIComponent(rowId);
            body = {};
            body[field] = newVal;
        }
        var res = await authFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            var err = await res.json();
            throw new Error(err.error || 'HTTP ' + res.status);
        }
        td.innerHTML = '';
        if (type === 'roots') {
            var roots = newVal.split(/[,\u060C]\s*/).map(function(r) { return r.trim(); }).filter(function(r) { return r; });
            roots.forEach(function(r) {
                var tag = document.createElement('span');
                tag.className = 'db-root-tag';
                tag.textContent = r;
                td.appendChild(tag);
            });
        } else {
            var s = document.createElement('span');
            s.className = 'db-cell-text';
            s.textContent = newVal;
            td.appendChild(s);
        }
        _dbShowStatus('\u2713 ' + t('editor.saved'), 'valid');
    } catch(e) {
        _dbShowStatus('\u2717 ' + e.message, 'invalid');
        dbCancelEdit(td);
    }
};

window.dbCancelEdit = (td) => {
    var origVal = td.dataset.originalVal || '';
    var type = td.dataset.type;
    td.innerHTML = '';
    if (type === 'roots') {
        origVal.split(',').map(function(r) { return r.trim(); }).filter(function(r) { return r; }).forEach(function(r) {
            var tag = document.createElement('span');
            tag.className = 'db-root-tag';
            tag.textContent = r;
            td.appendChild(tag);
        });
    } else {
        var s = document.createElement('span');
        s.className = 'db-cell-text';
        s.textContent = origVal;
        td.appendChild(s);
    }
};

// =====================================================
//  CRUD
// =====================================================
window.dbAddRoot = async () => {
    var rootKey = await showPrompt(t('editor.enterRoot'), '', t('editor.addRoot'));
    if (!rootKey || !rootKey.trim()) return;
    rootKey = rootKey.trim();
    var meaning = await showPrompt(t('editor.enterMeaning'), '', t('editor.addRoot'));
    try {
        var res = await authFetch('/api/db/root', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ root: rootKey, meaning_tr: meaning || '' })
        });
        if (!res.ok) {
            var err = await res.json();
            await showAlert(err.error || t('editor.saveError'));
            return;
        }
        _dbShowStatus('\u2713 ' + t('editor.rootAdded'), 'valid');
        await _dbLoad();
    } catch(e) { await showAlert(e.message); }
};

window.dbDeleteRoot = async (rootKey) => {
    var ok = await showConfirm(t('editor.confirmDelete').replace('{root}', rootKey), t('editor.deleteRoot'), { danger: true });
    if (!ok) return;
    try {
        var res = await authFetch('/api/db/root/' + encodeURIComponent(rootKey), { method: 'DELETE' });
        if (!res.ok) {
            var err = await res.json();
            await showAlert(err.error || t('editor.deleteError'));
            return;
        }
        _dbShowStatus('\u2713 ' + t('editor.rootDeleted'), 'valid');
        await _dbLoad();
    } catch(e) { await showAlert(e.message); }
};

window.dbExportAll = async () => {
    try {
        var res = await authFetch('/api/db/export');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        _dbShowStatus('\u2713 ' + t('editor.exportDone'), 'valid');
    } catch(e) {
        _dbShowStatus('\u2717 ' + e.message, 'invalid');
    }
};

var _dbShowStatus = (msg, cls) => {
    var bar = document.getElementById('editor-status');
    var msgEl = document.getElementById('editor-msg');
    if (bar && msgEl) {
        bar.className = 'editor-status ' + (cls || 'valid');
        msgEl.textContent = msg;
    }
};

// =====================================================
//  DISA AKTARMA
// =====================================================
var downloadJSON = async (data, filename) => {
    var content = JSON.stringify(data, null, 2);
    if (isDesktopMode && window.pywebview && window.pywebview.api && window.pywebview.api.save_file) {
        try {
            var ok = await window.pywebview.api.save_file(content, filename);
            if (ok) return;
        } catch(e) {}
    }
    var blob = new Blob([content], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
};

// =====================================================
//  ARAPCA SANAL KLAVYE
// =====================================================
window.toggleArabicKb = () => {
    var kb = document.getElementById('arabic-kb');
    kb.classList.toggle('show');
    var toggle = document.getElementById('kb-toggle');
    if (toggle) toggle.style.borderColor = kb.classList.contains('show') ? '#00f2ff' : '';
};
window.kbInsert = (ch) => {
    var el = _kbTarget || document.getElementById('db-search');
    if (!el) return;
    var s = el.selectionStart, e = el.selectionEnd;
    el.value = el.value.substring(0, s) + ch + el.value.substring(e);
    el.selectionStart = el.selectionEnd = s + ch.length;
    el.focus();
    if (el.id === 'db-search') el.dispatchEvent(new Event('input'));
};
window.kbBackspace = () => {
    var el = _kbTarget || document.getElementById('db-search');
    if (!el) return;
    var s = el.selectionStart, e = el.selectionEnd;
    if (s !== e) {
        el.value = el.value.substring(0, s) + el.value.substring(e);
        el.selectionStart = el.selectionEnd = s;
    } else if (s > 0) {
        el.value = el.value.substring(0, s - 1) + el.value.substring(s);
        el.selectionStart = el.selectionEnd = s - 1;
    }
    el.focus();
    if (el.id === 'db-search') el.dispatchEvent(new Event('input'));
};

// =====================================================
//  API KEY YONETIMI
// =====================================================
window.showApiKeyGuide = () => {
    document.getElementById('settings-overlay').style.display = 'flex';
    document.getElementById('api-key-guide').classList.remove('hidden');
    renderKeyList();
};
var renderKeyList = () => {
    var list = document.getElementById('api-key-list');
    var keys = KeyManager.getKeys();
    if (keys.length === 0) {
        list.innerHTML = '<p class="text-[11px] text-slate-700 italic text-center py-4">' + t('apikey.noKeys') + '</p>';
        return;
    }
    list.innerHTML = keys.map(k => {
        var masked = k.key.substring(0, 8) + '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' + k.key.slice(-4);
        var statusCls = k.status === 'ok' ? 'ok' : k.status === 'fail' ? 'fail' : 'pending';
        var statusText = k.status === 'ok' ? t('apikey.active') : k.status === 'fail' ? t('apikey.error') : t('apikey.pending');
        var errorHint = k.status === 'fail' && k.error ? '<div style="font-size:9px;color:#f87171;margin-top:2px;word-break:break-all">' + k.error + '</div>' : '';
        return '<div class="key-item ' + (k.status === 'ok' ? 'active' : '') + '">' +
            '<span class="key-text">' + masked + '</span>' +
            '<span class="key-status ' + statusCls + '">' + statusText + '</span>' +
            '<button class="key-btn" onclick="removeApiKey(\'' + k.key + '\')" title="' + t('common.delete') + '">\uD83D\uDDD1</button>' +
            errorHint + '</div>';
    }).join('');
};
window.addApiKey = () => {
    var input = document.getElementById('new-key-input');
    var key = input.value.trim();
    if (!key) return;
    if (!key.startsWith('AIza')) {
        input.style.borderColor = '#ef4444';
        setTimeout(() => input.style.borderColor = '', 2000);
        return;
    }
    KeyManager.addKey(key);
    input.value = '';
    renderKeyList();
};
window.removeApiKey = (key) => {
    KeyManager.removeKey(key);
    if (apiKey === key) apiKey = null;
    renderKeyList();
};
window.testAllKeys = async () => {
    var keys = KeyManager.getKeys();
    for (var k of keys) {
        KeyManager.updateStatus(k.key, 'pending');
        renderKeyList();
        var result = await KeyManager.testKey(k.key);
        KeyManager.updateStatus(k.key, result.ok ? 'ok' : 'fail', result.error);
        if (result.ok && !apiKey) apiKey = k.key;
        renderKeyList();
    }
};
