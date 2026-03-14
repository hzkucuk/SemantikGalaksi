// --- Veri Seti Yöneticisi ---
window.toggleDipnot = () => {
    var div = document.getElementById('hud-dipnot');
    div.classList.toggle('hidden');
};
window.showDipnotPopup = (btn, nodeId) => {
    var item = btn.closest('.ayah-list-item');
    var existing = item.querySelector('.dipnot-inline');
    if (existing) { existing.remove(); return; }
    // Diğer açık dipnotları kapat
    document.querySelectorAll('.dipnot-inline').forEach(el => el.remove());
    var node = nodes.find(n => n.id === nodeId);
    var text = node?.dipnot || t('hud.noDipnot');
    var div = document.createElement('div');
    div.className = 'dipnot-inline';
    div.style.cssText = 'margin-top:8px;padding:10px 14px;background:rgba(120,53,15,0.3);border:1px solid rgba(245,158,11,0.2);border-radius:10px;font-size:12px;color:rgba(253,230,138,0.8);font-style:italic;line-height:1.6;';
    div.textContent = text;
    item.appendChild(div);
};
window.openDatasets = async () => {
    document.getElementById('dataset-overlay').style.display = 'flex';
    await renderDatasetList();
};
window.closeDatasets = () => { document.getElementById('dataset-overlay').style.display = 'none'; };
var renderDatasetList = async () => {
    var list = document.getElementById('dataset-list');
    var datasets = await DatasetStore.getAll();
    var isViewer = authRole === 'viewer';
    var html = `<div class="ds-item ${activeDatasetName === 'quran_data.json' ? 'active' : ''}" onclick="switchDataset('__original__')">
        <span style="font-size:20px">📄</span>
        <div class="flex-1">
            <div class="text-sm font-bold text-white">quran_data.json</div>
            <div class="text-[10px] text-slate-500">Orijinal veri seti</div>
        </div>
        ${activeDatasetName === 'quran_data.json' ? '<span class="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">● Aktif</span>' : ''}
        <button onclick="event.stopPropagation();downloadJSON(originalData,'quran_data.json')" class="key-btn" title="İndir" style="color:#38bdf8;border-color:rgba(56,189,248,0.3);">⬇</button>
    </div>`;
    datasets.forEach(d => {
        var esc = d.name.replace(/'/g, "\\'");
        var nc = d.nodeCount || d.data?.nodes?.length || 0;
        var who = d.modifiedBy ? ` · ✏️ ${d.modifiedBy}` : '';
        var sizeStr = d.sizeKB ? ` · ${d.sizeKB >= 1024 ? (d.sizeKB / 1024).toFixed(1) + ' MB' : d.sizeKB + ' KB'}` : '';
        html += `<div class="ds-item ${activeDatasetName === d.name ? 'active' : ''}" onclick="switchDataset('${esc}')">
            <span style="font-size:20px">📁</span>
            <div class="flex-1">
                <div class="text-sm font-bold text-white">${d.name}</div>
                <div class="text-[10px] text-slate-500">${d.date || ''} · ${nc} ayet${sizeStr}${who}</div>
            </div>
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
                ${activeDatasetName === d.name ? '<span class="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">● Aktif</span>' : ''}
                <button onclick="event.stopPropagation();downloadDataset('${esc}')" class="key-btn" title="İndir" style="color:#38bdf8;border-color:rgba(56,189,248,0.3);font-size:11px;padding:4px 7px;">⬇</button>
                ${!isViewer ? `<button onclick="event.stopPropagation();renameDataset('${esc}')" class="key-btn" title="Yeniden Adlandır" style="color:#a78bfa;border-color:rgba(167,139,250,0.3);font-size:11px;padding:4px 7px;">✏️</button>` : ''}
                ${!isViewer ? `<button onclick="event.stopPropagation();duplicateDataset('${esc}')" class="key-btn" title="Çoğalt" style="color:#34d399;border-color:rgba(52,211,153,0.3);font-size:11px;padding:4px 7px;">📋</button>` : ''}
                ${!isViewer ? `<button onclick="event.stopPropagation();deleteDataset('${esc}')" class="key-btn" title="Sil" style="font-size:11px;padding:4px 7px;">🗑</button>` : ''}
            </div>
        </div>`;
    });
    if (datasets.length === 0) html += '<p class="text-xs text-slate-600 italic text-center py-4 mt-2">Henüz harici veri seti yüklenmedi.<br>Üst menüden "VERİ OKU" ile JSON yükleyin.</p>';
    list.innerHTML = html;
};
window.switchDataset = async (name) => {
    if (name === '__original__') {
        resetToOriginal();
    } else {
        var ds = await DatasetStore.get(name);
        if (ds) { activeDatasetName = name; processData(ds.data); hasCustomData = true; }
    }
    await renderDatasetList();
};
window.deleteDataset = async (name) => {
    if (!confirm('"' + name + '" ' + t('common.close') + '?')) return;
    await DatasetStore.remove(name);
    if (activeDatasetName === name) resetToOriginal();
    await renderDatasetList();
};
window.renameDataset = async (oldName) => {
    var newName = prompt('Yeni dosya adı:', oldName.replace('.json', ''));
    if (!newName || newName.trim() === '' || newName.trim() + '.json' === oldName) return;
    var finalName = newName.trim().endsWith('.json') ? newName.trim() : newName.trim() + '.json';
    if (isDesktopMode) {
        var r = await authFetch('/api/dataset-rename', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName: finalName })
        });
        var data = await r.json();
        if (!r.ok) { alert(data.error || 'Hata'); return; }
        if (activeDatasetName === oldName) activeDatasetName = finalName;
    } else {
        var ds = await DatasetStore.get(oldName);
        if (ds) {
            await DatasetStore.save(finalName, ds.data);
            await DatasetStore.remove(oldName);
            if (activeDatasetName === oldName) activeDatasetName = finalName;
        }
    }
    await renderDatasetList();
};
window.duplicateDataset = async (sourceName) => {
    var base = sourceName.replace('.json', '');
    var newName = prompt('Kopya dosya adı:', base + '_kopya');
    if (!newName || newName.trim() === '') return;
    var finalName = newName.trim().endsWith('.json') ? newName.trim() : newName.trim() + '.json';
    if (isDesktopMode) {
        var r = await authFetch('/api/dataset-duplicate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceName, newName: finalName })
        });
        var data = await r.json();
        if (!r.ok) { alert(data.error || 'Hata'); return; }
    } else {
        var ds = await DatasetStore.get(sourceName);
        if (ds) await DatasetStore.save(finalName, ds.data);
    }
    await renderDatasetList();
};

