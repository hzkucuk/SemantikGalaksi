/** SemantikGalaksi — i18n (Çoklu Dil Desteği) Motoru
 *  Türkçe gömülü fallback, JSON locale dosyaları, otomatik algılama, localStorage hatırlama.
 *  Bağımlılıklar: Yok (ilk yüklenmeli)
 */

var I18n = (function () {

    // ════════════════════════════════════════════════════════════
    // GÖMÜLÜ TÜRKÇE — Fallback (her zaman mevcut)
    // ════════════════════════════════════════════════════════════

    var TR = {
        meta: { code: 'TR-tr', name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷', direction: 'ltr', besmeleAudio: 'besmele.wav' },

        // Loading Screen
        'loading.euzu': 'Kovulmuş şeytandan Allah\'a sığınırım',
        'loading.besmele': 'İyiliği sonsuz, ikramı bol Allah\'ın adıyla',
        'loading.transliteration': 'Eûzü billâhi mineş-şeytânir-racîm · Bismillâhirrahmânirrahîm',
        'loading.tapToStart': '▶ Dokunarak Başlat',
        'loading.loading': 'Yükleniyor',

        // Portrait Warning
        'portrait.title': 'Cihazınızı Yatay Çevirin',
        'portrait.desc': 'Kur\'an-ı Kerim Kelime Kök Uzayı yalnızca yatay (landscape) modda çalışır. Lütfen cihazınızı yan çevirin.',

        // Login
        'login.title': 'Giriş Yap',
        'login.username': 'Kullanıcı adı',
        'login.password': 'Şifre',
        'login.submit': 'Giriş',
        'login.firstSetup': 'İlk kurulum: admin / admin123',

        // Header
        'header.readData': 'VERİ OKU',
        'header.datasets': 'Veri Setleri',
        'header.editor': 'JSON Editör',
        'header.notes': 'Notlarım',
        'header.admin': 'Kullanıcı Yönetimi',
        'header.layout': 'Uzay Yerleşim Modeli',
        'header.hud': 'Bilgi Paneli (HUD)',
        'header.settings': 'Ayarlar',
        'header.perf': 'Performans Modu',
        'header.perfHigh': 'YÜKSEK',
        'header.perfLow': 'DÜŞÜK',
        'header.stats': 'İstatistikler',
        'header.analyzer': 'Kök Analiz Motoru',

        // Layout Menu
        'layout.galaxy': 'Galaksi',
        'layout.galaxyDesc': 'Arşimed spirali — Samanyolu modeli',
        'layout.nebula': 'Bulutsu',
        'layout.nebulaDesc': 'Gauss bulut kümeleri — Organik dağılım',
        'layout.cube': 'Küp',
        'layout.cubeDesc': '3B ızgara — Kristal yapı',
        'layout.sphere': 'Küre',
        'layout.sphereDesc': 'Fibonacci küre — Altın oran dağılımı',
        'layout.allah': 'الله',
        'layout.allahDesc': 'Arapça kaligrafi — Allah lafzı şekli',

        // Settings
        'settings.title': 'Ayarlar',
        'settings.userInfo': 'Kullanıcı Bilgileri',
        'settings.changePassword': 'Şifre Değiştir',
        'settings.currentPassword': 'Mevcut şifre',
        'settings.newPassword': 'Yeni şifre',
        'settings.updatePassword': 'Şifreyi Güncelle',
        'settings.apiKeys': 'Gemini API Anahtarları',
        'settings.apiKeysDesc': 'Birden fazla anahtar ekleyebilirsiniz. Çalışan ilk anahtar otomatik kullanılır.',
        'settings.add': 'Ekle',
        'settings.testAll': '🔍 Tüm Anahtarları Test Et',
        'settings.apiGuideTitle': '🔑 API Anahtarı Nasıl Alınır?',
        'settings.apiGuide1': 'sayfasına gidin',
        'settings.apiGuide2': 'Google hesabınızla giriş yapın',
        'settings.apiGuide3': 'butonuna tıklayın',
        'settings.apiGuide4': 'anahtarını kopyalayın',
        'settings.apiGuide5': 'Yukarıdaki kutuya yapıştırıp',
        'settings.apiGuide5b': '\'ye basın',
        'settings.apiTip': '💡 Ücretsiz plan günlük kullanım için yeterlidir. Birden fazla anahtar ekleyebilirsiniz.',
        'settings.privacy': '🔒 Anahtarlarınız tarayıcınızda şifrelenmiş olarak saklanır. Sunucuya gönderilmez.',
        'settings.logout': 'Çıkış',

        // Admin
        'admin.title': 'Kullanıcılar',
        'admin.newUser': 'Yeni Kullanıcı',

        // Datasets
        'datasets.title': '📂 Veri Setleri',
        'datasets.copyPrompt': 'Kopya dosya adı:',

        // JSON Editor
        'editor.title': '📝 JSON Editör',
        'editor.save': '💾 Kaydet',
        'editor.export': '⬇ Dışa Aktar',
        'editor.format': '{ } Format',
        'editor.validate': '✓ Doğrula',
        'editor.addDipnot': '📌 Dipnot Ekle',
        'editor.arabic': '⌨ Arapça',
        'editor.close': '✕ Kapat',
        'editor.space': 'Boşluk',

        // Notes
        'notes.title': '📓 Notlarım',
        'notes.newNote': 'Yeni Not',
        'notes.deleteNote': 'Notu Sil',
        'notes.close': 'Kapat',
        'notes.placeholder': 'Not başlığı...',

        // HUD Tabs
        'hud.tabAyet': 'Ayet',
        'hud.tabRoots': 'Kökler',
        'hud.tabConnections': 'Bağlantılar',
        'hud.tabStats': 'İstatistik',
        'hud.tabAnalysis': 'Analiz',

        // HUD Content
        'hud.coordinate': 'KOORDİNAT',
        'hud.dipnot': 'Dipnot',
        'hud.noDipnot': 'Bu ayet için dipnot bulunmuyor.',
        'hud.speak': 'Seslendir',
        'hud.surah': 'Sure',
        'hud.rootAnalysisTitle': 'Sülâsi Kök Analizi',
        'hud.connectionsTitle': 'Semantik Bağlantılar',
        'hud.searchPlaceholder': 'Ayet, sure veya kök ara...',
        'hud.statsTitle': 'Kök İstatistikleri',
        'hud.analysisTitle': 'Kök Analiz Raporu',
        'hud.fullPanel': '🔬 Tam Analiz Paneli',
        'hud.noConnections': 'Bağlantı bulunamadı.',
        'hud.verseCount': '{count} Ayet',
        'hud.verse': 'Ayet',
        'hud.quranOverall': 'Kur\'an geneli',
        'hud.topSurahs': 'En Çok Geçtiği Sureler',
        'hud.ratio': 'Oran',

        // AI Analysis
        'ai.analyze': 'Yapay Zekâ Analizi',
        'ai.analyzing': 'Analiz ediliyor...',
        'ai.thinking': 'Yapay zekâ düşünüyor...',
        'ai.noResult': 'Analiz sonucu alınamadı.',
        'ai.error': 'Hata: {message}',

        // Root Analyzer
        'analyzer.bookTitle': 'Tüm Kitap — Büyük Resim',
        'analyzer.root': 'Kök',
        'analyzer.verse': 'Ayet',
        'analyzer.avgPerVerse': 'Ort/Ayet',
        'analyzer.unique': 'Tekil',
        'analyzer.top5': '🏆 En Yaygın 5 Kök',
        'analyzer.top3Bridges': '🌉 En Güçlü 3 Köprü Kök',
        'analyzer.thisVerse': '▾ Bu Ayet',
        'analyzer.rootCount': 'Kök Sayısı',
        'analyzer.connection': 'Bağlantı',
        'analyzer.crossSurah': 'Çapraz Sure',
        'analyzer.inVerses': '{count} ayette',
        'analyzer.inSurahs': '{count} surede',
        'analyzer.engineTitle': '🔬 Kök Analiz Motoru',
        'analyzer.surahCount': '{count} sure',
        'analyzer.verseCountNum': '{count} ayet',
        'analyzer.overview': 'Genel Bakış',
        'analyzer.totalRoots': 'Toplam Kök',
        'analyzer.totalVerses': 'Toplam Ayet',
        'analyzer.avgRootsPerVerse': 'Ort. Kök / Ayet',
        'analyzer.maxRootsInVerse': 'Maks. Kök (Tek Ayet)',
        'analyzer.avgConns': 'Ort. Bağlantı / Ayet',
        'analyzer.maxConns': 'Maks. Bağlantı',
        'analyzer.hapax': 'Hapax Legomena',
        'analyzer.hapaxDesc': 'Sadece 1 ayette geçen kökler',
        'analyzer.zipfTitle': 'Zipf Frekans Dağılımı',
        'analyzer.zipfAlpha': 'Zipf Üssü (α)',
        'analyzer.zipfR2': 'R² Uyum',
        'analyzer.zipfChartTitle': 'Kök Frekansı (İlk 80 Kök — Rank Sırası)',
        'analyzer.coOccTitle': 'Kök Co-occurrence Matrisi',
        'analyzer.coOccChartTitle': 'Kök Co-occurrence Matrisi (Top 20)',
        'analyzer.densityTitle': 'Sure × Kök Yoğunluk Haritası',
        'analyzer.densityChartTitle': 'Sure × Kök Yoğunluk Haritası (114 Sure × Top 20 Kök)',
        'analyzer.networkTitle': 'Ağ Metrikleri — Merkezilik & Köprüler',
        'analyzer.avgDegree': 'Ort. Derece',
        'analyzer.maxDegree': 'Maks. Derece',
        'analyzer.hubCount': 'Hub Sayısı',
        'analyzer.centralVerses': 'En Merkezi 10 Ayet (Degree Centrality)',
        'analyzer.clusterTitle': 'Kök Ailesi Kümeleme',
        'analyzer.exportJSON': '📥 JSON Rapor İndir',
        'analyzer.exportCSV': '📥 CSV Frekans Tablosu',

        // Header Brand
        'header.appTitle': 'Kur\'an-ı Kerim Kelime Kök Uzayı',
        'header.appSubtitle': '3D Semantik Analiz',
        'header.searchPlaceholder': 'Sure, koordinat, meal veya Arapça ara...',
        'header.arabicKeyboard': 'Arapça Klavye',

        // Stats Panel
        'stats.title': 'Sahne İstatistikleri',
        'stats.layout': 'Yerleşim',
        'stats.surahs': 'Sureler',
        'stats.ayahs': 'Ayetler',
        'stats.objects': '3D Nesne',
        'stats.uniqueRoots': 'Benzersiz Kökler',
        'stats.connectedRoots': 'Bağlı Kökler',
        'stats.lineCount': 'Çizgi Sayısı',
        'stats.fps': 'FPS',
        'stats.quality': 'Kalite',
        'stats.qualityHigh': '⚡ Yüksek',
        'stats.qualityLow': '🔋 Düşük',
        'stats.tipLayout': 'Aktif 3D uzay yerleşim modeli — Galaksi, Bulutsu, Küp, Küre veya الله kaligrafi',
        'stats.tipSurahs': 'Kur\'an-ı Kerim\'deki toplam sure sayısı',
        'stats.tipAyahs': 'Yüklenen veri setindeki toplam ayet sayısı',
        'stats.tipObjects': 'Sahnedeki toplam 3D nesne sayısı (sure merkezleri + ayetler)',
        'stats.tipRoots': 'Veri setinde bulunan farklı Arapça sülasi kök sayısı',
        'stats.tipConnected': 'En az iki ayette ortak geçen ve 3D çizgiyle bağlanan kök sayısı',
        'stats.tipLines': 'Ortak kökleri birbirine bağlayan 3D çizgi segmenti sayısı',
        'stats.tipFps': 'Saniyedeki kare sayısı — 60 ideal, 30 altı performans sorunu',
        'stats.tipQuality': 'Aktif render kalitesi — Yüksek: bloom efekti açık, Düşük: bloom kapalı (daha az GPU)',

        // Tooltip
        'tooltip.rootConnection': 'Kök Bağlantısı',
        'tooltip.inQuran': 'Kur\'anda {count} yerde',

        // Search
        'search.resultVerse': '{count} AYET',
        'search.resultSurah': '{count} SURE',
        'search.verse': 'AYET',
        'search.surah': 'SURE',
        'search.invalidJson': 'Geçersiz JSON',

        // TTS
        'tts.promptTR': 'Bu Türkçe duayı güçlü, tok ve kararlı bir erkek sesiyle oku. Her kelimeyi aynı ses yüksekliğinde, net ve güçlü söyle. Cümle sonlarında sesi kısma, son kelimeleri de güçlü bitir: ',
        'tts.promptTranslate': 'Translate the following Turkish prayer text into {lang} and read it aloud in {lang} with a strong, deep, assertive male voice. Pronounce every word at the same volume, clearly and powerfully. Do not lower your voice at the end of sentences: ',

        // Language
        'lang.title': 'Dil',
        'lang.templateExport': '📋 Çeviri Şablonu İndir',
        'lang.besmeleHint': 'Kendi dilinizde besmele sesi eklemek için: besmele_{code}.wav dosyasını locales/ klasörüne koyun.',

        // Common
        'common.close': 'Kapat',
        'common.save': 'Kaydet',
        'common.cancel': 'İptal',
        'common.error': 'Hata',
        'common.success': 'Başarılı',
        'common.rank': 'Rank',
        'common.top': 'üst',
        'common.online': 'çevrimiçi'
    };

    // ════════════════════════════════════════════════════════════
    // STATE
    // ════════════════════════════════════════════════════════════

    var _current = 'TR-tr';
    var _translations = { 'TR-tr': TR };
    var _available = [
        { code: 'TR-tr', name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷' }
    ];
    var _listeners = [];

    // ════════════════════════════════════════════════════════════
    // CORE — t() çeviri fonksiyonu
    // ════════════════════════════════════════════════════════════

    /** Ana çeviri fonksiyonu: t('hud.verse') veya t('hud.verseCount', {count: 5}) */
    var t = (key, params) => {
        var lang = _translations[_current];
        var val = (lang && lang[key] !== undefined) ? lang[key] : TR[key];
        if (val === undefined) return key;
        if (params) {
            Object.keys(params).forEach(function (k) {
                val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
            });
        }
        return val;
    };

    // ════════════════════════════════════════════════════════════
    // LOADER — JSON dil dosyaları
    // ════════════════════════════════════════════════════════════

    var _loadJSON = async (code) => {
        if (_translations[code]) return true;
        try {
            var resp = await fetch('locales/' + code + '.json');
            if (!resp.ok) return false;
            var data = await resp.json();
            _translations[code] = data;
            return true;
        } catch (e) {
            console.warn('i18n: ' + code + ' yüklenemedi:', e);
            return false;
        }
    };

    // ════════════════════════════════════════════════════════════
    // DISCOVER — Mevcut dil dosyalarını tarama
    // ════════════════════════════════════════════════════════════

    var _knownCodes = ['EN-en', 'RU-ru', 'IT-it', 'ES-es'];

    var discover = async () => {
        // Bilinen dilleri tara
        for (var i = 0; i < _knownCodes.length; i++) {
            var code = _knownCodes[i];
            try {
                var resp = await fetch('locales/' + code + '.json');
                if (resp.ok) {
                    var data = await resp.json();
                    _translations[code] = data;
                    if (!_available.find(function (a) { return a.code === code; })) {
                        _available.push({
                            code: code,
                            name: data.meta ? data.meta.name : code,
                            nativeName: data.meta ? data.meta.nativeName : code,
                            flag: data.meta ? data.meta.flag : '🌐'
                        });
                    }
                }
            } catch (e) { /* sessiz geç */ }
        }

        // Desktop: pywebview API ile ek dilleri keşfet
        if (typeof isDesktopMode !== 'undefined' && isDesktopMode &&
            window.pywebview && window.pywebview.api && window.pywebview.api.list_locales) {
            try {
                var files = await window.pywebview.api.list_locales();
                for (var j = 0; j < files.length; j++) {
                    var file = files[j];
                    var fc = file.replace('.json', '');
                    if (!_translations[fc]) {
                        try {
                            var r2 = await fetch('locales/' + file);
                            if (r2.ok) {
                                var d2 = await r2.json();
                                _translations[fc] = d2;
                                _available.push({
                                    code: fc,
                                    name: d2.meta ? d2.meta.name : fc,
                                    nativeName: d2.meta ? d2.meta.nativeName : fc,
                                    flag: d2.meta ? d2.meta.flag : '🌐'
                                });
                            }
                        } catch (e) { /* sessiz geç */ }
                    }
                }
            } catch (e) { /* pywebview API yok */ }
        }
    };

    // ════════════════════════════════════════════════════════════
    // SET LANGUAGE
    // ════════════════════════════════════════════════════════════

    var setLanguage = async (code) => {
        if (code !== 'TR-tr') {
            var loaded = await _loadJSON(code);
            if (!loaded) {
                console.warn('i18n: Dil yüklenemedi, Türkçe\'ye dönülüyor:', code);
                code = 'TR-tr';
            }
        }
        _current = code;
        localStorage.setItem('sg_language', code);
        applyTranslations();
        _updateBesmeleAudio();
        _renderSelector();
        // Event
        _listeners.forEach(function (fn) { try { fn(code); } catch (e) { } });
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { code: code } }));
        return true;
    };

    // ════════════════════════════════════════════════════════════
    // APPLY — DOM data-i18n elemanlarını güncelle
    // ════════════════════════════════════════════════════════════

    var applyTranslations = () => {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            var attr = el.getAttribute('data-i18n-attr');
            var val = t(key);
            if (attr) {
                el.setAttribute(attr, val);
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = val;
            } else {
                el.textContent = val;
            }
        });
    };

    // ════════════════════════════════════════════════════════════
    // DETECT — Tarayıcı / OS dili otomatik algılama
    // ════════════════════════════════════════════════════════════

    var _detect = () => {
        var saved = localStorage.getItem('sg_language');
        if (saved) return saved;
        var lang = (navigator.language || navigator.userLanguage || 'tr').toLowerCase();
        var prefix = lang.split('-')[0];
        var map = { tr: 'TR-tr', en: 'EN-en', ru: 'RU-ru', it: 'IT-it', es: 'ES-es' };
        return map[prefix] || 'TR-tr';
    };

    // ════════════════════════════════════════════════════════════
    // BESMELE — Dil bazlı ses dosyası
    // ════════════════════════════════════════════════════════════

    var _updateBesmeleAudio = () => {
        var audio = document.getElementById('besmele-audio');
        if (!audio) return;
        var lang = _translations[_current];
        var src = (lang && lang.meta && lang.meta.besmeleAudio) ? lang.meta.besmeleAudio : 'besmele.wav';
        // locales/ klasöründeki dosyaları dene, yoksa fallback
        if (_current !== 'TR-tr') {
            audio.src = 'locales/' + src;
            audio.onerror = function () { audio.src = 'besmele.wav'; audio.onerror = null; };
        } else {
            audio.src = 'besmele.wav';
        }
    };

    // ════════════════════════════════════════════════════════════
    // LANGUAGE SELECTOR — Header dropdown
    // ════════════════════════════════════════════════════════════

    var _selectorOpen = false;

    var _renderSelector = () => {
        var wrap = document.getElementById('lang-selector-wrap');
        if (!wrap) return;
        var cur = _available.find(function (a) { return a.code === _current; }) || _available[0];
        var btn = document.getElementById('lang-btn');
        if (btn) {
            btn.innerHTML = cur.flag + ' <span class="lang-btn-code">' + _current.split('-')[0] + '</span>';
            btn.title = cur.nativeName;
        }
    };

    var toggleSelector = () => {
        var menu = document.getElementById('lang-menu');
        if (!menu) return;
        _selectorOpen = !_selectorOpen;
        if (_selectorOpen) {
            menu.innerHTML = _available.map(function (a) {
                return '<button class="lang-option' + (a.code === _current ? ' active' : '') +
                    '" onclick="I18n.selectLang(\'' + a.code + '\')">' +
                    a.flag + ' ' + a.nativeName + '</button>';
            }).join('');
            menu.classList.remove('hidden');
        } else {
            menu.classList.add('hidden');
        }
    };

    var selectLang = async (code) => {
        var menu = document.getElementById('lang-menu');
        if (menu) menu.classList.add('hidden');
        _selectorOpen = false;
        await setLanguage(code);
        // HUD açıksa yeniden render
        if (typeof currentHudNode !== 'undefined' && currentHudNode && typeof showHUD === 'function') {
            showHUD(currentHudNode);
        }
    };

    // ════════════════════════════════════════════════════════════
    // TEMPLATE EXPORT — Yeni dil şablonu indirme
    // ════════════════════════════════════════════════════════════

    var exportTemplate = () => {
        var template = {};
        template.meta = { code: 'XX-xx', name: 'Language Name', nativeName: 'Native Name', flag: '🌐', direction: 'ltr', besmeleAudio: 'besmele_xx.wav' };
        // Tüm TR anahtarlarını kopyala (meta hariç)
        Object.keys(TR).forEach(function (k) {
            if (k !== 'meta') template[k] = TR[k];
        });
        var blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'XX-xx.json';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    // ════════════════════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════════════════════

    var init = async () => {
        await discover();
        var detected = _detect();
        await setLanguage(detected);
    };

    // ════════════════════════════════════════════════════════════
    // ON CHANGE LISTENER
    // ════════════════════════════════════════════════════════════

    var onChange = (fn) => { _listeners.push(fn); };

    // ════════════════════════════════════════════════════════════
    // PUBLIC API
    // ════════════════════════════════════════════════════════════

    return {
        t: t,
        setLanguage: setLanguage,
        getLanguage: function () { return _current; },
        getAvailable: function () { return _available; },
        init: init,
        applyTranslations: applyTranslations,
        toggleSelector: toggleSelector,
        selectLang: selectLang,
        exportTemplate: exportTemplate,
        onChange: onChange,
        getTR: function () { return TR; },
        getBesmeleAudio: function () {
            var lang = _translations[_current];
            if (_current === 'TR-tr') return 'besmele.wav';
            return (lang && lang.meta && lang.meta.besmeleAudio) ? 'locales/' + lang.meta.besmeleAudio : 'besmele.wav';
        }
    };
})();

/** Global shortcut */
var t = I18n.t;
