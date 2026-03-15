// --- modalDialog.js — Modern Modal Dialog System ---
// alert(), confirm(), prompt() yerine kullanilir.
// Tum fonksiyonlar Promise dondurur.

(function() {
    'use strict';

    var _overlay = null;
    var _activeResolve = null;

    function _ensureOverlay() {
        if (_overlay) return _overlay;
        _overlay = document.createElement('div');
        _overlay.className = 'mdl-overlay';
        _overlay.addEventListener('click', function(e) {
            if (e.target === _overlay) _dismiss(null);
        });
        document.body.appendChild(_overlay);
        return _overlay;
    }

    function _dismiss(value) {
        if (_overlay) {
            _overlay.classList.remove('mdl-show');
            setTimeout(function() {
                if (_overlay) _overlay.innerHTML = '';
                if (_overlay) _overlay.style.display = 'none';
            }, 200);
        }
        if (_activeResolve) {
            var r = _activeResolve;
            _activeResolve = null;
            r(value);
        }
    }

    function _buildModal(opts) {
        var ov = _ensureOverlay();
        ov.innerHTML = '';

        var box = document.createElement('div');
        box.className = 'mdl-box';

        // Header
        if (opts.title) {
            var hdr = document.createElement('div');
            hdr.className = 'mdl-header';
            if (opts.icon) {
                var ic = document.createElement('span');
                ic.className = 'mdl-icon';
                ic.textContent = opts.icon;
                hdr.appendChild(ic);
            }
            var ttl = document.createElement('span');
            ttl.className = 'mdl-title';
            ttl.textContent = opts.title;
            hdr.appendChild(ttl);
            box.appendChild(hdr);
        }

        // Body
        var body = document.createElement('div');
        body.className = 'mdl-body';
        var msg = document.createElement('div');
        msg.className = 'mdl-message';
        msg.textContent = opts.message || '';
        body.appendChild(msg);

        // Input (prompt)
        var input = null;
        if (opts.type === 'prompt') {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'mdl-input';
            input.value = opts.defaultValue || '';
            if (opts.placeholder) input.placeholder = opts.placeholder;
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    _dismiss(input.value);
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    _dismiss(null);
                }
            });
            body.appendChild(input);
        }
        box.appendChild(body);

        // Footer buttons
        var footer = document.createElement('div');
        footer.className = 'mdl-footer';

        if (opts.type === 'confirm' || opts.type === 'prompt') {
            var cancelBtn = document.createElement('button');
            cancelBtn.className = 'mdl-btn mdl-btn-cancel';
            cancelBtn.textContent = (typeof t === 'function') ? t('modal.cancel') : 'Iptal';
            cancelBtn.addEventListener('click', function() {
                _dismiss(opts.type === 'confirm' ? false : null);
            });
            footer.appendChild(cancelBtn);
        }

        var okBtn = document.createElement('button');
        okBtn.className = 'mdl-btn mdl-btn-ok';
        if (opts.danger) okBtn.classList.add('mdl-btn-danger');
        okBtn.textContent = opts.okText || ((typeof t === 'function') ? t('modal.ok') : 'Tamam');
        okBtn.addEventListener('click', function() {
            if (opts.type === 'prompt') {
                _dismiss(input ? input.value : null);
            } else if (opts.type === 'confirm') {
                _dismiss(true);
            } else {
                _dismiss(true);
            }
        });
        footer.appendChild(okBtn);
        box.appendChild(footer);

        ov.appendChild(box);
        ov.style.display = 'flex';

        // Trigger animation
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                ov.classList.add('mdl-show');
            });
        });

        // Focus
        setTimeout(function() {
            if (input) input.focus();
            else okBtn.focus();
        }, 50);

        // Keyboard
        box.setAttribute('tabindex', '-1');
        box.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (opts.type === 'confirm') _dismiss(false);
                else if (opts.type === 'prompt') _dismiss(null);
                else _dismiss(true);
            }
        });
    }

    /**
     * showAlert(message, title?, icon?)
     * @returns {Promise<void>}
     */
    window.showAlert = function(message, title, icon) {
        return new Promise(function(resolve) {
            _activeResolve = resolve;
            _buildModal({
                type: 'alert',
                message: message,
                title: title || ((typeof t === 'function') ? t('modal.info') : 'Bilgi'),
                icon: icon || '\u2139\uFE0F',
            });
        });
    };

    /**
     * showConfirm(message, title?, opts?)
     * @returns {Promise<boolean>}
     */
    window.showConfirm = function(message, title, opts) {
        opts = opts || {};
        return new Promise(function(resolve) {
            _activeResolve = resolve;
            _buildModal({
                type: 'confirm',
                message: message,
                title: title || ((typeof t === 'function') ? t('modal.confirm') : 'Onay'),
                icon: opts.icon || '\u26A0\uFE0F',
                danger: opts.danger || false,
                okText: opts.okText || null,
            });
        });
    };

    /**
     * showPrompt(message, defaultValue?, title?, placeholder?)
     * @returns {Promise<string|null>}
     */
    window.showPrompt = function(message, defaultValue, title, placeholder) {
        return new Promise(function(resolve) {
            _activeResolve = resolve;
            _buildModal({
                type: 'prompt',
                message: message,
                title: title || ((typeof t === 'function') ? t('modal.input') : 'Giris'),
                icon: '\u270F\uFE0F',
                defaultValue: defaultValue || '',
                placeholder: placeholder || '',
            });
        });
    };

})();
