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
    items.push({ id: 'audit', label: t('editor.tabAudit'), icon: '\uD83D\uDEE1' });
    if (isAdmin) items.push({ id: 'sync', label: t('editor.tabSync'), icon: '\uD83D\uDD04' });
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
        // Audit tabı özel yükleme
        if (_dbTab === 'audit') {
            var res = await authFetch('/api/db/audit');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            _dbData = await res.json();
            _dbRenderAudit();
            return;
        }
        // Sync tab ozel yukleme
        if (_dbTab === 'sync') {
            var res = await authFetch('/api/sync/status');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            _dbData = await res.json();
            _dbRenderSync();
            // AI parser durumunu arka planda yukle
            _syncLoadAIStatus();
            return;
        }
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
            { key: 'tefsir_popup', label: t('editor.colTefsir'), w: '10%', edit: 'admin', type: 'tefsir' },
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
        var _langNames = {en:'English',es:'Español',it:'Italiano',ru:'Русский',de:'Deutsch',fr:'Français',ar:'العربية',ja:'日本語',zh:'中文',pt:'Português',ko:'한국어',nl:'Nederlands'};
        var _langFlags = {en:'EN-en',es:'ES-es',it:'IT-it',ru:'RU-ru',de:'DE-de',fr:'FR-fr',ar:'AR-sa',ja:'JA-jp',zh:'ZH-cn',pt:'PT-pt',ko:'KO-kr',nl:'NL-nl'};
        h += '<select class="db-lang-select" onchange="dbFilterLang(this.value)">';
        h += '<option value="">' + t('editor.allLanguages') + '</option>';
        _dbData.languages.forEach(function(l) {
            var flagCode = _langFlags[l] || l.toUpperCase() + '-' + l;
            var flag = (typeof CountryFlags !== 'undefined') ? CountryFlags.get(flagCode) : '';
            var name = _langNames[l] || l.toUpperCase();
            h += '<option value="' + l + '"' + (_dbTransLang === l ? ' selected' : '') + '>' + l.toUpperCase() + ' — ' + name + '</option>';
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
                        } else if (c.type === 'tefsir') {
                            var tv = row[c.key] || '';
                            if (tv && tv.trim()) {
                                try {
                                    var segs = JSON.parse(tv);
                                    var segCnt = Array.isArray(segs) ? segs.length : 0;
                                    h += '<span class="db-root-tag" style="background:rgba(167,139,250,0.15);color:#a78bfa;" title="' + _escHtml(tv.substring(0, 200)) + '">' + segCnt + ' seg</span>';
                                } catch(e) {
                                    h += '<span class="db-cell-text" style="color:#94a3b8;">' + _escHtml(tv.substring(0, 40)) + '</span>';
                                }
                            } else {
                                h += '<span style="color:#475569;font-size:10px;">\u2014</span>';
                            }
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
    } else if (type === 'tefsir') {
        var rowData = (_dbData && _dbData.items) ? _dbData.items.find(function(r) { return (_dbTab === 'verses' ? r.id : r.root) === rowId; }) : null;
        currentVal = rowData ? (rowData.tefsir_popup || '') : '';
    } else {
        var span = td.querySelector('.db-cell-text');
        currentVal = span ? span.textContent : '';
    }
    td.dataset.originalVal = currentVal;
    td.dataset.rowId = rowId;
    td.dataset.field = field;
    td.dataset.type = type || '';
    var isLongText = (field === 'meal' || field === 'dipnot' || field === 'tefsir_popup');
    var input;
    if (isLongText) {
        input = document.createElement('textarea');
        input.className = 'db-edit-input';
        input.rows = field === 'tefsir_popup' ? 5 : 3;
        if (field === 'tefsir_popup') input.placeholder = t('editor.tefsirPlaceholder');
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

// =====================================================
//  VERI DENETIM PANELI (Audit Dashboard)
// =====================================================

var _dbRenderAudit = () => {
    var main = document.getElementById('editor-main');
    if (!main || !_dbData) return;
    var d = _dbData;
    var scoreColor = d.score >= 90 ? '#34d399' : d.score >= 70 ? '#fbbf24' : '#ef4444';
    var h = '';

    // Skor ve Ozet Karti
    h += '<div class="audit-dashboard">';
    h += '<div class="audit-score-card">';
    h += '<div class="audit-score-ring" style="--score:' + d.score + ';--color:' + scoreColor + '">';
    h += '<span class="audit-score-val">' + d.score + '%</span>';
    h += '</div>';
    h += '<div class="audit-score-label">' + t('audit.dataScore') + '</div>';
    h += '<div class="audit-score-sub">' + d.total_verses + ' ' + t('audit.verses') + ' &middot; ' + d.total_roots + ' ' + t('audit.roots') + '</div>';
    h += '</div>';

    // Metrik Kartlari
    h += '<div class="audit-metrics">';
    var metrics = [
        { icon: '\uD83D\uDCDC', label: t('audit.emptyMeal'), count: d.empty_meal.length, total: d.total_verses, type: 'warn' },
        { icon: '\uD83C\uDF31', label: t('audit.noRoots'), count: d.no_roots.length, total: d.total_verses, type: d.no_roots.length > 0 ? 'info' : 'ok' },
        { icon: '\uD83D\uDCD6', label: t('audit.emptyDipnot'), count: d.empty_dipnot_count, total: d.total_verses, type: 'info' },
        { icon: '\u26A0', label: t('audit.emptyMeaning'), count: d.empty_meaning.length, total: d.total_roots, type: d.empty_meaning.length > 0 ? 'warn' : 'ok' },
        { icon: '\uD83D\uDD0A', label: t('audit.emptyPronunciation'), count: d.empty_pronunciation.length, total: d.total_roots, type: d.empty_pronunciation.length > 0 ? 'info' : 'ok' },
        { icon: '\uD83D\uDC7B', label: t('audit.orphanRoots'), count: d.orphan_roots.length, total: d.total_roots, type: d.orphan_roots.length > 0 ? 'warn' : 'ok' },
        { icon: '\u2753', label: t('audit.undefinedRoots'), count: d.undefined_roots.length, total: 0, type: d.undefined_roots.length > 0 ? 'error' : 'ok' },
        { icon: '\uD83D\uDD17', label: t('audit.fkViolations'), count: d.fk_violations, total: 0, type: d.fk_violations > 0 ? 'error' : 'ok' },
    ];
    metrics.forEach(function(m) {
        var pct = m.total > 0 ? Math.round(((m.total - m.count) / m.total) * 100) : (m.count === 0 ? 100 : 0);
        var cls = m.type === 'error' ? 'audit-metric-error' : m.type === 'warn' ? 'audit-metric-warn' : m.type === 'info' ? 'audit-metric-info' : 'audit-metric-ok';
        h += '<div class="audit-metric ' + cls + '">';
        h += '<div class="audit-metric-icon">' + m.icon + '</div>';
        h += '<div class="audit-metric-body">';
        h += '<div class="audit-metric-val">' + m.count + (m.total > 0 ? ' / ' + m.total : '') + '</div>';
        h += '<div class="audit-metric-label">' + m.label + '</div>';
        if (m.total > 0) {
            h += '<div class="audit-bar"><div class="audit-bar-fill" style="width:' + pct + '%;background:' + (pct >= 90 ? '#34d399' : pct >= 70 ? '#fbbf24' : '#ef4444') + '"></div></div>';
        }
        h += '</div></div>';
    });
    h += '</div>';

    // Eksik Ceviri Dilleri
    if (d.missing_translations && Object.keys(d.missing_translations).length > 0) {
        h += '<div class="audit-section">';
        h += '<h3 class="audit-section-title">\uD83C\uDF10 ' + t('audit.missingTranslations') + '</h3>';
        h += '<div class="audit-tags">';
        Object.keys(d.missing_translations).forEach(function(lang) {
            h += '<span class="audit-tag-warn">' + lang.toUpperCase() + ': ' + d.missing_translations[lang] + ' ' + t('audit.missingCount') + '</span>';
        });
        h += '</div></div>';
    }

    // Detay Listeleri (collapse)
    var details = [
        { key: 'empty_meal', title: t('audit.emptyMealList'), items: d.empty_meal, render: function(v) { return v.id + ' — ' + v.surah; } },
        { key: 'no_roots', title: t('audit.noRootsList'), items: d.no_roots, render: function(v) { return v.id + ' — ' + v.surah; } },
        { key: 'empty_meaning', title: t('audit.emptyMeaningList'), items: d.empty_meaning, render: function(v) { return v; } },
        { key: 'orphan_roots', title: t('audit.orphanRootsList'), items: d.orphan_roots, render: function(v) { return v; } },
        { key: 'undefined_roots', title: t('audit.undefinedRootsList'), items: d.undefined_roots, render: function(v) { return v; } },
    ];
    details.forEach(function(sec) {
        if (!sec.items || sec.items.length === 0) return;
        h += '<details class="audit-detail">';
        h += '<summary class="audit-detail-sum">' + sec.title + ' (' + sec.items.length + ')</summary>';
        h += '<div class="audit-detail-body">';
        sec.items.forEach(function(item) {
            h += '<span class="audit-item">' + _escHtml(sec.render(item)) + '</span>';
        });
        h += '</div></details>';
    });

    // Sure Bazli Ozet Tablosu
    if (d.surah_summary && d.surah_summary.length > 0) {
        h += '<details class="audit-detail">';
        h += '<summary class="audit-detail-sum">\uD83D\uDCCA ' + t('audit.surahSummary') + ' (' + d.surah_summary.length + ' ' + t('audit.surahs') + ')</summary>';
        h += '<div class="audit-detail-body">';
        h += '<table class="audit-table"><thead><tr>';
        h += '<th>' + t('audit.surah') + '</th><th>' + t('audit.total') + '</th>';
        h += '<th>' + t('audit.noRoots') + '</th><th>' + t('audit.emptyMeal') + '</th>';
        h += '<th>' + t('audit.emptyDipnot') + '</th><th>' + t('audit.completeness') + '</th>';
        h += '</tr></thead><tbody>';
        d.surah_summary.forEach(function(s) {
            var comp = s.total > 0 ? Math.round(((s.total - s.no_meal) / s.total) * 100) : 100;
            var cls = comp >= 95 ? 'audit-row-ok' : comp >= 70 ? 'audit-row-warn' : 'audit-row-error';
            h += '<tr class="' + cls + '">';
            h += '<td>' + _escHtml(s.surah) + '</td>';
            h += '<td>' + s.total + '</td>';
            h += '<td>' + (s.no_roots > 0 ? '<span class="audit-badge-warn">' + s.no_roots + '</span>' : '\u2714') + '</td>';
            h += '<td>' + (s.no_meal > 0 ? '<span class="audit-badge-warn">' + s.no_meal + '</span>' : '\u2714') + '</td>';
            h += '<td>' + (s.no_dipnot > 0 ? s.no_dipnot : '\u2714') + '</td>';
            h += '<td><div class="audit-bar-sm"><div class="audit-bar-fill" style="width:' + comp + '%;background:' + (comp >= 95 ? '#34d399' : comp >= 70 ? '#fbbf24' : '#ef4444') + '"></div></div> ' + comp + '%</td>';
            h += '</tr>';
        });
        h += '</tbody></table></div></details>';
    }

    h += '</div>';
    main.innerHTML = h;
};

// =====================================================
//  SYNC MANAGEMENT PANEL (Admin Only)
// =====================================================
var _syncState = { step: 1, backupDone: false, scanResults: [], totalDiffs: 0, totalFixes: 0, scanning: false, fixing: false, aiStatus: null };

var _dbRenderSync = () => {
    var main = document.getElementById('editor-main');
    if (!main) return;
    var data = _dbData || {};
    var stats = data.stats || {};
    var backups = data.backups || [];
    var st = _syncState;
    var h = '<div class="audit-dashboard" style="padding:24px;max-width:1100px;margin:0 auto;">';
    // Baslik
    h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">';
    h += '<span style="font-size:28px;">\uD83D\uDD04</span>';
    h += '<div><div style="font-size:18px;font-weight:800;color:#f1f5f9;">' + t('sync.title') + '</div>';
    h += '<div style="font-size:11px;color:#64748b;margin-top:2px;">' + t('sync.source') + '</div></div></div>';

    // DB Bilgi Kartlari
    var dbSize = data.db_size ? (data.db_size / 1024 / 1024).toFixed(1) + ' MB' : '—';
    var lastBk = backups.length > 0 ? backups[0].name.replace('quran_backup_', '').replace('.db', '').replace(/_/g, ' ') : t('sync.noBackup');
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px;">';
    h += _syncInfoCard('\uD83D\uDDC3', t('sync.dbSize'), dbSize, '#06b6d4');
    h += _syncInfoCard('\uD83D\uDCBE', t('sync.lastBackup'), lastBk, '#8b5cf6');
    h += _syncInfoCard('\uD83D\uDCDC', t('audit.verses'), (stats.verses || 6236).toLocaleString(), '#34d399');
    var aiSt = st.aiStatus || {};
    var aiLabel = aiSt.exists ? t('sync.parserGenerated') : t('sync.parserBuiltin');
    var aiClr = aiSt.exists ? '#a78bfa' : '#64748b';
    h += _syncInfoCard('\uD83E\uDD16', t('sync.aiStatus'), aiLabel, aiClr);
    h += '</div>';

    // Adim gostergesi
    h += '<div style="display:flex;gap:4px;margin-bottom:28px;">';
    for (var si = 1; si <= 5; si++) {
        var active = si === st.step;
        var done = si < st.step;
        var clr = done ? '#34d399' : (active ? '#06b6d4' : '#334155');
        var icon = done ? '\u2714' : si;
        h += '<div style="flex:1;text-align:center;">';
        h += '<div style="width:32px;height:32px;border-radius:50%;background:' + clr + (active ? '' : '30') + ';color:' + (done || active ? '#fff' : '#64748b') + ';display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid ' + clr + ';">' + icon + '</div>';
        h += '<div style="font-size:9px;color:' + (active ? '#e2e8f0' : '#64748b') + ';margin-top:4px;font-weight:' + (active ? '700' : '500') + ';">' + t('sync.step' + si) + '</div>';
        h += '</div>';
        if (si < 5) h += '<div style="flex:0.3;display:flex;align-items:center;padding-bottom:18px;"><div style="width:100%;height:2px;background:' + (si < st.step ? '#34d399' : '#1e293b') + ';border-radius:1px;"></div></div>';
    }
    h += '</div>';

    // ADIM 1: Yedek
    if (st.step === 1) {
        h += '<div class="sync-step-panel">';
        h += '<div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:8px;">\uD83D\uDCBE ' + t('sync.step1') + '</div>';
        h += '<div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">' + t('sync.backupRequired') + '</div>';
        h += '<button onclick="_syncDoBackup()" class="sync-action-btn" style="background:#8b5cf6;">\uD83D\uDCBE ' + t('sync.backupBtn') + '</button>';
        // Yedek listesi
        if (backups.length > 0) {
            h += '<div style="margin-top:16px;"><details><summary style="color:#94a3b8;font-size:11px;cursor:pointer;">' + t('sync.backups') + ' (' + backups.length + ')</summary>';
            h += '<div style="margin-top:8px;max-height:150px;overflow-y:auto;">';
            backups.forEach(function(b) {
                h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;font-size:10px;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,0.04);">';
                h += '<span>' + b.name + '</span><span>' + (b.size / 1024 / 1024).toFixed(1) + ' MB</span>';
                h += '</div>';
            });
            h += '</div></details></div>';
        }
        h += '</div>';
    }

    // ADIM 2: Tarama
    if (st.step === 2) {
        h += '<div class="sync-step-panel">';
        h += '<div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:8px;">\uD83D\uDD0D ' + t('sync.step2') + '</div>';
        h += '<div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">114 sure siteden cekilip DB ile karsilastirilacak.</div>';
        // Claude key yapilandirmasi
        var cKeys = KeyManager.getKeys('claude');
        var hasClaude = cKeys.some(function(k) { return k.status === 'ok'; });
        h += '<div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:10px;padding:12px;margin-bottom:16px;">';
        h += '<div style="font-size:11px;font-weight:700;color:#a78bfa;margin-bottom:6px;">\uD83E\uDD16 ' + t('sync.claudeConfig') + '</div>';
        if (hasClaude) {
            h += '<div style="font-size:11px;color:#34d399;">\u2714 ' + t('sync.claudeKeyOk') + '</div>';
        } else {
            h += '<div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">' + t('sync.claudeKeyDesc') + '</div>';
            h += '<div style="display:flex;gap:8px;">';
            h += '<input id="sync-claude-key-input" type="password" placeholder="sk-ant-..." style="flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:#e2e8f0;font-size:11px;font-family:monospace;" />';
            h += '<button onclick="_syncAddClaudeKey()" class="sync-action-btn" style="background:#a78bfa;padding:6px 14px;font-size:11px;">' + t('sync.claudeKeyAdd') + '</button>';
            h += '</div>';
        }
        h += '</div>';
        if (!st.scanning) {
            h += '<button onclick="_syncDoScan()" class="sync-action-btn" style="background:#06b6d4;">\uD83D\uDD0D ' + t('sync.scanBtn') + '</button>';
        } else {
            h += '<div id="sync-scan-progress" style="margin-top:12px;"></div>';
        }
        // Onceki tarama sonuclari
        if (st.scanResults.length > 0) {
            h += '<div id="sync-scan-results" style="margin-top:16px;">';
            h += _syncRenderScanResults();
            h += '</div>';
        }
        h += '</div>';
    }

    // ADIM 3: Inceleme
    if (st.step === 3) {
        h += '<div class="sync-step-panel">';
        h += '<div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:8px;">\uD83D\uDCCB ' + t('sync.step3') + '</div>';
        h += _syncRenderScanResults();
        if (st.totalDiffs === 0) {
            h += '<div style="text-align:center;padding:32px;color:#34d399;font-size:14px;font-weight:700;">\u2714 ' + t('sync.noDiffs') + '</div>';
            h += '<button onclick="_syncState.step=5;_dbRenderSync();" class="sync-action-btn" style="background:#34d399;">Bildirim Adimina Gec \u2192</button>';
        } else {
            h += '<button onclick="_syncState.step=4;_dbRenderSync();" class="sync-action-btn" style="background:#f59e0b;margin-top:12px;">Duzeltme Adimina Gec \u2192</button>';
        }
        h += '</div>';
    }

    // ADIM 4: Duzeltme
    if (st.step === 4) {
        h += '<div class="sync-step-panel">';
        h += '<div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:8px;">\uD83D\uDD27 ' + t('sync.step4') + '</div>';
        h += '<div style="font-size:12px;color:#94a3b8;margin-bottom:12px;">' + t('sync.totalDiffs') + ': <strong style="color:#f59e0b;">' + st.totalDiffs + '</strong> | ' + t('sync.totalFixes') + ': <strong style="color:#06b6d4;">' + st.totalFixes + '</strong></div>';
        if (!st.fixing) {
            h += '<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:12px;margin-bottom:16px;font-size:11px;color:#fbbf24;">\u26A0 ' + t('sync.fixConfirm') + '</div>';
            h += '<button onclick="_syncDoFix()" class="sync-action-btn" style="background:#ef4444;">\uD83D\uDD27 ' + t('sync.fixBtn') + '</button>';
        } else {
            h += '<div id="sync-fix-progress" style="margin-top:12px;"></div>';
        }
        h += '</div>';
    }

    // ADIM 5: Bildirim
    if (st.step === 5) {
        h += '<div class="sync-step-panel">';
        h += '<div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:8px;">\uD83D\uDCE2 ' + t('sync.step5') + '</div>';
        h += '<div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">Islem tamamlandi. Bagli kullanicilara bildirim gondermek ister misiniz?</div>';
        h += '<div style="display:flex;gap:12px;">';
        h += '<button onclick="_syncDoNotify()" class="sync-action-btn" style="background:#34d399;">\uD83D\uDCE2 ' + t('sync.notifyBtn') + '</button>';
        h += '<button onclick="_syncReset()" class="sync-action-btn" style="background:#475569;">Bastan Basla</button>';
        h += '</div>';
        h += '</div>';
    }

    h += '</div>';
    // CSS
    h += '<style>';
    h += '.sync-step-panel{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin-bottom:16px;}';
    h += '.sync-action-btn{border:none;border-radius:10px;padding:10px 24px;color:#fff;font-weight:700;font-size:12px;cursor:pointer;transition:all 0.2s;letter-spacing:0.02em;}';
    h += '.sync-action-btn:hover{filter:brightness(1.2);transform:translateY(-1px);}';
    h += '.sync-diff-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;color:#cbd5e1;}';
    h += '.sync-badge{padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;letter-spacing:0.03em;}';
    h += '.sync-badge-ok{background:rgba(52,211,153,0.15);color:#34d399;}';
    h += '.sync-badge-diff{background:rgba(245,158,11,0.15);color:#fbbf24;}';
    h += '.sync-badge-err{background:rgba(239,68,68,0.15);color:#ef4444;}';
    h += '</style>';
    main.innerHTML = h;
};

var _syncInfoCard = (icon, label, value, color) => {
    return '<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;display:flex;align-items:center;gap:10px;">' +
        '<div style="width:36px;height:36px;border-radius:10px;background:' + color + '15;display:flex;align-items:center;justify-content:center;font-size:18px;">' + icon + '</div>' +
        '<div><div style="font-size:10px;color:#64748b;font-weight:600;">' + label + '</div>' +
        '<div style="font-size:14px;font-weight:800;color:#f1f5f9;">' + value + '</div></div></div>';
};

var _syncRenderScanResults = () => {
    var st = _syncState;
    var h = '';
    if (st.scanResults.length === 0) return h;
    // Ozet
    var totalOk = 0, totalDiff = 0, totalErr = 0;
    st.scanResults.forEach(function(r) {
        if (r.status === 'error') totalErr++;
        else if (r.diff_count > 0) totalDiff++;
        else totalOk++;
    });
    h += '<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">';
    h += '<div class="sync-badge sync-badge-ok">\u2714 Eslesme: ' + totalOk + '</div>';
    h += '<div class="sync-badge sync-badge-diff">\u26A0 Farkli: ' + totalDiff + '</div>';
    if (totalErr > 0) h += '<div class="sync-badge sync-badge-err">\u2716 Hata: ' + totalErr + '</div>';
    h += '<div style="font-size:10px;color:#94a3b8;display:flex;align-items:center;">' + t('sync.totalDiffs') + ': <strong style="color:#fbbf24;margin-left:4px;">' + st.totalDiffs + '</strong></div>';
    h += '</div>';
    // Tablo
    h += '<div style="max-height:400px;overflow-y:auto;border:1px solid rgba(255,255,255,0.06);border-radius:10px;">';
    h += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
    h += '<thead><tr style="background:rgba(255,255,255,0.03);position:sticky;top:0;">';
    h += '<th style="padding:8px;text-align:left;color:#94a3b8;font-weight:600;">#</th>';
    h += '<th style="padding:8px;text-align:left;color:#94a3b8;font-weight:600;">' + t('sync.surah') + '</th>';
    h += '<th style="padding:8px;text-align:center;color:#94a3b8;font-weight:600;">' + t('sync.fieldAyet') + '</th>';
    h += '<th style="padding:8px;text-align:center;color:#94a3b8;font-weight:600;">' + t('sync.fieldMeal') + '</th>';
    h += '<th style="padding:8px;text-align:center;color:#94a3b8;font-weight:600;">' + t('sync.fieldDipnot') + '</th>';
    h += '<th style="padding:8px;text-align:center;color:#94a3b8;font-weight:600;">' + t('sync.fieldTefsir') + '</th>';
    h += '<th style="padding:8px;text-align:center;color:#94a3b8;font-weight:600;">' + t('sync.parseMethod') + '</th>';
    h += '<th style="padding:8px;text-align:center;color:#94a3b8;font-weight:600;">' + t('sync.diffCount') + '</th>';
    h += '</tr></thead><tbody>';
    st.scanResults.forEach(function(r) {
        var bgc = r.status === 'error' ? 'rgba(239,68,68,0.05)' : (r.diff_count > 0 ? 'rgba(245,158,11,0.05)' : '');
        var tc = r.diff_count > 0 ? r.type_counts || {} : {};
        var pm = r.parse_method || 'builtin';
        var pmClr = pm === 'ai_extract' ? '#a78bfa' : (pm === 'generated' ? '#06b6d4' : '#64748b');
        var pmLabel = pm === 'ai_extract' ? 'AI' : (pm === 'generated' ? 'Gen' : 'Std');
        h += '<tr style="background:' + bgc + ';border-bottom:1px solid rgba(255,255,255,0.03);">';
        h += '<td style="padding:6px 8px;color:#64748b;">' + r.sure_no + '</td>';
        h += '<td style="padding:6px 8px;color:#e2e8f0;font-weight:600;">' + (r.slug || '') + '</td>';
        h += '<td style="padding:6px 8px;text-align:center;">' + _syncDiffBadge(tc, 'AYET') + '</td>';
        h += '<td style="padding:6px 8px;text-align:center;">' + _syncDiffBadge(tc, 'MEAL') + '</td>';
        h += '<td style="padding:6px 8px;text-align:center;">' + _syncDiffBadge(tc, 'DIPNOT') + '</td>';
        h += '<td style="padding:6px 8px;text-align:center;">' + _syncDiffBadge(tc, 'TEFSIR') + '</td>';
        h += '<td style="padding:6px 8px;text-align:center;"><span class="sync-badge" style="background:' + pmClr + '20;color:' + pmClr + ';">' + pmLabel + '</span></td>';
        h += '<td style="padding:6px 8px;text-align:center;font-weight:700;color:' + (r.diff_count > 0 ? '#fbbf24' : '#34d399') + ';">' + (r.status === 'error' ? '<span style="color:#ef4444;">HATA</span>' : r.diff_count) + '</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
};

var _syncDiffBadge = (tc, field) => {
    var cnt = (tc[field + '_FARKLI'] || 0) + (tc[field + '_BOS'] || 0) + (tc[field + '_EKSTRA'] || 0);
    if (cnt > 0) return '<span class="sync-badge sync-badge-diff">' + cnt + '</span>';
    return '<span style="color:#34d399;font-size:10px;">\u2714</span>';
};

// --- Sync Islemleri ---
window._syncDoBackup = async () => {
    try {
        var res = await authFetch('/api/sync/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        var data = await res.json();
        if (data.ok) {
            _syncState.backupDone = true;
            _syncState.step = 2;
            showToast('\uD83D\uDCBE ' + t('sync.backupSuccess') + ': ' + data.backup, 'success');
            _dbLoad();
        } else {
            showToast('\u274C ' + (data.error || 'Yedek hatasi'), 'warn');
        }
    } catch(e) { showToast('\u274C ' + e.message, 'warn'); }
};

window._syncDoScan = async () => {
    _syncState.scanning = true;
    _syncState.scanResults = [];
    _syncState.totalDiffs = 0;
    _syncState.totalFixes = 0;
    // Claude key'i backend'e gonder (varsa)
    var claudeKey = KeyManager.getKeys('claude').find(function(k) { return k.status === 'ok' || k.status === 'pending'; });
    if (claudeKey) {
        try { await authFetch('/api/sync/ai-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: claudeKey.key }) }); } catch(e) {}
    }
    _dbRenderSync();
    var progEl = document.getElementById('sync-scan-progress');
    for (var sn = 1; sn <= 114; sn++) {
        if (progEl) {
            var pct = Math.round(sn / 114 * 100);
            progEl.innerHTML = '<div style="margin-bottom:6px;font-size:11px;color:#94a3b8;">' + t('sync.scanning') + '... ' + t('sync.progress').replace('{current}', sn).replace('{total}', '114') + '</div>' +
                '<div style="width:100%;height:6px;background:#1e293b;border-radius:3px;overflow:hidden;">' +
                '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#06b6d4,#34d399);border-radius:3px;transition:width 0.3s;"></div></div>';
        }
        try {
            var res = await authFetch('/api/sync/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sure_no: sn }) });
            var r = await res.json();
            _syncState.scanResults.push(r);
            _syncState.totalDiffs += (r.diff_count || 0);
            _syncState.totalFixes += (r.fix_count || 0);
        } catch(e) {
            _syncState.scanResults.push({ sure_no: sn, slug: '?', status: 'error', error: e.message, diff_count: 0, fix_count: 0, type_counts: {} });
        }
    }
    _syncState.scanning = false;
    _syncState.step = 3;
    showToast('\uD83D\uDD0D ' + t('sync.scanComplete') + ' — ' + t('sync.diffsFound').replace('{count}', _syncState.totalDiffs), _syncState.totalDiffs > 0 ? 'warn' : 'success');
    _dbRenderSync();
};

window._syncDoFix = async () => {
    _syncState.fixing = true;
    _dbRenderSync();
    var progEl = document.getElementById('sync-fix-progress');
    var suresWithDiffs = _syncState.scanResults.filter(function(r) { return r.fix_count > 0; });
    var totalUpdated = 0;
    for (var i = 0; i < suresWithDiffs.length; i++) {
        var sr = suresWithDiffs[i];
        if (progEl) {
            var pct = Math.round((i + 1) / suresWithDiffs.length * 100);
            progEl.innerHTML = '<div style="margin-bottom:6px;font-size:11px;color:#94a3b8;">' + t('sync.fixingAll') + ' ' + (i + 1) + '/' + suresWithDiffs.length + ' — ' + sr.slug + '</div>' +
                '<div style="width:100%;height:6px;background:#1e293b;border-radius:3px;overflow:hidden;">' +
                '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444);border-radius:3px;transition:width 0.3s;"></div></div>';
        }
        try {
            var res = await authFetch('/api/sync/fix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sure_no: sr.sure_no }) });
            var data = await res.json();
            totalUpdated += (data.updated || 0);
        } catch(e) { /* devam */ }
    }
    _syncState.fixing = false;
    _syncState.step = 5;
    showToast('\u2714 ' + t('sync.fixSuccess').replace('{count}', totalUpdated), 'success');
    _dbRenderSync();
};

window._syncDoNotify = async () => {
    try {
        var res = await authFetch('/api/sync/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Veritabani guncellendi, lütfen sayfayi yenileyiniz.', total_fixes: _syncState.totalFixes }) });
        var data = await res.json();
        if (data.ok) {
            showToast('\uD83D\uDCE2 ' + t('sync.notifySuccess').replace('{count}', data.notified), 'success');
        }
    } catch(e) { showToast('\u274C ' + e.message, 'warn'); }
};

window._syncReset = () => {
    _syncState = { step: 1, backupDone: false, scanResults: [], totalDiffs: 0, totalFixes: 0, scanning: false, fixing: false, aiStatus: null };
    _dbLoad();
};

// --- AI Parser Durumu ---
window._syncLoadAIStatus = async () => {
    try {
        var res = await authFetch('/api/sync/parser-status');
        if (res.ok) { _syncState.aiStatus = await res.json(); _dbRenderSync(); }
    } catch(e) {}
};

// --- Claude Key Ekleme ---
window._syncAddClaudeKey = async () => {
    var input = document.getElementById('sync-claude-key-input');
    if (!input) return;
    var key = input.value.trim();
    if (!key) return;
    input.disabled = true;
    var result = await KeyManager.testKey(key, 'claude');
    if (result.ok) {
        KeyManager.addKey(key, 'claude');
        KeyManager.updateStatus(key, 'ok');
        showToast('\u2714 ' + t('sync.claudeKeyOk'), 'success');
        _syncLoadAIStatus();
    } else {
        showToast('\u274C ' + t('sync.claudeKeyFail') + ': ' + (result.error || ''), 'warn');
    }
    input.disabled = false;
    input.value = '';
};
