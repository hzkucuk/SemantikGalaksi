/** SemantikGalaksi — Kimlik Doğrulama */

var authFetch = (url, opts = {}) => {
    if (!opts.headers) opts.headers = {};
    if (authToken) opts.headers['Authorization'] = 'Bearer ' + authToken;
    return fetch(url, opts);
};

var applyRoleUI = () => {
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) adminBtn.style.display = authRole === 'admin' ? '' : 'none';
    const isViewer = authRole === 'viewer';
    const fileLabel = document.getElementById('file-input-label');
    if (isDesktopMode && fileLabel) fileLabel.style.display = isViewer ? 'none' : '';
};

window.doLogin = async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    err.style.display = 'none';
    if (!username || !password) { err.textContent = 'Kullanıcı adı ve şifre gerekli'; err.style.display = 'block'; return; }
    try {
        const r = await fetch('/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await r.json();
        if (!r.ok) { err.textContent = data.error; err.style.display = 'block'; return; }
        authToken = data.token;
        authUser = data.username;
        authRole = data.role;
        currentUser = data.username;
        localStorage.setItem('sgx_auth_token', authToken);
        localStorage.setItem('sgx_username', currentUser);
        document.getElementById('login-overlay').style.display = 'none';
        applyRoleUI();
        init();
        connectWS();
    } catch (e) {
        err.textContent = t('auth.connectionError');
        err.style.display = 'block';
    }
};

window.doLogout = async () => {
    try { await authFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    authToken = ''; authUser = ''; authRole = '';
    localStorage.removeItem('sgx_auth_token');
    location.reload();
};

window.openAdmin = async () => {
    document.getElementById('admin-overlay').style.display = 'flex';
    await renderUserList();
};
window.closeAdmin = () => { document.getElementById('admin-overlay').style.display = 'none'; };

var renderUserList = async () => {
    const list = document.getElementById('admin-user-list');
    try {
        const r = await authFetch('/api/auth/users');
        if (!r.ok) { list.innerHTML = '<p class="text-xs text-red-400">Yetkisiz</p>'; return; }
        const users = await r.json();
        const roleLabels = { admin: '👑 Admin', editor: '✏️ Editor', viewer: '👁 Viewer' };
        const roleColors = { admin: '#f59e0b', editor: '#06b6d4', viewer: '#64748b' };
        list.innerHTML = users.map(u => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;margin-bottom:8px;">
                <span style="font-size:20px;">👤</span>
                <div style="flex:1;"><div class="text-sm font-bold text-white">${u.username}</div><div class="text-[10px]" style="color:${roleColors[u.role]}">${roleLabels[u.role]}</div></div>
                ${u.username !== authUser ? `
                <select onchange="changeUserRole('${u.username}',this.value)" style="background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:4px 8px;color:white;font-size:10px;outline:none;">
                    <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
                    <option value="editor" ${u.role==='editor'?'selected':''}>Editor</option>
                    <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                </select>
                <button onclick="deleteUser('${u.username}')" style="width:32px;height:32px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.1);color:#ef4444;cursor:pointer;font-size:12px;">🗑</button>
                ` : '<span class="text-[10px] text-slate-600">(Siz)</span>'}
            </div>
        `).join('');
    } catch { list.innerHTML = '<p class="text-xs text-red-400">Hata oluştu</p>'; }
};

window.createUser = async () => {
    const username = document.getElementById('new-user-name').value.trim();
    const password = document.getElementById('new-user-pass').value.trim();
    const role = document.getElementById('new-user-role').value;
    if (!username || !password) return;
    const r = await authFetch('/api/auth/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
    });
    if (r.ok) {
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-pass').value = '';
        await renderUserList();
    } else {
        const data = await r.json();
        showAlert(data.error || 'Hata');
    }
};

window.deleteUser = async (username) => {
    var ok = await showConfirm(username + ' silinsin mi?', t('modal.confirm'), { danger: true });
    if (!ok) return;
    await authFetch('/api/auth/user/' + encodeURIComponent(username), { method: 'DELETE' });
    await renderUserList();
};

window.changeUserRole = async (username, role) => {
    await authFetch('/api/auth/user/' + encodeURIComponent(username), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
    });
    await renderUserList();
};

window.changePassword = async () => {
    const oldPw = document.getElementById('old-pw-input').value;
    const newPw = document.getElementById('new-pw-input').value;
    const msg = document.getElementById('pw-change-msg');
    if (!oldPw || !newPw) { msg.innerHTML = '<span class="text-red-400">Tüm alanları doldurun</span>'; return; }
    const r = await authFetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
    });
    const data = await r.json();
    if (r.ok) {
        msg.innerHTML = '<span class="text-green-400">✓ Şifre güncellendi</span>';
        document.getElementById('old-pw-input').value = '';
        document.getElementById('new-pw-input').value = '';
    } else {
        msg.innerHTML = `<span class="text-red-400">${data.error}</span>`;
    }
    setTimeout(() => { msg.innerHTML = ''; }, 3000);
};
