var clampTooltip = (tooltip, x, y) => {
    var tw = tooltip.offsetWidth; var th = tooltip.offsetHeight;
    var vw = window.innerWidth; var vh = window.innerHeight;
    var tx = x + 25; var ty = y + 25;
    if (tx + tw > vw - 16) tx = vw - tw - 16;
    if (ty + th > vh - 16) ty = vh - th - 16;
    if (tx < 16) tx = 16; if (ty < 16) ty = 16;
    tooltip.style.left = tx + 'px'; tooltip.style.top = ty + 'px';
};

var buildTooltipContent = (n, showCloseBtn) => {
    var highlightedText = highlightArabicText(n.text, n.roots);
    var rootsHtml = (n.roots || []).map((r, ri) => {
        var color = getRootCSSColor(r, ri);
        var info = getRootInfo(r);
        var meaning = info ? info.meaning : '';
        return `
            <div class="mini-root-tag" onclick="toggleRootDetail('${r}', this)" style="color: ${color}; border-color: ${color.replace('hsl', 'hsla').replace(')', ', 0.4)')}">
                <span class="text-[18px] font-bold">${r}</span>
                <span class="mini-root-pron">${getRootPron(r)}</span>
                ${meaning ? `<span class="mini-root-meaning">${meaning}</span>` : ''}
            </div>`;
    }).join('');
    var closeBtn = showCloseBtn ? `<button onclick="event.stopPropagation(); closeHudTooltip()" style="position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.2s;z-index:10;" onmouseenter="this.style.color='#fff';this.style.borderColor='#00f2ff';this.style.background='rgba(0,242,255,0.15)'" onmouseleave="this.style.color='#94a3b8';this.style.borderColor='rgba(255,255,255,0.15)';this.style.background='rgba(255,255,255,0.05)'">✕</button>` : '';
    return `
        ${closeBtn}
        <div class='tooltip-header'><span class='text-[10px] font-black text-cyan-400 uppercase tracking-widest italic'>${getSurahTR(n.id)} ${n.id.split(':')[1]}</span></div>
        <p class='text-right arabic-text text-xl text-white mb-2' dir='rtl' style='word-break:break-word;overflow-wrap:break-word;'>${highlightedText}</p>
        <div class="flex flex-wrap gap-1 mb-1">
            ${rootsHtml}
        </div>
        <div id="root-detail-container"></div>
        <div class='h-px w-full bg-cyan-400/20 my-3'></div>
        <p class='text-[13px] leading-relaxed text-slate-300 italic' style='word-break:break-word;overflow-wrap:break-word;'>${n.translation}</p>
    `;
};

var showTooltip = (n, x, y) => {
    var tooltip = document.getElementById('tooltip');
    if (lastHoveredId === n.id) { if (!tooltip.matches(':hover')) clampTooltip(tooltip, x, y); return; }
    hudTooltipPinned = false;
    lastHoveredId = n.id;
    tooltip.innerHTML = buildTooltipContent(n, false);
    tooltip.style.display = 'block';
    tooltip.style.pointerEvents = 'auto';
    clampTooltip(tooltip, x, y);
};

var showHudItemTooltip = (n) => {
    var tooltip = document.getElementById('tooltip');
    var hudPanel = document.getElementById('hud-panel');
    if (lastHoveredId === n.id && hudTooltipPinned) return;
    hudTooltipPinned = true;
    lastHoveredId = n.id;
    tooltip.innerHTML = buildTooltipContent(n, true);
    tooltip.style.display = 'block';
    tooltip.style.pointerEvents = 'auto';
    var hr = hudPanel.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var tx, ty;
    if (hr.right + 440 < vw) {
        tx = hr.right + 12;
    } else if (hr.left > 440) {
        tx = hr.left - tooltip.offsetWidth - 12;
    } else {
        tx = Math.max(16, (vw - 420) / 2);
    }
    ty = hr.top + 60;
    var th = tooltip.offsetHeight;
    if (ty + th > vh - 16) ty = vh - th - 16;
    if (ty < 16) ty = 16;
    if (tx < 16) tx = 16;
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
};
window.showHudItemTooltip = showHudItemTooltip;

