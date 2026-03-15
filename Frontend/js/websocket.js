// --- WebSocket Gerçek Zamanlı Senkronizasyon ---
var _ws = null, _wsReconnectTimer = null, _onlineUsers = [];
var connectWS = () => {
    if (!isDesktopMode || !authToken) return;
    var wsPort = DatasetStore._wsPort || (parseInt(location.port) + 1);
    var wsUrl = `ws://${location.hostname}:${wsPort}/ws?token=${authToken}`;
    try {
        _ws = new WebSocket(wsUrl);
        _ws.onopen = () => {
            updateOnlineIndicator();
        };
        _ws.onmessage = (e) => {
            try {
                var msg = JSON.parse(e.data);
                handleWSMessage(msg);
            } catch(ex) {}
        };
        _ws.onclose = () => {
            _ws = null;
            if (isDesktopMode && authToken) {
                _wsReconnectTimer = setTimeout(connectWS, 3000);
            }
        };
        _ws.onerror = () => {};
    } catch(ex) {}
};
var handleWSMessage = (msg) => {
    switch (msg.type) {
        case 'user_joined':
            showToast(`🟢 ${msg.username} bağlandı`, 'success');
            _onlineUsers = msg.online || [];
            updateOnlineIndicator();
            break;
        case 'user_left':
            showToast(`🔴 ${msg.username} ayrıldı`, 'muted');
            _onlineUsers = msg.online || [];
            updateOnlineIndicator();
            break;
        case 'db_sync':
            showToast(`🔄 ${msg.username}: ${msg.message} (${msg.total_fixes} güncelleme)`, 'warn');
            break;
    }
};
var showToast = (text, type) => {
    if (!type) type = 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var colors = { info: '#06b6d4', warn: '#f59e0b', success: '#34d399', muted: '#64748b' };
    var toast = document.createElement('div');
    toast.style.cssText = `background:rgba(0,0,0,0.85);backdrop-filter:blur(16px);border:1px solid ${colors[type] || colors.info}40;border-left:3px solid ${colors[type] || colors.info};border-radius:12px;padding:10px 18px;color:#e2e8f0;font-size:11px;font-weight:600;pointer-events:auto;transform:translateX(120%);transition:transform 0.3s ease;max-width:340px;`;
    toast.textContent = text;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};
var updateOnlineIndicator = () => {
    var el = document.getElementById('online-indicator');
    var countEl = document.getElementById('online-count');
    if (!el) return;
    if (isDesktopMode) {
        el.style.display = '';
        var count = _onlineUsers.length + (authUser && !_onlineUsers.includes(authUser) ? 1 : 0);
        countEl.textContent = count;
    } else {
        el.style.display = 'none';
    }
};
window.showOnlineList = async () => {
    try {
        var r = await authFetch('/api/online-users');
        if (!r.ok) return;
        var data = await r.json();
        _onlineUsers = data.users || [];
        updateOnlineIndicator();
        var details = data.details || [];
        var now = Date.now();
        var formatDuration = (iso) => {
            if (!iso) return '—';
            var diff = now - new Date(iso).getTime();
            if (diff < 0) return 'şimdi';
            var s = Math.floor(diff / 1000);
            if (s < 60) return s + ' sn';
            var m = Math.floor(s / 60);
            if (m < 60) return m + ' dk';
            var h = Math.floor(m / 60);
            var rm = m % 60;
            return h + ' sa ' + rm + ' dk';
        };
        var existing = document.getElementById('online-modal-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'online-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);animation:fadeInOnline 0.2s ease;';
        var userRows = details.map(u => {
            var isMe = u.username === authUser;
            var initials = (u.username || '?').charAt(0).toUpperCase();
            var colors = ['#06b6d4','#8b5cf6','#f59e0b','#ef4444','#10b981','#ec4899','#3b82f6'];
            var color = colors[u.username.length % colors.length];
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);transition:background 0.2s;${isMe ? 'border-left:3px solid #34d399;' : ''}" onmouseenter="this.style.background='rgba(255,255,255,0.07)'" onmouseleave="this.style.background='rgba(255,255,255,0.03)'">
                <div style="width:38px;height:38px;border-radius:50%;background:${color}20;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:${color};flex-shrink:0;">${initials}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-weight:700;font-size:13px;color:#f1f5f9;">${u.username}</span>
                        ${isMe ? '<span style="font-size:8px;background:#34d39930;color:#34d399;padding:2px 6px;border-radius:6px;font-weight:700;letter-spacing:0.05em;">SEN</span>' : ''}
                        <span style="width:6px;height:6px;border-radius:50%;background:#34d399;box-shadow:0 0 6px #34d399;flex-shrink:0;"></span>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:4px;">
                        <span style="font-size:10px;color:#94a3b8;display:flex;align-items:center;gap:4px;"><span style="opacity:0.6;">🌐</span> ${u.ip || '—'}</span>
                        <span style="font-size:10px;color:#94a3b8;display:flex;align-items:center;gap:4px;"><span style="opacity:0.6;">🖥️</span> ${u.hostname || '—'}</span>
                        <span style="font-size:10px;color:#94a3b8;display:flex;align-items:center;gap:4px;"><span style="opacity:0.6;">⏱️</span> ${formatDuration(u.connected_at)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
        overlay.innerHTML = `
        <div style="background:rgba(10,15,30,0.92);backdrop-filter:blur(24px) saturate(1.4);border:1px solid rgba(52,211,153,0.15);border-radius:20px;padding:0;width:420px;max-width:92vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.5),0 0 40px rgba(52,211,153,0.05);animation:scaleInOnline 0.25s cubic-bezier(0.34,1.56,0.64,1);">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="width:10px;height:10px;border-radius:50%;background:#34d399;box-shadow:0 0 10px #34d399;animation:pulse 2s infinite;"></span>
                    <span style="font-size:15px;font-weight:800;color:#f1f5f9;letter-spacing:0.02em;">Çevrimiçi Kullanıcılar</span>
                    <span style="font-size:11px;background:rgba(52,211,153,0.15);color:#34d399;padding:2px 10px;border-radius:10px;font-weight:700;">${details.length}</span>
                </div>
                <button onclick="document.getElementById('online-modal-overlay').remove()" style="width:32px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#94a3b8;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseenter="this.style.background='rgba(239,68,68,0.15)';this.style.color='#ef4444';this.style.borderColor='rgba(239,68,68,0.3)'" onmouseleave="this.style.background='rgba(255,255,255,0.05)';this.style.color='#94a3b8';this.style.borderColor='rgba(255,255,255,0.1)'">✕</button>
            </div>
            <div style="padding:16px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
                ${userRows || '<div style="text-align:center;color:#64748b;font-size:12px;padding:24px;">Henüz bağlı kullanıcı yok</div>'}
            </div>
            <div style="padding:12px 20px;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:9px;color:#475569;letter-spacing:0.05em;">Sunucu: ${location.hostname}:${location.port}</span>
                <span style="font-size:9px;color:#475569;letter-spacing:0.05em;">WebSocket: ${DatasetStore._wsPort || (parseInt(location.port) + 1)}</span>
            </div>
        </div>`;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    } catch(ex) {}
};
