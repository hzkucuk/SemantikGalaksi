/** SemantikGalaksi — API Key Yönetimi (localStorage) */

var KeyManager = {
    _STORAGE_KEY: 'sgx_api_keys',
    _encode: (s) => btoa(unescape(encodeURIComponent(s))),
    _decode: (s) => { try { return decodeURIComponent(escape(atob(s))); } catch(e) { return ''; } },
    getKeys() {
        try {
            const raw = localStorage.getItem(this._STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(this._decode(raw));
        } catch(e) { return []; }
    },
    saveKeys(keys) {
        localStorage.setItem(this._STORAGE_KEY, this._encode(JSON.stringify(keys)));
    },
    addKey(key) {
        const keys = this.getKeys();
        if (keys.find(k => k.key === key)) return false;
        keys.push({ key, status: 'pending' });
        this.saveKeys(keys);
        return true;
    },
    removeKey(key) {
        const keys = this.getKeys().filter(k => k.key !== key);
        this.saveKeys(keys);
    },
    updateStatus(key, status, error) {
        const keys = this.getKeys();
        const k = keys.find(x => x.key === key);
        if (k) { k.status = status; k.error = error || ''; this.saveKeys(keys); }
    },
    async testKey(key) {
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (r.ok) return { ok: true };
            const err = await r.json().catch(() => null);
            const msg = err?.error?.message || `HTTP ${r.status}`;
            return { ok: false, error: msg };
        } catch(e) { return { ok: false, error: e.message }; }
    },
    async getWorkingKey() {
        const keys = this.getKeys();
        const sorted = [...keys].sort((a,b) => (a.status === 'ok' ? -1 : 1) - (b.status === 'ok' ? -1 : 1));
        for (const k of sorted) {
            const result = await this.testKey(k.key);
            this.updateStatus(k.key, result.ok ? 'ok' : 'fail');
            if (result.ok) return k.key;
        }
        return null;
    }
};
