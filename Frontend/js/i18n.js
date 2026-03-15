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

        // DB Grid Editor
        'editor.dbTitle': 'Veritabani Editoru',
        'editor.tabVerses': 'Ayetler',
        'editor.tabRoots': 'Kokler',
        'editor.tabTranslations': 'Ceviriler',
        'editor.arabic': '⌨ Arapca Klavye',
        'editor.close': '✕ Kapat',
        'editor.loading': 'Yukleniyor',
        'editor.loadError': 'Yukleme hatasi',
        'editor.searchPlaceholder': 'Ara...',
        'editor.allLanguages': 'Tum Diller',
        'editor.colId': 'ID',
        'editor.colSurah': 'Sure',
        'editor.colText': 'Ayet Metni',
        'editor.colMeal': 'Meal',
        'editor.colRoots': 'Kokler',
        'editor.colDipnot': 'Dipnot',
        'editor.colRoot': 'Kok',
        'editor.colMeaningTr': 'Anlam (TR)',
        'editor.colMeaningAr': 'Anlam (AR)',
        'editor.colPronunciation': 'Telaffuz',
        'editor.colVerseCount': 'Ayet Sayisi',
        'editor.colDerived': 'Turetilmis',
        'editor.colLang': 'Dil',
        'editor.colMeaning': 'Anlam',
        'editor.colActions': 'Islemler',
        'editor.addRoot': 'Kok Ekle',
        'editor.exportJson': 'JSON Aktar',
        'editor.dblClickEdit': 'Duzenlemek icin cift tikla',
        'editor.noResults': 'Sonuc bulunamadi.',
        'editor.records': 'kayit',
        'editor.page': 'Sayfa',
        'editor.showing': 'gosteriliyor',
        'editor.saved': 'Kaydedildi',
        'editor.enterRoot': 'Yeni kok anahtarini girin (Arapca):',
        'editor.enterMeaning': 'Anlami (Turkce):',
        'editor.rootAdded': 'Kok eklendi',
        'editor.confirmDelete': '{root} koku silinsin mi? Bu islem geri alinamaz.',
        'editor.rootDeleted': 'Kok silindi',
        'editor.deleteRoot': 'Koku Sil',
        'editor.deleteError': 'Silme hatasi',
        'editor.exportDone': 'JSON dosyalari aktarildi',
        'editor.saveError': 'Kaydetme hatasi',
        'editor.desktopOnly': 'Bu ozellik sadece masaustu modunda kullanilabilir.',
        'editor.tabLogs': 'Loglar',
        'editor.logTable': 'Tablo',
        'editor.logRecord': 'Kayit ID',
        'editor.logAction': 'Islem',
        'editor.logField': 'Alan',
        'editor.logOldVal': 'Eski Deger',
        'editor.logNewVal': 'Yeni Deger',
        'editor.logUser': 'Kullanici',
        'editor.logDate': 'Tarih',
        'editor.allTables': 'Tum Tablolar',
        'editor.kbSpace': 'Bosluk',
        'editor.kbBackspace': '⌫ Sil',
        'editor.tabAudit': 'Denetim',
        'audit.dataScore': 'Veri Kalite Skoru',
        'audit.verses': 'Ayet',
        'audit.roots': 'Kok',
        'audit.surahs': 'Sure',
        'audit.surah': 'Sure',
        'audit.total': 'Toplam',
        'audit.completeness': 'Tamamlanma',
        'audit.emptyMeal': 'Bos Meal',
        'audit.noRoots': 'Koku Yok',
        'audit.emptyDipnot': 'Bos Dipnot',
        'audit.emptyMeaning': 'Anlami Bos Kok',
        'audit.emptyPronunciation': 'Telaffuzu Bos',
        'audit.orphanRoots': 'Yetim Kokler',
        'audit.undefinedRoots': 'Tanimsiz Kokler',
        'audit.fkViolations': 'FK Ihlali',
        'audit.missingTranslations': 'Eksik Kok Cevirileri',
        'audit.missingCount': 'eksik',
        'audit.emptyMealList': 'Meali Bos Ayetler',
        'audit.noRootsList': 'Koku Olmayan Ayetler',
        'audit.emptyMeaningList': 'Anlami Bos Kokler',
        'audit.orphanRootsList': 'Yetim Kokler (hicbir ayette kullanilmiyor)',
        'audit.undefinedRootsList': 'Tanimsiz Kokler (ayette var, sozlukte yok)',
        'audit.surahSummary': 'Sure Bazli Ozet',
        // Sync Management
        'editor.tabSync': 'Senkronizasyon',
        'sync.title': 'DB ↔ Site Senkronizasyon Yonetimi',
        'sync.step1': 'Adim 1: Yedek Al',
        'sync.step2': 'Adim 2: Tarama',
        'sync.step3': 'Adim 3: Inceleme',
        'sync.step4': 'Adim 4: Duzeltme',
        'sync.step5': 'Adim 5: Bildirim',
        'sync.backupBtn': 'DB Yedegi Olustur',
        'sync.backupSuccess': 'Yedek olusturuldu',
        'sync.backupRequired': 'Devam etmeden once yedek alinmalidir!',
        'sync.scanBtn': 'Taramayi Baslat',
        'sync.scanning': 'Taraniyor',
        'sync.scanComplete': 'Tarama tamamlandi',
        'sync.noDiffs': 'Fark bulunamadi — DB guncel',
        'sync.diffsFound': '{count} fark bulundu',
        'sync.fixBtn': 'Duzeltmeleri Uygula',
        'sync.fixConfirm': 'Tum farkliliklari siteye gore guncellemek istediginize emin misiniz?',
        'sync.fixSuccess': '{count} kayit guncellendi',
        'sync.notifyBtn': 'Kullanicilari Bilgilendir',
        'sync.notifySuccess': '{count} kullaniciya bildirim gonderildi',
        'sync.dbSize': 'DB Boyutu',
        'sync.lastBackup': 'Son Yedek',
        'sync.noBackup': 'Yedek yok',
        'sync.source': 'Kaynak: Sueleymaniye Vakfi',
        'sync.surah': 'Sure',
        'sync.diffType': 'Fark Turu',
        'sync.diffCount': 'Adet',
        'sync.fieldAyet': 'Arapca',
        'sync.fieldMeal': 'Meal',
        'sync.fieldDipnot': 'Dipnot',
        'sync.totalDiffs': 'Toplam Fark',
        'sync.totalFixes': 'Duzeltilecek',
        'sync.progress': '{current} / {total}',
        'sync.status.ok': 'Eslesme',
        'sync.status.diff': 'Farkli',
        'sync.status.error': 'Hata',
        'sync.backups': 'Yedekler',
        'sync.fixingAll': 'Duzeltmeler uygulanıyor...',
        'sync.fieldTefsir': 'Tefsir',
        'sync.parseMethod': 'Parser',
        'sync.aiStatus': 'AI Parser',
        'sync.parserBuiltin': 'Standart',
        'sync.parserGenerated': 'AI Uretimi',
        'sync.parserAI': 'Canli AI',
        'sync.claudeConfig': 'Claude AI Yapilandirmasi',
        'sync.claudeKeyDesc': 'Site yapisi degisirse AI otomatik uyum saglar. Claude API anahtari ekleyin (istege bagli).',
        'sync.claudeKeyAdd': 'Ekle',
        'sync.claudeKeyOk': 'Claude API anahtari aktif',
        'sync.claudeKeyFail': 'Claude API anahtari gecersiz',
        'apikey.noKeys': 'Henuz API anahtari eklenmedi.',
        'common.delete': 'Sil',

        // Notes
        'notes.title': '📓 Notlarım',
        'notes.newNote': 'Yeni Not',
        'notes.deleteNote': 'Notu Sil',
        'notes.close': 'Kapat',
        'notes.placeholder': 'Not başlığı...',

        'notes.deleteConfirm': 'Bu notu silmek istediginize emin misiniz?',
        'notes.linkUrlPrompt': 'Baglanti URLsi:',
        'notes.insertLink': 'Baglanti Ekle',

        // Modal Dialog
        'modal.ok': 'Tamam',
        'modal.cancel': 'Iptal',
        'modal.confirm': 'Onay',
        'modal.info': 'Bilgi',
        'modal.input': 'Giris',
        'modal.deleteUserConfirm': 'silinsin mi?',
        // HUD Tabs
        'hud.tabAyet': 'Ayet',
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
        'hud.navFirst': 'İlk Ayet',
        'hud.navPrev': 'Önceki Ayet',
        'hud.navNext': 'Sonraki Ayet',
        'hud.navLast': 'Son Ayet',

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
        'analyzer.hapax': 'Tek Geçen Kök',
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
        'analyzer.exportSuccess': 'Dosya basariyla kaydedildi.',

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
        'tooltip.noRootInfo': 'Bu kök için detay bilgisi henüz yüklenmedi.',
        'tooltip.inQuranCount': 'Kur\'anda {count} yerde geçiyor',
        'tooltip.derivedWords': 'TÜREMİŞ KELİMELER',

        // Search
        'search.resultVerse': '{count} AYET',
        'search.resultSurah': '{count} SURE',
        'search.verse': 'AYET',
        'search.surah': 'SURE',
        'search.invalidJson': 'Geçersiz JSON',

        // TTS
        'tts.prompt': 'Bu Türkçe duayı güçlü, tok ve kararlı bir erkek sesiyle oku. Her kelimeyi aynı ses yüksekliğinde, net ve güçlü söyle. Cümle sonlarında sesi kısma, son kelimeleri de güçlü bitir: ',

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
        'common.online': 'çevrimiçi',

        // API Key
        'apikey.active': '✓ Aktif',
        'apikey.error': '✗ Hata',
        'apikey.pending': '? Bekliyor',

        // Auth
        'auth.connectionError': 'Sunucuya bağlanılamadı',

        // Notes
        'notes.untitled': 'Başlıksız Not',

        // Zipf Analysis
        'analyzer.zipfStrong': '✅ Kök frekansları güçlü Zipf yasası uyumu gösteriyor — doğal dil dağılımıyla örtüşüyor.',
        'analyzer.zipfModerate': '⚠️ Orta düzey Zipf uyumu — kısmen doğal dil dağılımı, kısmen yapısal düzenlilik.',
        'analyzer.zipfLow': '🔬 Düşük Zipf uyumu — kök dağılımı doğal dilden sapma gösteriyor, yapısal bir düzen mevcut olabilir.'
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
    // LOADER — SQLite API'den dil yukle
    // ════════════════════════════════════════════════════════════

    var _loadJSON = async (code) => {
        if (_translations[code]) return true;
        try {
            var resp = await fetch('/api/db/locale/' + code);
            if (!resp.ok) throw new Error('API fail');
            var data = await resp.json();
            _translations[code] = data;
            return true;
        } catch (e) {
            // Web mod fallback — sql.js
            if (typeof WebDB !== 'undefined' && WebDB._ready) {
                var data = WebDB.getLocale(code);
                if (data && Object.keys(data).length > 0) {
                    _translations[code] = data;
                    return true;
                }
            }
            console.warn('i18n: ' + code + ' yuklenemedi:', e);
            return false;
        }
    };

    // ════════════════════════════════════════════════════════════
    // DISCOVER — Mevcut dilleri SQLite'tan tarama
    // ════════════════════════════════════════════════════════════

    var discover = async () => {
        try {
            var resp = await fetch('/api/db/locales');
            if (!resp.ok) throw new Error('API fail');
            var langs = await resp.json();
            for (var i = 0; i < langs.length; i++) {
                var meta = langs[i];
                var code = meta.lang;
                if (!_available.find(function (a) { return a.code === code; })) {
                    _available.push({
                        code: code,
                        name: meta.name || code,
                        nativeName: meta.native_name || code,
                        flag: meta.flag || ''
                    });
                }
            }
        } catch (e) {
            // Web mod fallback — sql.js
            if (typeof WebDB !== 'undefined' && WebDB._ready) {
                var langs = WebDB.getLocales();
                for (var i = 0; i < langs.length; i++) {
                    var meta = langs[i];
                    var code = meta.lang;
                    if (!_available.find(function (a) { return a.code === code; })) {
                        _available.push({
                            code: code,
                            name: meta.name || code,
                            nativeName: meta.native_name || code,
                            flag: meta.flag || ''
                        });
                    }
                }
            }
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
        // Desktop: dil tercihini dosyaya yaz (besmele ses dosyası seçimi için)
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_lang_pref) {
            try { window.pywebview.api.save_lang_pref(code); } catch(e) {}
        }
        applyTranslations();
        _updateBesmeleAudio();
        _renderSelector();
        _loadRootTranslations(code);
        // Event
        _listeners.forEach(function (fn) { try { fn(code); } catch (e) { } });
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { code: code } }));
        return true;
    };

    var _loadRootTranslations = async (code) => {
        if (typeof rootTranslations === 'undefined') return;
        if (code === 'TR-tr') { rootTranslations = {}; return; }
        var lang = code.split('-')[0].toLowerCase();
        try {
            var resp = await fetch('/api/db/root-translations/' + lang);
            if (resp.ok) { rootTranslations = await resp.json(); }
            else { rootTranslations = {}; }
        } catch(e) { rootTranslations = {}; }
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

    // SVG bayraklar — CountryFlags modülünden alınır (flags.js)
    var _getFlag = (code) => { return typeof CountryFlags !== 'undefined' ? CountryFlags.get(code) : code.split('-')[0]; };

    var _renderSelector = () => {
        var wrap = document.getElementById('lang-selector-wrap');
        if (!wrap) return;
        var cur = _available.find(function (a) { return a.code === _current; }) || _available[0];
        var btn = document.getElementById('lang-btn');
        if (btn) {
            btn.innerHTML = _getFlag(_current) + ' <span class="lang-btn-code">' + _current.split('-')[0] + '</span>';
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
                    _getFlag(a.code) + ' ' + a.nativeName + '</button>';
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

    var updateTranslation = (code, data) => {
        _translations[code] = data;
        if (code === _current) applyTranslations();
    };

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
        updateTranslation: updateTranslation,
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