// --- JSON Editör ---
var editorActiveTab = 'data';
var editorDataContent = '';
var editorRootsContent = '';
var editorLocaleContents = {}; // { 'EN-en': '...json string...', ... }

window.openEditor = async () => {
    var data;
    if (activeDatasetName === 'quran_data.json') {
        data = originalData;
    } else {
        var ds = await DatasetStore.get(activeDatasetName);
        data = ds ? ds.data : originalData;
    }
    if (!data) return;
    editorActiveTab = 'data';
    editorDataContent = JSON.stringify(data, null, 2);
    editorRootsContent = JSON.stringify(rootDictionary || {}, null, 2);
    // Locale dosyalarını yükle
    editorLocaleContents = {};
    var tabsContainer = document.getElementById('editor-tabs');
    var localeTabsHtml = '';
    if (typeof I18n !== 'undefined' && I18n.getAvailable) {
        var langs = I18n.getAvailable();
        for (var i = 0; i < langs.length; i++) {
            var lang = langs[i];
            if (lang.code === 'TR-tr') continue;
            if (lang.code.toLowerCase().indexOf('roots') !== -1) continue;
            try {
                var resp = await fetch('locales/' + lang.code + '.json');
                if (resp.ok) {
                    var txt = await resp.text();
                    editorLocaleContents[lang.code] = txt;
                    localeTabsHtml += '<button class="editor-tab" id="editor-tab-locale-' + lang.code + '" onclick="editorSwitchTab(\'locale-' + lang.code + '\')"><span class="tab-dot"></span>' + lang.flag + ' ' + lang.code + '.json</button>';
                }
            } catch(e) {}
        }
    }
    tabsContainer.innerHTML = '<button class="editor-tab active" id="editor-tab-data" onclick="editorSwitchTab(\'data\')"><span class="tab-dot"></span>' + activeDatasetName + '</button>' +
        '<button class="editor-tab" id="editor-tab-roots" onclick="editorSwitchTab(\'roots\')"><span class="tab-dot"></span>quran_roots.json</button>' +
        localeTabsHtml;
    var ta = document.getElementById('editor-textarea');
    ta.value = editorDataContent;
    document.getElementById('editor-title').textContent = '📝 ' + activeDatasetName;
    document.getElementById('json-editor').style.display = 'flex';
    editorUpdateTabUI();
    updateEditorLines();
    editorValidate();
    ta.oninput = () => { updateEditorLines(); editorValidate(); };
    ta.onscroll = () => { document.getElementById('editor-lines').scrollTop = ta.scrollTop; };
};

