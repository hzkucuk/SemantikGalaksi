var currentHudNode = null;
var activeSpeakBtn = null;

var updateHighlightLines = (n) => {
    if (highlightLines) { highlightLines.forEach(m => { scene.remove(m); m.geometry?.dispose(); m.material?.dispose(); }); highlightLines = null; }
    if (!n) return;
    highlightLines = [];
    var nodeIdx = nodes.findIndex(nd => nd.id === n.id);
    (n.roots || []).forEach(root => {
        var ids = rootMap.get(root);
        if (!ids) return;
        var color = new THREE.Color(getRootCSSColor(root));
        for (var i = 0; i < ids.length - 1; i++) {
            if (ids[i] === nodeIdx || ids[i+1] === nodeIdx) {
                var a = nodes[ids[i]]; var b = nodes[ids[i+1]];
                var p1 = new THREE.Vector3(a.x, a.y, a.z);
                var p2 = new THREE.Vector3(b.x, b.y, b.z);
                var path = new THREE.LineCurve3(p1, p2);
                var pairData = { n1: a.id, n2: b.id, root: root };
                var tubeR = currentLayout === 'galaxy' ? 40 : 150;
                // Ana ışın — neon beam shader
                var tubeG = new THREE.TubeGeometry(path, 1, tubeR, 8, false);
                var tubeM = new THREE.Mesh(tubeG, new THREE.ShaderMaterial({
                    uniforms: {
                        uColor: { value: color },
                        uTime: { value: 0 },
                        uOpacity: { value: 0.9 }
                    },
                    vertexShader: neonBeamVS,
                    fragmentShader: neonBeamFS,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide
                }));
                tubeM.renderOrder = 2;
                tubeM.userData.pair = pairData;
                scene.add(tubeM);
                highlightLines.push(tubeM);
                // Dış glow — daha geniş, daha yumuşak
                var glowG = new THREE.TubeGeometry(path, 1, tubeR * 2.5, 8, false);
                var glowM = new THREE.Mesh(glowG, new THREE.ShaderMaterial({
                    uniforms: {
                        uColor: { value: color },
                        uTime: { value: 0 },
                        uOpacity: { value: 0.12 }
                    },
                    vertexShader: neonBeamVS,
                    fragmentShader: neonBeamFS,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide
                }));
                glowM.renderOrder = 1;
                scene.add(glowM);
                highlightLines.push(glowM);
            }
        }
    });
};

