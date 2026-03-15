/** SemantikGalaksi — API Key Yonetimi (localStorage)
 *  Desteklenen provider'lar: gemini, claude
 */

var KeyManager = {
    _STORAGE_KEY: 'sgx_api_keys',
    _encode: (s) => btoa(unescape(encodeURIComponent(s))),
    _decode: (s) => { try { return decodeURIComponent(escape(atob(s))); } catch(e) { return ''; } },
    getKeys(provider) {
        try {
            const raw = localStorage.getItem(this._STORAGE_KEY);
            if (!raw) return [];
            const keys = JSON.parse(this._decode(raw));
            // Eski formattan (provider yok) gecis: provider yoksa gemini say
            keys.forEach(function(k) { if (!k.provider) k.provider = 'gemini'; });
            if (provider) return keys.filter(function(k) { return k.provider === provider; });
            return keys;
        } catch(e) { return []; }
    },
    saveKeys(keys) {
        localStorage.setItem(this._STORAGE_KEY, this._encode(JSON.stringify(keys)));
    },
    addKey(key, provider) {
        provider = provider || 'gemini';
        const keys = this.getKeys();
        if (keys.find(function(k) { return k.key === key; })) return false;
        keys.push({ key: key, provider: provider, status: 'pending' });
        this.saveKeys(keys);
        return true;
    },
    removeKey(key) {
        const keys = this.getKeys().filter(function(k) { return k.key !== key; });
        this.saveKeys(keys);
    },
    updateStatus(key, status, error) {
        const keys = this.getKeys();
        const k = keys.find(function(x) { return x.key === key; });
        if (k) { k.status = status; k.error = error || ''; this.saveKeys(keys); }
    },
    async testGeminiKey(key) {
        try {
            const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key));
            if (r.ok) return { ok: true };
            const err = await r.json().catch(function() { return null; });
            const msg = (err && err.error && err.error.message) ? err.error.message : ('HTTP ' + r.status);
            return { ok: false, error: msg };
        } catch(e) { return { ok: false, error: e.message }; }
    },
    async testClaudeKey(key) {
        // Claude API key testi — backend uzerinden (CORS nedeniyle dogrudan cagrilamaz)
        if (window.pywebview) {
            try {
                var res = await authFetch('/api/sync/ai-key-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: key })
                });
                var data = await res.json();
                return { ok: !!data.ok, error: data.error || '' };
            } catch(e) { return { ok: false, error: e.message }; }
        }
        // Web modunda: basit format kontrolu
        if (key && key.startsWith('sk-ant-')) return { ok: true };
        return { ok: false, error: 'Claude key format: sk-ant-...' };
    },
    async testKey(key, provider) {
        if (!provider) {
            // Provider otomatik tespit
            if (key && key.startsWith('sk-ant-')) provider = 'claude';
            else provider = 'gemini';
        }
        if (provider === 'claude') return this.testClaudeKey(key);
        return this.testGeminiKey(key);
    },
    async getWorkingKey(provider) {
        const keys = this.getKeys(provider);
        const sorted = keys.slice().sort(function(a, b) { return (a.status === 'ok' ? -1 : 1) - (b.status === 'ok' ? -1 : 1); });
        for (var i = 0; i < sorted.length; i++) {
            var k = sorted[i];
            var result = await this.testKey(k.key, k.provider);
            this.updateStatus(k.key, result.ok ? 'ok' : 'fail');
            if (result.ok) return k.key;
        }
        return null;
    }
};