window.editorSwitchTab = (tab) => {
    if (tab === editorActiveTab) return;
    var ta = document.getElementById('editor-textarea');
    if (editorActiveTab === 'data') editorDataContent = ta.value;
    else if (editorActiveTab === 'roots') editorRootsContent = ta.value;
    else if (editorActiveTab.startsWith('locale-')) editorLocaleContents[editorActiveTab.replace('locale-', '')] = ta.value;
    editorActiveTab = tab;
    if (tab === 'data') ta.value = editorDataContent;
    else if (tab === 'roots') ta.value = editorRootsContent;
    else if (tab.startsWith('locale-')) ta.value = editorLocaleContents[tab.replace('locale-', '')] || '{}';
    var titleText = tab === 'data' ? activeDatasetName : tab === 'roots' ? 'quran_roots.json' : tab.replace('locale-', '') + '.json';
    document.getElementById('editor-title').textContent = '📝 ' + titleText;
    document.querySelectorAll('#editor-tabs .editor-tab').forEach(function(btn) { btn.classList.remove('active'); });
    var activeBtn = tab === 'data' ? document.getElementById('editor-tab-data') :
                    tab === 'roots' ? document.getElementById('editor-tab-roots') :
                    document.getElementById('editor-tab-locale-' + tab.replace('locale-', ''));
    if (activeBtn) activeBtn.classList.add('active');
    editorUpdateTabUI();
    updateEditorLines();
    editorValidate();
    ta.scrollTop = 0;
    document.getElementById('editor-lines').scrollTop = 0;
};

