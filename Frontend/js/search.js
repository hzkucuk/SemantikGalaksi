// Arapça klavye fonksiyonları (arama çubuğu)
window.toggleSearchKb = () => {
    var kb = document.getElementById('search-arabic-kb');
    var btn = document.getElementById('search-kb-btn');
    var input = document.getElementById('search-input');
    kb.classList.toggle('show');
    btn.classList.toggle('active');
    input.classList.toggle('arabic-mode');
    if (kb.classList.contains('show')) {
        input.setAttribute('dir', 'rtl');
        input.placeholder = '...عربي بحث';
    } else {
        input.setAttribute('dir', 'ltr');
        input.placeholder = 'Sure, koordinat, meal veya Arapça ara...';
    }
    input.focus();
};
window.skbInsert = (ch) => {
    var input = document.getElementById('search-input');
    var s = input.selectionStart, e = input.selectionEnd;
    input.value = input.value.substring(0, s) + ch + input.value.substring(e);
    input.selectionStart = input.selectionEnd = s + ch.length;
    input.focus();
    input.dispatchEvent(new Event('input'));
};
window.skbBackspace = () => {
    var input = document.getElementById('search-input');
    var s = input.selectionStart, e = input.selectionEnd;
    if (s !== e) { input.value = input.value.substring(0, s) + input.value.substring(e); input.selectionStart = input.selectionEnd = s; }
    else if (s > 0) { input.value = input.value.substring(0, s - 1) + input.value.substring(s); input.selectionStart = input.selectionEnd = s - 1; }
    input.focus();
    input.dispatchEvent(new Event('input'));
};

// HUD Arapça klavye fonksiyonları
window.toggleHudKb = () => {
    var kb = document.getElementById('hud-arabic-kb');
    var btn = document.getElementById('hud-kb-btn');
    var input = document.getElementById('hud-search');
    kb.style.display = kb.style.display === 'block' ? 'none' : 'block';
    var active = kb.style.display === 'block';
    btn.style.background = active ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.04)';
    btn.style.borderColor = active ? 'rgba(0,242,255,0.3)' : 'rgba(255,255,255,0.1)';
    btn.style.color = active ? '#00f2ff' : 'rgba(255,255,255,0.35)';
    if (active) { input.setAttribute('dir', 'rtl'); input.style.fontFamily = "'Amiri', serif"; input.style.fontSize = '14px'; }
    else { input.setAttribute('dir', 'ltr'); input.style.fontFamily = ''; input.style.fontSize = ''; }
    input.focus();
};
window.hudKbInsert = (ch) => {
    var input = document.getElementById('hud-search');
    var s = input.selectionStart, e = input.selectionEnd;
    input.value = input.value.substring(0, s) + ch + input.value.substring(e);
    input.selectionStart = input.selectionEnd = s + ch.length;
    input.focus();
    input.dispatchEvent(new Event('input'));
};
window.hudKbBackspace = () => {
    var input = document.getElementById('hud-search');
    var s = input.selectionStart, e = input.selectionEnd;
    if (s !== e) { input.value = input.value.substring(0, s) + input.value.substring(e); input.selectionStart = input.selectionEnd = s; }
    else if (s > 0) { input.value = input.value.substring(0, s - 1) + input.value.substring(s); input.selectionStart = input.selectionEnd = s - 1; }
    input.focus();
    input.dispatchEvent(new Event('input'));
};