var showLineTooltip = (pair, x, y) => {
    var tooltip = document.getElementById('tooltip');
    var rootColor = getRootCSSColor(pair.root);
    var rootPron = getRootPron(pair.root);
    var s1 = pair.n1.split(':'); var s2 = pair.n2.split(':');
    var name1 = `${surahNamesTR[s1[0]]} ${s1[0]}:${s1[1]}`;
    var name2 = `${surahNamesTR[s2[0]]} ${s2[0]}:${s2[1]}`;
    // Kameraya yakın olan node = bulunduğun yer, uzak olan = gidilecek yer
    var nd1 = nodes.find(nd => nd.id === pair.n1);
    var nd2 = nodes.find(nd => nd.id === pair.n2);
    var farId, farName, nearName;
    if (nd1 && nd2) {
        var d1 = camera.position.distanceToSquared(new THREE.Vector3(nd1.x, nd1.y, nd1.z));
        var d2 = camera.position.distanceToSquared(new THREE.Vector3(nd2.x, nd2.y, nd2.z));
        if (d1 <= d2) { farId = pair.n2; farName = name2; nearName = name1; }
        else { farId = pair.n1; farName = name1; nearName = name2; }
    } else { farId = pair.n2; farName = name2; nearName = name1; }
    lastHoveredId = 'line_' + pair.n1 + '_' + pair.n2;
    var rootInfo = getRootInfo(pair.root);
    var rootMeaning = rootInfo ? rootInfo.meaning : '';
    tooltip.innerHTML = `
        <div style="font-size:11px;font-weight:900;color:#00f2ff;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px;">${t('tooltip.rootConnection')}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="color:${rootColor};font-size:20px;font-weight:bold;">${pair.root}</span>
            <span style="color:${rootColor};font-size:12px;opacity:0.7;">${rootPron}</span>
        </div>
        ${rootMeaning ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:10px;font-style:italic;">${rootMeaning}${rootInfo.count ? ' · ' + t('tooltip.inQuran', {count: rootInfo.count}) : ''}</div>` : ''}
        <div style="font-size:10px;color:#64748b;margin-bottom:6px;">📍 ${nearName}</div>
        <div onclick="hideTooltip();warpToId('${farId}')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,242,255,0.08);border:1px solid rgba(0,242,255,0.2);border-radius:8px;cursor:pointer;transition:background 0.2s;" onmouseenter="this.style.background='rgba(0,242,255,0.2)'" onmouseleave="this.style.background='rgba(0,242,255,0.08)'"><span style="color:#00f2ff;font-size:8px;">⬤</span><span style="color:#e2e8f0;font-size:13px;font-weight:600;">→ ${farName}</span></div>`;
    tooltip.style.display = 'block';
    tooltip.style.pointerEvents = 'auto';
    clampTooltip(tooltip, x, y);
};

var hideTooltip = () => { if (hudTooltipPinned) return; var t = document.getElementById('tooltip'); t.style.display = 'none'; t.style.pointerEvents = 'none'; lastHoveredId = null; clearTimeout(hoverTimeout); };
window.hideTooltip = hideTooltip;

var closeHudTooltip = () => { hudTooltipPinned = false; var t = document.getElementById('tooltip'); t.style.display = 'none'; t.style.pointerEvents = 'none'; lastHoveredId = null; clearTimeout(hoverTimeout); };
window.closeHudTooltip = closeHudTooltip;

var toggleRootDetail = (root, el) => {
    var container = document.getElementById('root-detail-container');
    if (!container) return;
    if (container.dataset.activeRoot === root) { container.innerHTML = ''; container.dataset.activeRoot = ''; return; }
    container.dataset.activeRoot = root;
    var info = getRootInfo(root);
    if (!info) { container.innerHTML = `<div class="root-detail-panel"><span style="color:#64748b;font-size:11px;">Bu kök için detay bilgisi henüz yüklenmedi.</span></div>`; return; }
    var color = el ? el.style.color || getRootCSSColor(root) : getRootCSSColor(root);
    var derivedHtml = (info.derived || []).map(d => `
        <div class="root-derived-item">
            <span class="root-derived-word" style="color:${color}">${d.word}</span>
            <span class="root-derived-meaning">${d.meaning}</span>
        </div>`).join('');
    container.innerHTML = `
        <div class="root-detail-panel" style="border-color:${color.replace('hsl','hsla').replace(')',', 0.15)')}">
            <div class="root-detail-title" style="color:${color}">${root} · ${info.meaning || ''}</div>
            ${info.meaning_ar ? `<div style="font-size:13px;color:#e2e8f0;direction:rtl;margin-bottom:6px;">${info.meaning_ar}</div>` : ''}
            ${info.count ? `<div style="font-size:10px;color:#64748b;margin-bottom:8px;">Kur'anda ${info.count} yerde geçiyor</div>` : ''}
            ${derivedHtml ? `<div style="font-size:10px;font-weight:700;color:#00f2ff;margin-bottom:4px;letter-spacing:0.08em;">TÜREMİŞ KELİMELER</div>${derivedHtml}` : ''}
        </div>`;
};
window.toggleRootDetail = toggleRootDetail;

var toggleHudRootDetail = (root, el) => {
    // Aynı köke tekrar tıklandıysa kapat
    var activePanel = document.querySelector('.hud-root-detail-panel');
    if (activePanel && activePanel.dataset.root === root) {
        activePanel.remove();
        return;
    }
    // Önceki açık panelleri kapat
    document.querySelectorAll('.hud-root-detail-panel').forEach(p => p.remove());

    var info = getRootInfo(root);
    var color = el ? el.style.color || getRootCSSColor(root) : getRootCSSColor(root);
    var panel = document.createElement('div');
    panel.className = 'hud-root-detail-panel';
    panel.dataset.root = root;
    panel.style.borderColor = color.replace('hsl','hsla').replace(')',', 0.2)');

    if (!info) {
        panel.innerHTML = `<span style="color:#64748b;font-size:11px;">Bu kök için detay bilgisi henüz yüklenmedi.</span>`;
    } else {
        var derivedHtml = (info.derived || []).map(d => `
            <div class="root-derived-item">
                <span class="root-derived-word" style="color:${color}">${d.word}</span>
                <span class="root-derived-meaning">${d.meaning}</span>
            </div>`).join('');
        panel.innerHTML = `
            <div class="root-detail-title" style="color:${color}">${root} · ${info.meaning || ''}</div>
            ${info.meaning_ar ? `<div style="font-size:14px;color:#e2e8f0;direction:rtl;margin-bottom:6px;">${info.meaning_ar}</div>` : ''}
            ${info.count ? `<div style="font-size:10px;color:#64748b;margin-bottom:8px;">Kur'anda ${info.count} yerde geçiyor</div>` : ''}
            ${derivedHtml ? `<div style="font-size:10px;font-weight:700;color:#00f2ff;margin-bottom:4px;letter-spacing:0.08em;">TÜREMİŞ KELİMELER</div>${derivedHtml}` : ''}`;
    }

    // Kartın içine ekle (liste) veya köklerin hemen altına (ana badge)
    var card = el.closest('.ayah-list-item');
    if (card) {
        card.appendChild(panel);
    } else {
        var rootsCont = el.closest('#hud-roots') || document.getElementById('hud-roots');
        if (rootsCont) {
            // Önceki panel varsa köklerin hemen altında, yeni panel onun yerine geçer
            rootsCont.after(panel);
        }
    }
};
window.toggleHudRootDetail = toggleHudRootDetail;