var editorUpdateTabUI = () => {
    var dipnotBtn = document.querySelector('[onclick="editorAddDipnot()"]');
    if (dipnotBtn) dipnotBtn.style.display = editorActiveTab === 'data' ? '' : 'none';
};
window.closeEditor = () => { document.getElementById('json-editor').style.display = 'none'; };
var updateEditorLines = () => {
    var ta = document.getElementById('editor-textarea');
    var count = ta.value.split('\n').length;
    var div = document.getElementById('editor-lines');
    var h = '';
    for (var i = 1; i <= count; i++) h += '<div style="padding:0 8px;">' + i + '</div>';
    div.innerHTML = h;
    div.scrollTop = ta.scrollTop;
};
window.editorValidate = () => {
    var ta = document.getElementById('editor-textarea');
    var bar = document.getElementById('editor-status');
    var msg = document.getElementById('editor-msg');
    var info = document.getElementById('editor-info');
    try {
        var data = JSON.parse(ta.value);
        if (editorActiveTab === 'data') {
            var nc = data.nodes ? data.nodes.length : 0;
            bar.className = 'editor-status valid';
            msg.textContent = t('editor.validJson');
            info.textContent = nc + ' ' + t('hud.verse').toLowerCase() + ' · ' + ta.value.length.toLocaleString() + ' ' + t('editor.chars');
        } else if (editorActiveTab === 'roots') {
            var rc = typeof data === 'object' ? Object.keys(data).length : 0;
            bar.className = 'editor-status valid';
            msg.textContent = t('editor.validJson');
            info.textContent = rc + ' ' + t('analyzer.root').toLowerCase() + ' · ' + ta.value.length.toLocaleString() + ' ' + t('editor.chars');
        } else {
            var kc = typeof data === 'object' ? Object.keys(data).length : 0;
            bar.className = 'editor-status valid';
            msg.textContent = t('editor.validJson');
            info.textContent = kc + ' key · ' + ta.value.length.toLocaleString() + ' ' + t('editor.chars');
        }
        return true;
    } catch(e) {
        bar.className = 'editor-status invalid';
        var m = e.message.match(/position (\d+)/);
        if (m) {
            var line = ta.value.substring(0, parseInt(m[1])).split('\n').length;
            msg.textContent = t('editor.errorLine').replace('{line}', line) + ': ' + e.message;
        } else {
            msg.textContent = '✗ ' + e.message;
        }
        info.textContent = '';
        return false;
    }
};
window.editorFormat = () => {
    var ta = document.getElementById('editor-textarea');
    try {
        ta.value = JSON.stringify(JSON.parse(ta.value), null, 2);
        updateEditorLines();
        editorValidate();
    } catch(e) { editorValidate(); }
};
window.editorSave = async () => {
    if (!editorValidate()) return;
    var ta = document.getElementById('editor-textarea');
    var data = JSON.parse(ta.value);
    if (editorActiveTab === 'roots') {
        rootDictionary = data;
        var btn = document.querySelector('.editor-btn.save');
        btn.textContent = '✓ Kökler Güncellendi';
        setTimeout(() => { btn.textContent = '💾 Kaydet'; }, 1500);
        return;
    }
    if (editorActiveTab.startsWith('locale-')) {
        var localeCode = editorActiveTab.replace('locale-', '');
        var localeFile = localeCode + '.json';
        editorLocaleContents[localeCode] = ta.value;
        if (isDesktopMode) {
            try {
                var r = await authFetch('/api/locale/' + encodeURIComponent(localeFile), {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: ta.value
                });
                if (!r.ok) { var err = await r.json(); alert(err.error || 'Hata'); return; }
            } catch(e) { alert('Kaydetme hatasi: ' + e.message); return; }
        }
        if (typeof I18n !== 'undefined' && I18n.updateTranslation) {
            I18n.updateTranslation(localeCode, data);
        }
        var btn = document.querySelector('.editor-btn.save');
        btn.textContent = '✓ ' + localeFile + ' Güncellendi';
        setTimeout(() => { btn.textContent = '💾 Kaydet'; }, 1500);
        return;
    }
    var saveName = activeDatasetName;
    if (activeDatasetName === 'quran_data.json') {
        saveName = 'quran_data_düzenlenmiş.json';
        activeDatasetName = saveName;
        document.getElementById('editor-title').textContent = '📝 ' + saveName;
        var dataTab = document.getElementById('editor-tab-data');
        if (dataTab) dataTab.innerHTML = '<span class="tab-dot"></span>' + saveName;
    }
    await DatasetStore.save(saveName, data);
    processData(data);
    hasCustomData = true;
    var btn = document.querySelector('.editor-btn.save');
    btn.textContent = '✓ Kaydedildi';
    setTimeout(() => { btn.textContent = '💾 Kaydet'; }, 1500);
};
window.editorAddDipnot = () => {
    var ta = document.getElementById('editor-textarea');
    try {
        var data = JSON.parse(ta.value);
        if (!data.nodes) return;
        var count = 0;
        data.nodes.forEach(n => { if (!n.hasOwnProperty('dipnot')) { n.dipnot = ''; count++; } });
        ta.value = JSON.stringify(data, null, 2);
        updateEditorLines();
        editorValidate();
        var btn = document.querySelector('[onclick="editorAddDipnot()"]');
        btn.textContent = '✓ ' + count + ' ayete eklendi';
        setTimeout(() => { btn.textContent = '📌 Dipnot Ekle'; }, 2000);
    } catch(e) { editorValidate(); }
};

