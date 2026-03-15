window.analyzeWithAI = async () => {
    if (!currentHudNode) return;
    if (!apiKey) { apiKey = await KeyManager.getWorkingKey(); }
    if (!apiKey) { showApiKeyGuide(); return; }
    var btn = document.getElementById('ai-analyze-btn');
    var result = document.getElementById('ai-result');
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-pulse">⏳</span> ' + t('ai.analyzing');
    result.classList.remove('hidden');
    result.innerHTML = '<p class="text-purple-400 animate-pulse text-center">' + t('ai.thinking') + '</p>';
    var n = currentHudNode;
    var roots = (n.roots || []).map(r => `${r} (${getRootPron(r)})`).join(', ');
    var prompt = `Sen bir Kur'an-ı Kerim semantik analiz uzmanısın. Aşağıdaki ayeti analiz et.

Sure: ${getSurahTR(n.id)}
Ayet: ${n.id}
Arapça: ${n.text}
Meal: ${n.translation}
Kökler: ${roots}

Lütfen şunları yap:
1. Ayetin kısa tefsir özeti (2-3 cümle)
2. Köklerin semantik bağlantıları ve anlam katmanları
3. Bu köklerin Kur'an genelindeki kullanım kalıpları
4. Ayetin mesajının günümüze yansıması (1-2 cümle)

Türkçe yaz, kısa ve öz tut.`;
    try {
        var response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) throw new Error(response.statusText);
        var data = await response.json();
        var text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            result.innerHTML = text
                .replace(/\*\*(.+?)\*\*/g, '<strong class="text-purple-300">$1</strong>')
                .replace(/\n/g, '<br>')
                .replace(/^(\d+\.)/gm, '<span class="text-cyan-400 font-bold">$1</span>');
        } else {
            result.innerHTML = '<p class="text-red-400">' + t('ai.noResult') + '</p>';
        }
    } catch (err) {
        result.innerHTML = `<p class="text-red-400">${t('ai.error', {message: err.message})}</p>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="text-lg">🤖</span> ' + t('ai.analyze');
    }
};
document.getElementById('close-hud').onclick = () => { closeHUD(); };
window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    if (starField && starField.material.uniforms) {
        starField.material.uniforms.uScale.value = window.innerHeight * 0.5;
    }
    if (warpMesh && warpMesh.material.uniforms) {
        warpMesh.material.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
    }
};

// --- Ayarlar Modal Fonksiyonları ---
window.openSettings = async () => {
    document.getElementById('settings-overlay').style.display = 'flex';
    renderKeyList();
    var infoDiv = document.getElementById('auth-user-info');
    var statusDiv = document.getElementById('server-status');
    var pwSection = document.getElementById('change-pw-section');
    if (isDesktopMode && authUser) {
        var roleLabels = { admin: '👑 Admin', editor: '✏️ Editor', viewer: '👁 Viewer' };
        infoDiv.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(0,242,255,0.05);border:1px solid rgba(0,242,255,0.15);border-radius:12px;margin-bottom:8px;">
                <span style="font-size:24px;">👤</span>
                <div style="flex:1;"><div class="text-sm font-bold text-white">${authUser}</div><div class="text-[10px] text-cyan-500">${roleLabels[authRole] || authRole}</div></div>
                <button onclick="doLogout()" class="bg-red-950/50 hover:bg-red-900/50 border border-red-400/20 px-4 py-2 rounded-xl font-black text-[10px] text-red-400 uppercase tracking-widest transition-all">${t('settings.logout')}</button>
            </div>`;
        pwSection.style.display = '';
    } else {
        infoDiv.innerHTML = '<p class="text-[11px] text-slate-600">Bireysel mod — giriş gerekmez.</p>';
        pwSection.style.display = 'none';
    }
    if (isDesktopMode) {
        try {
            var r = await fetch('/api/info');
            var info = await r.json();
            statusDiv.innerHTML = `<span class="text-green-400">● Sunucu aktif</span> · Ağ: <code class="bg-black/40 px-2 py-0.5 rounded text-cyan-300">${info.url}</code>`;
        } catch(e) { statusDiv.innerHTML = '<span class="text-green-400">● Sunucu aktif</span>'; }
    } else {
        statusDiv.innerHTML = '<span class="text-slate-500">○ Çevrimdışı mod (IndexedDB)</span>';
    }
};
window.saveUsername = () => {};
window.closeSettings = () => {
    document.getElementById('settings-overlay').style.display = 'none';
    document.getElementById('api-key-guide').classList.add('hidden');
};

// --- Performans Modu Sistemi ---
var detectWeakDevice = () => {
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
    try {
        var gl = renderer.getContext();
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
            var gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();
            if (/intel|mesa|swiftshader|llvmpipe|apple gpu/i.test(gpu)) return true;
        }
    } catch(e) {}
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true;
    return false;
};

var applyPerformanceMode = () => {
    var isLow = perfMode === 'low';
    if (bloomPass) bloomPass.enabled = !isLow;
    renderer.setPixelRatio(isLow ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    nebulaMeshes.forEach(function(m) { m.visible = !isLow; });
    cosmicDustLanes.forEach(function(m) { m.visible = !isLow; });
    if (spaceDust) spaceDust.visible = !isLow;
    var btn = document.getElementById('perf-btn');
    if (btn) {
        var labelKey = isLow ? 'header.perfLow' : 'header.perfHigh';
        btn.innerHTML = isLow
            ? '<span>\ud83d\udd0b</span><span class="hdr-btn-label" data-i18n="header.perfLow">' + t('header.perfLow') + '</span>'
            : '<span>\u26a1</span><span class="hdr-btn-label" data-i18n="header.perfHigh">' + t('header.perfHigh') + '</span>';
        btn.title = t('header.perf');
    }
};

var togglePerformance = () => {
    perfMode = perfMode === 'high' ? 'low' : 'high';
    localStorage.setItem('sgx_perf', perfMode);
    applyPerformanceMode();
};

// Dil değiştiğinde performans buton etiketini güncelle
document.addEventListener('languageChanged', function() { applyPerformanceMode(); });