document.getElementById('search-input').oninput = (e) => {
    var qRaw = e.target.value.trim();
    var results = document.getElementById('search-results');
    if (qRaw.length < 1) { results.style.display = 'none'; return; }
    var normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u00e2\u00e0\u00e1]/g, 'a').replace(/[\u00ee\u00ef\u00ec\u00ed]/g, 'i').replace(/[\u00fb\u00fc\u00f9\u00fa]/g, 'u').replace(/[\u00f4\u00f6\u00f2\u00f3]/g, 'o').replace(/[\u00ea\u00eb\u00e8\u00e9]/g, 'e');
    var qNorm = normalize(qRaw);
    var parts = qRaw.split(/[\s:]+/);
    var searchSurah = parts[0]; var searchAyah = parts[1] || "";
    var finalResults = [];
    var matchCounts = { total: 0, surahs: new Set() };
    var arabicQuery = isArabic(qRaw);

    if (arabicQuery) {
        var qAr = normalizeArabic(qRaw);
        nodes.forEach(n => {
            var textNorm = normalizeArabic(n.text || '');
            var rootsJoined = (n.roots || []).map(r => normalizeArabic(r.replace(/\s/g, ''))).join(' ');
            if (textNorm.includes(qAr) || rootsJoined.includes(qAr)) {
                if (!finalResults.find(r => r.id === n.id)) {
                    var matchedRoots = (n.roots || []).filter(r => normalizeArabic(r.replace(/\s/g, '')).includes(qAr));
                    var sub = matchedRoots.length > 0
                        ? '🔤 ' + matchedRoots.join(' · ')
                        : (n.text || '').substring(0, 60) + '...';
                    finalResults.push({ id: n.id, label: `${getSurahTR(n.id)} ${n.id.split(':')[1]}`, sub: sub, arabicText: (n.text || '').substring(0, 50), type: 'ayah' });
                    matchCounts.total++; matchCounts.surahs.add(n.id.split(':')[0]);
                }
            }
        });
    } else {
        Object.keys(surahNamesTR).forEach(id => {
            var sNameNorm = normalize(surahNamesTR[id]);
            if (id === searchSurah || sNameNorm.includes(qNorm)) {
                if (searchAyah) {
                    var fullId = `${id}:${searchAyah}`;
                    var ayahNode = nodes.find(n => n.id === fullId);
                    if (ayahNode) { finalResults.push({ id: fullId, label: `${surahNamesTR[id]} ${searchAyah}`, sub: t('search.verse'), type: 'ayah' }); matchCounts.total++; matchCounts.surahs.add(id); }
                } else finalResults.push({ id: id, label: `${surahNamesTR[id]}`, sub: t('search.surah'), type: 'surah' });
            }
        });
        nodes.filter(n => normalize(n.translation).includes(qNorm)).forEach(n => {
            if (!finalResults.find(r => r.id === n.id)) finalResults.push({ id: n.id, label: `${getSurahTR(n.id)} ${n.id.split(':')[1]}`, sub: n.translation.substring(0, 50) + "...", type: 'ayah' });
            matchCounts.total++; matchCounts.surahs.add(n.id.split(':')[0]);
        });
    }
    if (finalResults.length > 0) {
        var statsHtml = `<div class="search-stats-bar"><span>🔍 ${t('search.resultVerse', {count: matchCounts.total})}</span><span>📍 ${t('search.resultSurah', {count: matchCounts.surahs.size})}</span></div>`;
        results.innerHTML = statsHtml + finalResults.slice(0, 200).map(r => `
            <div class="search-item" onmousedown="selectSearch('${r.id}', '${r.type}')">
                <div class="flex flex-col">
                    <span class="font-bold text-slate-100 text-sm ${arabicQuery ? '' : 'uppercase italic'}">${r.label}</span>
                    ${r.arabicText ? `<span class="text-[13px] text-amber-200/70 mt-1" style="font-family:'Amiri',serif;direction:rtl;">${r.arabicText}</span>` : ''}
                    <span class="text-[9px] text-cyan-500 font-bold opacity-60 mt-0.5 tracking-wider" ${r.sub.startsWith('🔤') ? 'style="font-family:\'Amiri\',serif;font-size:12px;direction:rtl;"' : ''}>${r.sub}</span>
                </div>
            </div>`).join('');
        results.style.display = 'block';
    } else results.style.display = 'none';
};
window.selectSearch = (targetId, type) => {
    var t = (type === 'ayah') ? nodes.find(n => n.id === targetId) : nodes.find(n => n.id.split(':')[0] === targetId);
    if (t) { warpTo(t); document.getElementById('search-results').style.display = 'none'; }
};

document.getElementById('file-input').onchange = (e) => {
    var file = e.target.files[0];
    if (!file) return;
    var fname = file.name;
    var r = new FileReader();
    r.onload = async (ev) => {
        try {
            var data = JSON.parse(ev.target.result);
            await DatasetStore.save(fname, data);
            activeDatasetName = fname;
            processData(data);
            hasCustomData = true;
        } catch(err) { alert(t('search.invalidJson') + ': ' + err.message); }
    };
    r.readAsText(file);
    e.target.value = '';
};
window.resetToOriginal = () => {
    if (!originalData) return;
    activeDatasetName = 'quran_data.json';
    processData(originalData);
    hasCustomData = false;
};
