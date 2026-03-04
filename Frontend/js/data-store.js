/** SemantikGalaksi — Veri Seti Yönetimi (Sunucu API + IndexedDB fallback) */

var DatasetStore = {
    _DB: 'sgx_ds', _STORE: 'ds', _db: null, _serverOk: null, _wsPort: null,
    async _checkServer() {
        if (this._serverOk !== null) return this._serverOk;
        try {
            const r = await fetch('/api/info', { signal: AbortSignal.timeout(2000) });
            this._serverOk = r.ok;
            if (r.ok) {
                try {
                    const info = await r.json();
                    this._wsPort = info.wsPort;
                } catch {}
            }
        } catch { this._serverOk = false; }
        return this._serverOk;
    },
    async _openDB() {
        if (this._db) return this._db;
        return new Promise((res, rej) => {
            const r = indexedDB.open(this._DB, 1);
            r.onupgradeneeded = e => e.target.result.createObjectStore(this._STORE, { keyPath: 'name' });
            r.onsuccess = e => { this._db = e.target.result; res(this._db); };
            r.onerror = e => rej(e);
        });
    },
    async save(name, data) {
        if (currentUser) {
            if (!data._meta) data._meta = {};
            data._meta.modifiedBy = currentUser;
            data._meta.modifiedAt = new Date().toISOString();
        }
        if (await this._checkServer()) {
            await authFetch('/api/dataset/' + encodeURIComponent(name), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            const db = await this._openDB();
            await new Promise((res, rej) => {
                const tx = db.transaction(this._STORE, 'readwrite');
                tx.objectStore(this._STORE).put({ name, data, date: new Date().toLocaleDateString('tr-TR') });
                tx.oncomplete = () => res(); tx.onerror = e => rej(e);
            });
        }
    },
    async get(name) {
        if (await this._checkServer()) {
            try {
                const r = await authFetch('/api/dataset/' + encodeURIComponent(name));
                if (r.ok) { const data = await r.json(); return { name, data }; }
            } catch {}
        }
        const db = await this._openDB();
        return new Promise((res, rej) => {
            const r = db.transaction(this._STORE).objectStore(this._STORE).get(name);
            r.onsuccess = () => res(r.result); r.onerror = e => rej(e);
        });
    },
    async getAll() {
        if (await this._checkServer()) {
            try {
                const r = await authFetch('/api/datasets');
                if (r.ok) {
                    const list = await r.json();
                    return list.map(d => ({ name: d.name, data: { nodes: [] }, date: d.date, nodeCount: d.nodeCount, modifiedBy: d.modifiedBy, sizeKB: d.sizeKB }));
                }
            } catch {}
        }
        const db = await this._openDB();
        return new Promise((res, rej) => {
            const r = db.transaction(this._STORE).objectStore(this._STORE).getAll();
            r.onsuccess = () => res(r.result); r.onerror = e => rej(e);
        });
    },
    async remove(name) {
        if (await this._checkServer()) {
            await authFetch('/api/dataset/' + encodeURIComponent(name), { method: 'DELETE' });
        } else {
            const db = await this._openDB();
            await new Promise((res, rej) => {
                const tx = db.transaction(this._STORE, 'readwrite');
                tx.objectStore(this._STORE).delete(name);
                tx.oncomplete = () => res(); tx.onerror = e => rej(e);
            });
        }
    },
    async isServer() { return this._checkServer(); }
};
