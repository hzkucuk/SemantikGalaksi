var _loadStart = Date.now();
var _besmelePlaying = false;
var _besmeleMinTime = 3000;
var _dataReady = false;
var _autoplayBlocked = false;
var introWarp = false;
var introWarpTime = 0;

(function() {
    var a = document.getElementById('besmele-audio');
    if (!a) return;
    var setDur = () => {
        if (a.duration && isFinite(a.duration)) {
            _besmeleMinTime = Math.ceil(a.duration * 1000) + 800;
        }
    };
    a.addEventListener('loadedmetadata', setDur);
    if (a.readyState >= 1) setDur();
})();

var _dismissLoading = () => {
    var ls = document.getElementById('loading-screen');
    if (!ls || ls.style.display === 'none') return;
    if (!_dataReady) return;
    if (_autoplayBlocked && !_besmelePlaying) return;
    // Besmele minimum süresini bekle (desktop+web)
    var elapsed = Date.now() - _loadStart;
    if (elapsed < _besmeleMinTime) {
        setTimeout(_dismissLoading, _besmeleMinTime - elapsed);
        return;
    }
    var audio = document.getElementById('besmele-audio');
    if (audio && _besmelePlaying && !audio.paused && !audio.ended) return;
    fadeBesmeleAudio();
    introWarp = true; introWarpTime = 0;
    ls.style.opacity = '0';
    setTimeout(() => { ls.style.display = 'none'; }, 1200);
};

var playBesmeleAudio = () => {
    if (_besmelePlaying) return;

    // Desktop: Python winsound zaten çalıyor, HTML audio'yu atla
    if (isDesktopMode) {
        _besmelePlaying = true;
        return;
    }

    var audio = document.getElementById('besmele-audio');
    if (!audio) return;
    audio.volume = 0.7;
    audio.addEventListener('ended', _dismissLoading, { once: true });

    audio.play().then(() => {
        _besmelePlaying = true;
    }).catch(() => {
        _autoplayBlocked = true;
        var hint = document.getElementById('loading-tap-hint');
        var spinner = document.getElementById('loading-spinner');
        var loadText = document.getElementById('loading-text');
        if (hint) hint.style.display = 'block';
        if (spinner) spinner.style.display = 'none';
        if (loadText) loadText.style.display = 'none';

        var unlock = () => {
            if (_besmelePlaying) return;
            if (hint) hint.style.display = 'none';
            if (spinner) spinner.style.display = 'block';
            if (loadText) loadText.style.display = 'block';
            audio.currentTime = 0;
            audio.play().then(() => {
                _besmelePlaying = true;
            }).catch(() => {
                _autoplayBlocked = false;
                _dismissLoading();
            });
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
        document.addEventListener('touchstart', unlock);
    });
};

var fadeBesmeleAudio = () => {
    _besmelePlaying = true;
    if (window.pywebview && window.pywebview.api) {
        try { window.pywebview.api.stop_besmele(); } catch(e) {}
    }
    var audio = document.getElementById('besmele-audio');
    if (!audio || audio.paused) return;
    var vol = audio.volume;
    var fade = setInterval(() => {
        vol -= 0.05;
        if (vol <= 0) { clearInterval(fade); audio.pause(); audio.currentTime = 0; }
        else { audio.volume = vol; }
    }, 80);
};

var hideLoadingScreen = () => {
    _dataReady = true;
    _dismissLoading();
};

window.onload = async () => {
    isDesktopMode = await DatasetStore._checkServer();
    playBesmeleAudio();
    var authValid = false;

    if (isDesktopMode && authToken) {
        try {
            var r = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + authToken } });
            if (r.ok) {
                var data = await r.json();
                authUser = data.username;
                authRole = data.role;
                currentUser = data.username;
                authValid = true;
            }
        } catch(e) {}
        if (!authValid) {
            authToken = '';
            localStorage.removeItem('sgx_auth_token');
        }
    }

    if (isDesktopMode && !authValid) {
        var elapsed = Date.now() - _loadStart;
        var wait = Math.max(0, _besmeleMinTime - elapsed);
        setTimeout(() => {
            fadeBesmeleAudio();
            var ls = document.getElementById('loading-screen');
            ls.style.opacity = '0';
            setTimeout(() => {
                ls.style.display = 'none';
                document.getElementById('login-overlay').style.display = 'flex';
            }, 1200);
        }, wait);
    } else {
        if (isDesktopMode) {
            applyRoleUI();
            connectWS();
        }
        init();
    }
};