var showHUD = (n) => {
    if (!n) return;
    currentHudNode = n;
    // Önceki ses/audio state'ini temizle
    stopAudio();
    isAudioLoading = false;
    activeSpeakBtn = null;
    if (surahAudioPlayer) { surahAudioPlayer.pause(); surahAudioPlayer = null; }
    var hudSpeakBtn = document.getElementById('hud-speak-btn');
    if (hudSpeakBtn) hudSpeakBtn.textContent = '▶';
    var hudSurahBtn = document.getElementById('hud-surah-btn');
    if (hudSurahBtn) hudSurahBtn.textContent = '📖';
    updateHighlightLines(n);

    // Panel + backdrop aç
    var panel = document.getElementById('hud-panel');
    var backdrop = document.getElementById('hud-backdrop');
    panel.classList.remove('hidden');
    // Force reflow for animation
    void panel.offsetWidth;
    panel.classList.add('hud-open');
    if (backdrop) backdrop.classList.add('active');

    // İlk sekmeyi aktif yap
    switchHudSection('ayet');
    var arabicHighlighted = highlightArabicText(n.text, n.roots);
    document.getElementById('hud-title').innerText = getSurahTR(n.id);
    document.getElementById('hud-coord').innerText = `KOORDİNAT: ${n.id}`;
    document.getElementById('hud-translation').innerText = n.translation;
    document.getElementById('hud-arabic').innerHTML = arabicHighlighted;

    // Dipnot alanını güncelle (dipnot_parsed varsa zengin içerik, yoksa düz metin)
    var dipnotDiv = document.getElementById('hud-dipnot');
    var dipnotLabel = document.getElementById('dipnot-label');
    dipnotDiv.classList.add('hidden');
    if (n.dipnot_parsed && n.dipnot_parsed.length > 0) {
        var dipnotHtml = n.dipnot_parsed.map(part => {
            if (part.type === 'link' && part.targets && part.targets.length > 0) {
                return `<a href="#" onclick="event.preventDefault(); event.stopPropagation(); warpToId('${part.targets[0]}')" style="color:#f59e0b;text-decoration:underline;cursor:pointer;font-weight:600;">${part.content}</a>`;
            }
            return `<span>${part.content.replace(/\n/g, '<br>')}</span>`;
        }).join('');
        dipnotDiv.innerHTML = dipnotHtml;
        dipnotLabel.textContent = 'Dipnot';
    } else if (n.dipnot) {
        dipnotDiv.textContent = n.dipnot;
        dipnotLabel.textContent = 'Dipnot';
    } else {
        dipnotDiv.textContent = 'Bu ayet için dipnot bulunmuyor.';
        dipnotLabel.textContent = 'Dipnot';
    }

    // Önceki AI sonucunu temizle
    var aiResult = document.getElementById('ai-result');
    aiResult.classList.add('hidden');
    aiResult.innerHTML = '';

    var rootsCont = document.getElementById('hud-roots'); rootsCont.innerHTML = '';
    (n.roots || []).forEach((r, ri) => {
        var c = getRootCSSColor(r, ri); var badge = document.createElement('div'); badge.className = "root-badge";
        badge.style.color = c; badge.style.borderColor = c.replace('hsl', 'hsla').replace(')', ', 0.4)');
        badge.style.backgroundColor = c.replace('hsl', 'hsla').replace(')', ', 0.1)');
        badge.style.cursor = 'pointer';
        var info = getRootInfo(r);
        var meaning = info ? info.meaning : '';
        badge.innerHTML = `<span dir="rtl" class="text-2xl font-bold">${r}</span><span class="root-pron">${getRootPron(r)}</span>${meaning ? `<span class="mini-root-meaning" style="font-size:11px;margin-top:2px;">${meaning}</span>` : ''}`;
        badge.addEventListener('click', function() { toggleHudRootDetail(r, this); });
        rootsCont.appendChild(badge);
    });

    // Kök istatistikleri
    var statsDiv = document.getElementById('hud-root-stats');
    var statsHtml = '';
    (n.roots || []).forEach((r, ri) => {
        var ids = rootMap.get(r) || [];
        var totalAyah = ids.length;
        var surahSet = new Set(ids.map(i => nodes[i].id.split(':')[0]));
        var totalSurah = surahSet.size;
        var c = getRootCSSColor(r, ri);
        // Sure bazlı dağılım (en çok geçen 5)
        var surahCounts = {};
        ids.forEach(i => { var sid = nodes[i].id.split(':')[0]; surahCounts[sid] = (surahCounts[sid] || 0) + 1; });
        var topSurahs = Object.entries(surahCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        var barMax = topSurahs[0]?.[1] || 1;
        statsHtml += `
            <div style="margin-bottom:12px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid ${c.replace('hsl', 'hsla').replace(')', ',0.15)')};border-radius:12px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span dir="rtl" style="color:${c};font-size:18px;font-weight:bold;">${r}</span>
                    <span style="color:${c};font-size:11px;opacity:0.7;">${getRootPron(r)}</span>
                    <span style="margin-left:auto;font-size:11px;color:#64748b;">Kur'an geneli</span>
                </div>
                <div style="display:flex;gap:16px;margin-bottom:8px;">
                    <div style="text-align:center;">
                        <div style="font-size:20px;font-weight:900;color:${c};">${totalAyah}</div>
                        <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Ayet</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:20px;font-weight:900;color:${c};">${totalSurah}</div>
                        <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Sure</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:20px;font-weight:900;color:${c};">${(totalAyah / 6236 * 100).toFixed(1)}%</div>
                        <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Oran</div>
                    </div>
                </div>
                <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">En Çok Geçtiği Sureler</div>
                ${topSurahs.map(([sid, cnt]) => `
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                        <span style="font-size:11px;color:#94a3b8;min-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${surahNamesTR[sid]}</span>
                        <div style="flex:1;height:6px;background:rgba(255,255,255,0.04);border-radius:3px;overflow:hidden;">
                            <div style="width:${cnt / barMax * 100}%;height:100%;background:${c};border-radius:3px;opacity:0.6;"></div>
                        </div>
                        <span style="font-size:10px;color:${c};font-weight:700;min-width:20px;text-align:right;">${cnt}</span>
                    </div>`).join('')}
            </div>`;
    });
    statsDiv.innerHTML = statsHtml;

    var list = document.getElementById('related-list'); list.innerHTML = '';
    var related = []; var seen = new Set([n.id]);
    var nIdx = nodes.findIndex(nd => nd.id === n.id);
    (n.roots || []).forEach(r => {
        var ids = rootMap.get(r);
        if (!ids) return;
        for (var i = 0; i < ids.length - 1; i++) {
            if (ids[i] === nIdx || ids[i+1] === nIdx) {
                var neighborIdx = ids[i] === nIdx ? ids[i+1] : ids[i];
                var rn = nodes[neighborIdx];
                if (rn && !seen.has(rn.id)) { related.push(rn); seen.add(rn.id); }
            }
        }
    });
    
    var html = '';
    var grouped = related.reduce((acc, rn) => { var t = getSurahTR(rn.id); if (!acc[t]) acc[t] = []; acc[t].push(rn); return acc; }, {});
    for (var sName in grouped) {
        html += `<div class="surah-group-header"><span>${sName}</span><span>${grouped[sName].length} Ayet</span></div>`;
        grouped[sName].forEach(rn => {
            var shared = (rn.roots || []).filter(r => (n.roots || []).includes(r));
            html += `
                <div class="ayah-list-item ref-hover" data-id="${rn.id}" onclick="event.stopPropagation(); warpToId('${rn.id}')">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[11px] font-bold text-slate-100 uppercase tracking-tight">${getSurahTR(rn.id)} ${rn.id.split(':')[1]}. Ayet</span>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <button onclick="event.stopPropagation(); window.showDipnotPopup(this, '${rn.id}')" style="width:28px;height:28px;border-radius:50%;border:1px solid #f59e0b;background:rgba(245,158,11,0.1);color:#f59e0b;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;" title="Dipnot">📌</button>
                            <button onclick="event.stopPropagation(); window.speakThis(this, '${rn.id}')" style="width:28px;height:28px;border-radius:50%;border:1px solid #00f2ff;background:rgba(0,242,255,0.1);color:#00f2ff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;" title="Seslendir">▶</button>
                            <span class="text-[10px] text-cyan-500 font-mono">${rn.id}</span>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-1">
                        ${(rn.roots || []).map((r, _ri) => {
                            var _c = getRootCSSColor(r, _ri);
                            var _info = getRootInfo(r);
                            var _m = _info ? _info.meaning : '';
                            return `
                            <div class="mini-root-tag" onclick="event.stopPropagation(); toggleHudRootDetail('${r}', this)" style="color: ${_c}; border-color: ${_c.replace('hsl', 'hsla').replace(')', ', 0.4)')}">
                                <span class="text-[18px] font-bold">${r}</span>
                                <span class="mini-root-pron">${getRootPron(r)}</span>
                                ${_m ? `<span class="mini-root-meaning">${_m}</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
        });
    }
    list.innerHTML = html || '<p class="text-xs text-slate-600 italic text-center">Bağlantı bulunamadı.</p>';

    // HUD arama filtreleme (Arapça destekli)
    var hudSearch = document.getElementById('hud-search');
    hudSearch.value = '';
    hudSearch.oninput = () => {
        var q = hudSearch.value.trim();
        if (!q) { list.querySelectorAll('.ayah-list-item, .surah-group-header').forEach(el => el.style.display = ''); return; }
        var isAr = isArabic(q);
        var qMatch = isAr ? normalizeArabic(q) : q.toLowerCase();
        var items = list.querySelectorAll('.ayah-list-item');
        var headers = list.querySelectorAll('.surah-group-header');
        items.forEach(item => {
            var text = item.textContent;
            var match = isAr ? normalizeArabic(text).includes(qMatch) : text.toLowerCase().includes(qMatch);
            item.style.display = match ? '' : 'none';
        });
        headers.forEach(h => {
            var next = h.nextElementSibling;
            var anyVisible = false;
            while (next && !next.classList.contains('surah-group-header')) {
                if (next.style.display !== 'none') anyVisible = true;
                next = next.nextElementSibling;
            }
            h.style.display = anyVisible ? '' : 'none';
        });
    };
};

window.speakThis = async (btn, nodeId) => {
    var node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    var text = node.translation;
    if (activeSpeakBtn && activeSpeakBtn !== btn) { activeSpeakBtn.textContent = '▶'; }
    if (currentAudio || window.speechSynthesis?.speaking) {
        stopAudio();
        window.speechSynthesis?.cancel();
        btn.textContent = '▶';
        activeSpeakBtn = null;
        return;
    }
    activeSpeakBtn = btn;
    btn.textContent = '⏳';

    // Öncelik 1: Gemini TTS
    if (!apiKey) { apiKey = await KeyManager.getWorkingKey(); }
    var success = apiKey ? await speakAyah(text) : false;
    if (success && currentAudio) {
        btn.textContent = '⏹';
        currentAudio.onended = () => { btn.textContent = '▶'; currentAudio = null; activeSpeakBtn = null; };
        currentAudio.onerror = () => { btn.textContent = '▶'; currentAudio = null; activeSpeakBtn = null; };
    } else {
        // Öncelik 2: Tarayıcı TTS
        var utter = speakWithBrowser(text);
        if (utter) {
            btn.textContent = '⏹';
            utter.onend = () => { btn.textContent = '▶'; activeSpeakBtn = null; };
            utter.onerror = () => { btn.textContent = '▶'; activeSpeakBtn = null; };
        } else {
            btn.textContent = '❌';
            setTimeout(() => { btn.textContent = '▶'; }, 2000);
            activeSpeakBtn = null;
        }
    }
};

            window.speakCurrentHudAyah = async (btn) => {
                if (!currentHudNode) return;
                await window.speakThis(btn, currentHudNode.id);
            };

var surahAudioPlayer = null;

window.speakSurah = (btn) => {
    if (!currentHudNode) return;
    // Durdurma kontrolü
    if (surahAudioPlayer) {
        surahAudioPlayer.pause();
        surahAudioPlayer = null;
        btn.textContent = '📖';
        return;
    }
    // Sure numarasından MP3 URL oluştur
    var surahNum = currentHudNode.id.split(':')[0];
    var audioUrl = 'https://www.suleymaniyevakfimeali.com/Content/Voices/' + surahNum + '.mp3';
    btn.textContent = '⏳';
    surahAudioPlayer = new Audio(audioUrl);
    surahAudioPlayer.play().then(function() {
        btn.textContent = '⏹';
    }).catch(function() {
        btn.textContent = '❌';
        setTimeout(function() { btn.textContent = '📖'; }, 2000);
        surahAudioPlayer = null;
    });
    surahAudioPlayer.onended = function() { btn.textContent = '📖'; surahAudioPlayer = null; };
    surahAudioPlayer.onerror = function() { btn.textContent = '❌'; setTimeout(function() { btn.textContent = '📖'; }, 2000); surahAudioPlayer = null; };
};

// ── Slider Yönetim Fonksiyonları ─────────────────────────────

var closeHUD = () => {
    var panel = document.getElementById('hud-panel');
    var backdrop = document.getElementById('hud-backdrop');
    panel.classList.remove('hud-open');
    if (backdrop) backdrop.classList.remove('active');
    stopAudio();
    closeHudTooltip();
    // Animasyon bitince gizle
    setTimeout(() => { if (!panel.classList.contains('hud-open')) panel.classList.add('hidden'); }, 500);
};
window.closeHUD = closeHUD;

var toggleHudSlider = () => {
    var panel = document.getElementById('hud-panel');
    if (panel.classList.contains('hud-open')) {
        closeHUD();
    } else {
        panel.classList.remove('hidden');
        void panel.offsetWidth;
        panel.classList.add('hud-open');
        var backdrop = document.getElementById('hud-backdrop');
        if (backdrop) backdrop.classList.add('active');
    }
};
window.toggleHudSlider = toggleHudSlider;

var switchHudSection = (sectionId) => {
    // Tab'ları güncelle
    document.querySelectorAll('.hud-section-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.section === sectionId);
    });
    // Section'ları güncelle
    document.querySelectorAll('.hud-section').forEach(sec => {
        sec.classList.remove('active');
    });
    var target = document.getElementById('hud-sec-' + sectionId);
    if (target) target.classList.add('active');
    // Scroll'u başa al
    var scrollArea = document.querySelector('.hud-scroll-area');
    if (scrollArea) scrollArea.scrollTop = 0;
};
window.switchHudSection = switchHudSection;

// Mobil swipe desteği
(function() {
    var startX = 0;
    var panel = document.getElementById('hud-panel');
    if (!panel) return;
    panel.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
    }, { passive: true });
    panel.addEventListener('touchend', function(e) {
        var diffX = e.changedTouches[0].clientX - startX;
        if (diffX < -80) closeHUD();
    }, { passive: true });
})();