// --- Dışa Aktarma ---
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
window.editorExport = async () => {
    var ta = document.getElementById('editor-textarea');
    try {
        var data = JSON.parse(ta.value);
        var filename = editorActiveTab === 'data' ? activeDatasetName :
                       editorActiveTab === 'roots' ? 'quran_roots.json' :
                       editorActiveTab.replace('locale-', '') + '.json';
        await downloadJSON(data, filename);
    } catch(e) { editorValidate(); }
};
window.downloadDataset = async (name) => {
    var ds = await DatasetStore.get(name);
    if (ds) await downloadJSON(ds.data, name);
};

// --- Arapça Sanal Klavye ---
window.toggleArabicKb = () => {
    var kb = document.getElementById('arabic-kb');
    kb.classList.toggle('show');
    document.getElementById('kb-toggle').style.borderColor = kb.classList.contains('show') ? '#00f2ff' : '';
};
window.kbInsert = (ch) => {
    var ta = document.getElementById('editor-textarea');
    var s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.substring(0, s) + ch + ta.value.substring(e);
    ta.selectionStart = ta.selectionEnd = s + ch.length;
    ta.focus();
    updateEditorLines();
    editorValidate();
};
window.kbBackspace = () => {
    var ta = document.getElementById('editor-textarea');
    var s = ta.selectionStart, e = ta.selectionEnd;
    if (s !== e) {
        ta.value = ta.value.substring(0, s) + ta.value.substring(e);
        ta.selectionStart = ta.selectionEnd = s;
    } else if (s > 0) {
        ta.value = ta.value.substring(0, s - 1) + ta.value.substring(s);
        ta.selectionStart = ta.selectionEnd = s - 1;
    }
    ta.focus();
    updateEditorLines();
    editorValidate();
};

window.showApiKeyGuide = () => {
    document.getElementById('settings-overlay').style.display = 'flex';
    document.getElementById('api-key-guide').classList.remove('hidden');
    renderKeyList();
};
var renderKeyList = () => {
    var list = document.getElementById('api-key-list');
    var keys = KeyManager.getKeys();
    if (keys.length === 0) {
        list.innerHTML = '<p class="text-[11px] text-slate-700 italic text-center py-4">Henüz API anahtarı eklenmedi.</p>';
        return;
    }
    list.innerHTML = keys.map(k => {
        var masked = k.key.substring(0, 8) + '••••••••' + k.key.slice(-4);
        var statusCls = k.status === 'ok' ? 'ok' : k.status === 'fail' ? 'fail' : 'pending';
        var statusText = k.status === 'ok' ? t('apikey.active') : k.status === 'fail' ? t('apikey.error') : t('apikey.pending');
        var errorHint = k.status === 'fail' && k.error ? `<div style="font-size:9px;color:#f87171;margin-top:2px;word-break:break-all">${k.error}</div>` : '';
        return `
            <div class="key-item ${k.status === 'ok' ? 'active' : ''}">
                <span class="key-text">${masked}</span>
                <span class="key-status ${statusCls}">${statusText}</span>
                <button class="key-btn" onclick="removeApiKey('${k.key}')" title="Sil">🗑</button>
                ${errorHint}
            </div>`;
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
