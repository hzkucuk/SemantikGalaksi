# CHANGELOG

## [0.38.1] - 2025-07-28
### Dökümantasyon
- **README Kapsamlı Güncelleme**: Öne Çıkan Özellikler'e 4 yeni bölüm (APPDATA koruması, mobil destek, uygulama ikonu, kullanıcı verileri), Mimari diyagramında %APPDATA% veri katmanı ayrımı, Proje Yapısı'na yeni dosyalar, MSI bölümü çift build + ikon + APPDATA, Sürüm Geçmişi v0.35–0.38, Teknoloji Yığını'na cx_Freeze
- **Etkilenen dosya:** `README.md`

## [0.38.0] - 2025-07-28
### Release
- **v0.38.0 Release**: Uygulama ikonu (ay-yıldız) + kullanıcı verileri %APPDATA% koruması içeren kararlı sürüm
- **Etkilenen dosyalar:** `setup.py`, `app_icon.ico`, `DataEngine/desktop_app.py`

## [0.37.1] - 2025-07-28
### İyileştirme
- **Uygulama İkonu**: Ay-yıldız tasarımlı uzay temalı ikon eklendi — EXE, MSI installer, masaüstü ve başlat menüsü kısayollarında görünür
- **Etkilenen dosyalar:** `app_icon.ico`, `setup.py`

## [0.37.0] - 2025-07-28
### Release
- **v0.37.0 Release**: Kullanıcı verileri artık %APPDATA% altında korunuyor — MSI kaldırılsa bile notlar, veri setleri ve API anahtarları güvende
- **Otomatik Migrasyon**: Eski kurulum dizinindeki veriler ilk çalıştırmada yeni konuma kopyalanır
- **Etkilenen dosya:** `DataEngine/desktop_app.py`

## [0.36.1] - 2025-07-28
### İyileştirme
- **Kullanıcı Verileri Koruması**: Notlar, veri setleri, API anahtarları ve config artık `%APPDATA%/SemantikGalaksi` altında saklanıyor — MSI kaldırılsa bile veriler korunur
- **Otomatik Migrasyon**: Eski kurulum dizinindeki mevcut veriler ilk çalıştırmada otomatik olarak yeni konuma kopyalanır
- **Etkilenen dosya:** `DataEngine/desktop_app.py`

## [0.36.0] - 2025-07-28
### Release
- **v0.36.0 Release**: Mobil iyileştirmeler ve düzeltmeler içeren kararlı sürüm
- **Etkilenen dosyalar:** Tüm proje

## [0.35.3] - 2025-07-28
### Düzeltme
- **Mobil Landscape Header**: Header butonları artık mobil yatay modda ekrana sığıyor — label'lar gizlenir, butonlar ve padding küçültülür (`max-height: 500px` media query)
- **Etkilenen dosya:** `Frontend/index.html`

## [0.35.2] - 2025-07-28
### Düzeltme
- **Mobil Touch Desteği**: Mobilde çizgilere ve kürelere dokunma artık çalışıyor — `touchend` (tıklama) ve `touchmove` (hover/tooltip) event'leri eklendi
- **Etkilenen dosya:** `Frontend/js/scene-init.js`

## [0.35.1] - 2025-07-28
### İyileştirme
- **Mobil Landscape Zorlama**: Mobil cihazlarda uygulama yalnızca yatay modda çalışır — dikey modda “Cihazınızı Yatay Çevirin” uyarısı gösterilir
- **Web Mod Buton Kısıtlaması**: Web modda "Veri Oku", "Veri Setleri" ve "JSON Editör" butonları soluklaştırılıp devre dışı bırakılır, üstüne gelindiğinde "Lokal çalışma versiyonunda kullanılabilir" tooltip gösterilir
- **Etkilenen dosyalar:** `Frontend/index.html`, `Frontend/js/loading.js`

## [0.35.0] - 2025-07-28
### Release
- **v0.35.0 Release**: TTS düzeltmesi + Otomatik güncelleme sistemi içeren kararlı sürüm
- **Otomatik Güncelleme**: GitHub Release kontrolü, ZIP yedekleme (uygulama klasörü/backups/), sessiz MSI kurulumu
- **TTS Fix**: `temperature:0` kaldırıldı (HTTP 500 hatasına neden oluyordu)
- **Etkilenen dosyalar:** `DataEngine/updater.py`, `DataEngine/desktop_app.py`, `setup.py`, `Frontend/js/audio.js`, `Frontend/besmele.wav`

## [0.34.4] - 2025-07-28
### Düzeltme
- **TTS Düzeltme**: `temperature: 0` parametresi Gemini TTS API'da HTTP 500 hatasına neden oluyordu — kaldırıldı, TTS yeniden çalışır durumda
- **Besmele Yenileme**: `besmele.wav` yeni API anahtarı ile yeniden oluşturuldu
### Özellik
- **Otomatik Güncelleme Sistemi**: Masaüstü EXE açılışta GitHub Release API üzerinden yeni sürüm kontrolü yapar. Güncelleme varsa bildirim gösterir, kullanıcı onaylarsa mevcut verileri (webview_data, notes, config.json, datasets, DB) ZIP olarak yedekler ve yeni MSI'yı indirip kurar. Veri kaybı olmaz.
- **Etkilenen dosyalar:** `Frontend/js/audio.js`, `DataEngine/generate_besmele_audio.py`, `Frontend/besmele.wav`, `DataEngine/updater.py` (yeni), `DataEngine/desktop_app.py`, `setup.py`

## [0.34.3] - 2025-07-28
### İyileştirme
- **TTS Ses Tutarlılığı**: `temperature: 0` eklendi — Gemini TTS artık deterministik ses üretiyor, her çağrıda aynı kararlı ses tonu
- **API Temizliği**: İstek gövdesinden gereksiz `model` alanı kaldırıldı (URL'de zaten mevcut)
- **Etkilenen dosyalar:** `Frontend/js/audio.js`, `DataEngine/generate_besmele_audio.py`

## [0.34.2] - 2025-07-28
### Düzeltme
- **HUD Kök Detay Paneli**: Üstteki köklere tıklandığında türemiş kelimeler paneli artık köklerin hemen altında açılıyor (en alta düşme sorunu giderildi)
### İyileştirme
- **MSI Derleme Politikası**: Patch 1-4 arası sadece git push, patch 5'te MINOR artırılıp release derlemesi yapılır
- **Etkilenen dosyalar:** `Frontend/js/tooltip.js`, `.github/copilot-instructions.md`

## [0.34.1] - 2025-07-28
### Düzeltme
- **TTS Ses Kalitesi**: Besmele ile birebir aynı ses pipeline'ı — PCM normalizasyon (peak→28000) eklendi, prompt "duayı" tonuyla eşlendi, cılız ses sorunu giderildi
- **Etkilenen dosya:** `Frontend/js/audio.js`

## [0.34.0] - 2025-07-28
### Özellik
- **Son Konum Hafızası**: Kullanıcının son ziyaret ettiği ayet `localStorage`'a kaydedilir — uygulama yeniden açıldığında Fatiha yerine kaldığı yerden devam eder (EXE + Web)
- **Etkilenen dosyalar:** `Frontend/js/warp.js`, `Frontend/js/data-loader.js`

## [0.33.3] - 2025-07-28
### İyileştirme
- **GitHub Release Dual MSI**: `release.yml` artık hem Server hem Client MSI üretip release'e ekliyor — tek MSI yerine iki paket yayınlanıyor
- **Etkilenen dosya:** `.github/workflows/release.yml`

## [0.33.2] - 2025-07-28
### Performans
- **Yıldız Partikülleri Kaldırıldı**: 120.000 yıldız partikülü ve shader sistemi kaldırıldı — milkyway.jpg skybox + nebula bulutları yeterli arka plan sağlıyor, gereksiz GPU yükü ortadan kalktı
- **Etkilenen dosyalar:** `Frontend/js/scene-init.js`, `Frontend/js/warp.js`, `Frontend/js/state.js`

## [0.33.1] - 2025-07-28
### Düzeltme
- **Seslendirme Kesintisi**: Mouse hareket edince çalan ses artık kesilmiyor — `hideTooltip` ve `closeHudTooltip`'ten `stopAudio()` çağrısı kaldırıldı
- **AI TTS Ses Kalitesi**: Seslendirme sesi Charon → Orus olarak değiştirildi, besmele ile aynı kaliteli Türkçe prompt eklendi
### İyileştirme
- **HUD İstatistik Konumu**: Kök istatistikleri HUD panelinde en alta taşındı — Semantik Bağlantılar listesinin altında ayrı bölüm olarak gösterilir
- **Etkilenen dosyalar:** `Frontend/js/tooltip.js`, `Frontend/js/audio.js`, `Frontend/index.html`

## [0.33.0] - 2025-07-28
### Özellik
- **MSI Server/Client Modu**: Kurulum sırasında Server veya Client seçimi — Client modunda JSON veri dosyaları hariç tutulur (sunucudan alınır)
- **Besmele Meali Güncelleme**: Açılış ekranı Süleymaniye Vakfı mealine güncellendi — "İyiliği sonsuz, ikramı bol Allah'ın adıyla"
- **Kök Renk Paleti İyileştirme**: 11 hue → 16 ayrık HSL renk, index bazlı atama — aynı sayfadaki kökler asla aynı rengi almaz
- **Etkilenen dosyalar:** `setup.py`, `build_msi.bat`, `Frontend/index.html`, `Frontend/js/constants.js`, `Frontend/js/hud.js`, `Frontend/js/highlight.js`, `DataEngine/generate_besmele_audio.py`

## [0.32.2] - 2025-07-28
### Düzeltme
- **Zayıf Harf Eşdeğerlik Kontrolü**: İndirgenmiş kök eşleşmesinde (weak letter drop) ا/و/ي eşdeğerliği devre dışı bırakıldı — `سحروا`→`وحي` gibi sahte eşleşmeler engellendi
- **Etkilenen dosya:** `Frontend/js/highlight.js`

## [0.32.1] - 2025-07-28
### Düzeltme
- **Arapça Kök Vurgulama**: Şedde (ّ) harfi artık doğru işleniyor — tekrarlı kök harfleri (ربب, حيي) eşleşebiliyor
- **Yanlış Pozitif Engelleme**: Span kontrolü ve kelime uzunluk kısıtı eklendi — uzak harflerle sahte eşleşmeler engellendi
- **Etkilenen dosya:** `Frontend/js/highlight.js`

## [0.32.0] - 2025-07-28
### Özellik
- **Sure Seslendirme**: HUD paneline mor 📖 buton eklendi — Süleymaniye Vakfı MP3 ile tam sure dinleme
- **Ayet TTS Ayrımı**: Mevcut ▶ butonu eski davranışa döndürüldü (Gemini TTS → Tarayıcı TTS), MP3 ayrı butona taşındı
- **Eksik Dipnot Bildirimi**: Dipnotu bulunmayan ayetlerde bilgilendirme mesajı gösterilir
- **Etkilenen dosyalar:** `Frontend/js/hud.js`, `Frontend/index.html`

## [0.31.1] - 2025-07-28
### Düzeltme
- **Referans Düzeltmeleri**: 3 hatalı ayet referansı düzeltildi
  - `2:173`: `16:145` → `16:115` (Nahl 16/115)
  - `74:56`: `81:30` → `81:29` (Tekvir 29 ayet)
  - `76:30`: `81:30` → `81:29` (Tekvir 29 ayet)
- Hadis, sayfa ve oran referanslarına dokunulmadı (referans bütünlüğü korundu)
- **Etkilenen dosya:** `Frontend/quran_data.json`

## [0.31.0] - 2025-07-28
### Özellik
- **Zengin Veri Entegrasyonu**: `full_quran_rich_map.json` verileri `quran_data.json` ile birleştirildi (6236 node korundu)
  - `dipnot_parsed`: Yapılandırılmış dipnotlar — tıklanabilir ayet referans linkleri (warp navigasyonu)
  - `mapping_data`: Çapraz referans haritası — her ayetin tefsir bazlı bağlantıları
  - `tefsir_popup`: Detaylı tefsir içeriği (metin + ayet linkleri)
  - `audio`: Süleymaniye Vakfı ses dosyası URL'leri (6088 ayet)
- **Zengin Dipnot Gösterimi**: HUD dipnot alanı artık `dipnot_parsed` ile render edilir — ayet referansları tıklanabilir link olarak gösterilir, tıklayınca ilgili ayete warp yapılır
- **Doğrudan Ses Oynatma**: `audio` URL'si mevcutsa öncelikli olarak MP3 dosyası oynatılır (fallback: Gemini TTS → Tarayıcı TTS)
- **Etkilenen dosyalar:** `Frontend/quran_data.json`, `Frontend/js/hud.js`

## [0.30.4] - 2025-07-28
### İyileştirme
- **MSI Boyut Optimizasyonu**: Gereksiz paketler exclude edildi, 32.5 MB → 15.9 MB
  - Çıkarılan: numpy, PIL/Pillow, pygments, IPython, PyInstaller, prompt_toolkit, jedi, parso, matplotlib, scipy, pandas
- **Etkilenen dosyalar:** `setup.py`

## [0.30.3] - 2025-07-28
### İyileştirme
- **Stats Panel Tooltip**: İstatistik panelindeki her satıra hover tooltip eklendi; her metriğin ne anlama geldiği açıklanıyor
- Grid yapıdan flex satır yapısına geçildi, `.stat-row` hover efekti ve CSS `::after` tooltip eklendi
- **Etkilenen dosyalar:** `Frontend/index.html`

## [0.30.2] - 2025-07-28
### İyileştirme
- **Tek Kaynak Versiyon Sistemi**: `VERSION` dosyası tek kaynak; `setup.py`, `build_msi.bat`, `index.html` otomatik okur
  - `VERSION` dosyasını değiştirmek tüm sistemi günceller
  - `build_msi.bat` build öncesi `state.js`'i otomatik senkronize eder
  - `index.html` badge'i `APP_VERSION` global değişkeninden dinamik doldurulur
- **Etkilenen dosyalar:** `VERSION` (yeni), `setup.py`, `build_msi.bat`, `Frontend/js/state.js`, `Frontend/index.html`

## [0.30.1] - 2025-07-28
### Düzeltme
- **Loading Screen Opaklık**: Açılış ekranı arka planı `rgba(0,0,0,0.82)` → `#000` (tam opak) yapıldı; arkadaki Three.js sahnesi artık loading sırasında görünmüyor
- **Etkilenen dosyalar:** `Frontend/index.html`

## [0.30.0] - 2025-07-28
### İyileştirme
- **Metrik Paneli Varsayılan Görünüm**: İstatistik paneli artık ilk açılışta görünür, kullanıcı ✕ ile kapatabilir
- **HUD Font Boyutu Artışı**: Küçük ekranlarda okunamayan metinler düzeltildi
  - KOORDİNAT: 9px → 11px (mobil), 10px → 12px (masaüstü)
  - Sülâsi Kök Analizi: 8px → 11px (mobil), 9px → 12px (masaüstü)
  - Semantik Bağlantılar: 9px → 11px (mobil), 12px (masaüstü)
  - Kur'an geneli: 9px → 11px
  - Ayet/Sure/Oran etiketleri: 8px → 10px
  - En Çok Geçtiği Sureler: 8px → 10px
  - root-pron: 7px → 9px (mobil)
- **Responsive İyileştirmeler**: Stats paneli, header butonları ve root kartları mobil cihazlara uyumlu hale getirildi
- **Etkilenen dosyalar:** `Frontend/index.html`, `Frontend/js/hud.js`

## [0.29.0] - 2025-07-28
### Özellik
- **İstatistik Paneli (📊)**: Sahne metriklerini gerçek zamanlı gösteren HUD paneli
  - Sure sayısı, ayet sayısı, toplam düğüm, benzersiz kök, bağlı kök, çizgi sayısı
  - Anlık FPS sayacı (saniyede 1 güncelleme)
  - Aktif yerleşim modeli ve performans kalitesi gösterimi
  - Toolbar'da 📊 toggle butonu
  - Uzay temalı, şeffaf, kompakt grid tasarım
- **Etkilenen dosyalar:** `Frontend/js/state.js`, `Frontend/js/data-loader.js`, `Frontend/js/warp.js`, `Frontend/index.html`

## [0.28.0] - 2025-07-28
### Özellik
- **Performans Modu Sistemi**: Zayıf cihazlar için otomatik algılama + manuel toggle
  - **Otomatik algılama**: Mobil cihaz, Intel/Mesa/SwiftShader GPU, ≤4 CPU çekirdeği tespit edilirse düşük mod aktif
  - **Bloom toggle**: UnrealBloomPass açılıp kapatılır (en büyük GPU tasarrufu)
  - **Pixel ratio**: Düşük modda 1×, yüksek modda `devicePixelRatio` (≤2×)
  - **Nebula/toz gizleme**: 7 nebula + 3 kozmik toz şeridi + uzay tozu partikülleri gizlenir
  - **Label throttle**: Düşük modda ayet etiket overlap kontrolü her 4 frame'de 1 yapılır
  - **Cosmos uniform skip**: Düşük modda nebula/dust lookAt + time uniform güncellemeleri atlanır
  - **localStorage**: Kullanıcı tercihi `sgx_perf` anahtarıyla saklanır
  - **UI**: Toolbar'da ⚡/🔋 toggle butonu (YÜKSEK/DÜŞÜK etiketli)
- **Etkilenen dosyalar:** `Frontend/js/state.js`, `Frontend/js/scene-init.js`, `Frontend/js/settings.js`, `Frontend/js/warp.js`, `Frontend/index.html`

## [0.27.0] - 2025-07-28
### Özellik
- **الله Hat Sanatı — 3D Spiral Sarmal**: Hat sanatçısı yaklaşımıyla 3 katmanlı hiyerarşik yerleşim
  - **Katman 1 — Çizgiler**: 7 kübik Bezier vuruşu الله kaligrafisinin iskeletini çizer
  - **Katman 2 — Sure Helixi**: 114 sure, vuruş merkezleri etrafında 3D sarmal (helix) ile sarılır
    - Bezier teğetinden normal hesaplanır → `R·cos(θ)·normal + R·sin(θ)·Z` ofseti
    - Her vuruşta `max(2, count/4)` tur ile görsel derinlik
  - **Katman 3 — Ayet Mini-Spirali**: Ayetler her surenin etrafında genişleyen sarmal ile dolanır
    - Deterministik (rastgele değil) — `miniTurns = max(1.5, totalAyahs/8)`
    - Genişleyen yarıçap (0.3→1.0×R) ile konik sarmal efekti
- **Etkilenen dosyalar:** `Frontend/js/data-loader.js`

## [0.26.0] - 2025-07-28
### Özellik
- **الله Kaligrafi Yerleşim Modeli**: Sureler ve ayetler Arapça "الله" (Allah) yazısı şeklinde 3D uzayda konumlandırılır
  - **Kübik Bezier** ile 7 ayrı kaligrafik çizgi — her biri pürüzsüz, görsel referansa birebir uyumlu
  - Sabit sure dağılımı: Elif(12) + Lam1(18) + Lam2(18) + Taban(20) + Ha gövde(24) + Ha uç(14) + Şedde(8) = 114
  - Elif %65 lam yüksekliği, iki Lam uzun dikey, Ha dramatik kıvrımlı kuyruk — görsel oranlarına sadık
  - Her çizgi kübik Bezier (C∞ süreklilik) — köşe yok
  - 114 sure yol boyunca eşit aralıklarla dağıtılır
  - Hafif Z-derinlik varyasyonu ile 3B his
  - UI: Toolbar yerleşim menüsünde 🕋 الله butonu
- **Etkilenen dosyalar:** `Frontend/js/data-loader.js`, `Frontend/index.html`

## [0.25.2] - 2025-07-28
### Özellik
- **HUD Seslendirme Düğmesi**: Ana ayet detay paneline (DİPNOT yanına) Seslendir butonu eklendi
  - Gemini TTS ile Türkçe meal seslendirme, fallback olarak tarayıcı TTS
  - ▶ / ⏳ / ⏹ durum geçişleri, cyan tema rengi
  - `speakCurrentHudAyah()` fonksiyonu ile `currentHudNode` entegrasyonu

## [0.25.1] - 2025-07-28
### Özellik
- **Sinematik Warp — Millennium Falcon Hyperspace**: GIF referansına sadik kalınarak yeniden yazıldı
  - Arka plan KARANLIK kalır — ekranı mavi overlay ile boyama kaldırıldı
  - Efektin %90'ı YILDIZ ÇİZGİLERİ: daha uzun (8x cap), daha parlak (3x), daha kalın (2.5x)
  - Beyaz-dominant renk paleti (paleBlue → coolWhite → pureWhite)
  - 2 fazlı giriş: Yavaş birikim (0-45%, ~1.3s) → GÜM! ani patlama (45-50%, ~0.15s)
  - Simetrik ters çıkış (drift): GÜM tersi (ani fren) → yavaş sönme (~1.8s)
  - Minimal FOV değişimi (65→62→68→ geri) — Star Wars tarzı sabit kamera açısı
  - Arada sıfır gecikme — GÜM bitince aynı frame'de drift başlar

## [0.25.0] - 2025-07-28
### Özellik
- **Prosedürel Nebula Bulutsuları**: 7 adet GLSL FBM noise tabanlı renkli gaz bulutsası — mor, turkuaz, turuncu, kırmızı, mavi, fuşya, yeşil tonlarında
  - Billboard rotasyonu ile her açıdan görünür
  - Additive blending ile milkyway.jpg skybox üzerine katmanlı render
- **Uzay Tozu Partikülleri**: 3000 parlak toz tanecik — kamera etrafında süzülerek derinlik hissi verir
  - Mavi-beyaz ve altın tonlarında, sinüsoidal kırpışma
- **Kozmik Toz Şeritleri**: 3 adet karanlık nebula — arka planı kısmen kapatan prosedürel toz desenleri
  - Kızılımsı kenar efekti (yıldız ışığının tozdan geçişi)
- **Difraksiyon Çizgileri**: Parlak yıldızlarda 4+4 kollu (ortogonal + 45°) çapraz ışık çizgileri
- **Geliştirilmiş Yıldız Kırpışması**: %1-2'den %5-8'e çıkarıldı, 3 frekans katmanlı sinüsoidal titreşim
- **Neon Beam Kök Bağlantı Işınları**: TubeGeometry + MeshBasicMaterial → GLSL neon beam shader
  - Normal-view glow (merkez parlak, kenar yumuşak sönümleme)
  - Enerji akış animasyonu (ışın boyunca hareket eden parıltı)
  - Çekirdek beyazlaşma, çift katmanlı glow (iç ışın + dış hale)
  - Arka plan bağlantı çizgileri: AdditiveBlending + azaltılmış opacity

## [0.24.1] - 2025-07-28
### Düzeltme
- **Kök Renk Kontrast İyileştirmesi**: `getRootCSSColor()` fonksiyonu yeniden yazıldı — Arapça karakterlerin dar charCode aralığında kümelenen hue değerleri yerine djb2 hash + 11 ayrık renk paleti (min 30° renk ayrımı) kullanılarak kök etiketleri arasında net görsel ayrım sağlandı

## [0.24.0] - 2025-07-28
### Özellik
- **MSI Installer Paketi**: cx_Freeze ile profesyonel Windows MSI kurulum paketi oluşturma desteği
  - `setup.py`: cx_Freeze MSI konfigürasyonu — Python runtime, tüm bağımlılıklar ve Frontend dosyaları gömülü
  - `build_msi.bat`: Otomatik build orchestration — Python kontrolü, cx_Freeze kurulumu, bağımlılık yükleme, MSI oluşturma
  - Masaüstü ve Başlat Menüsü kısayolları otomatik oluşturulur
  - Denetim Masası üzerinden kaldırma desteği (upgrade code ile sürüm yönetimi)
  - Hedef makinede Python kurulumu gerektirmez (runtime pakete gömülü)
### Düzeltme
- **PyInstaller Spec Güncelleme**: `SemantikGalaksi.spec` dosyasına eksik dosyalar eklendi — `quran_roots.json`, `milkyway.jpg`, `Frontend/js/` dizini (20 JS modülü)
### CI/CD
- **GitHub Actions Otomatik Release**: `v*` tag push'landığında otomatik MSI build + GitHub Release + asset upload
  - `.github/workflows/release.yml`: Windows runner, Python 3.13, cx_Freeze MSI build, softprops/action-gh-release
  - README.md'ye CI/CD badge ve Son Sürüm badge eklendi
- **Etkilenen dosyalar:** `setup.py` (yeni), `build_msi.bat` (yeni), `.github/workflows/release.yml` (yeni), `SemantikGalaksi.spec`, `README.md`

## [0.23.1] - 2025-07-28
### Görsel
- **Milky Way Panorama Skybox**: `milkyway.jpg` equirectangular panorama olarak arka plana yüklendi
- `THREE.EquirectangularReflectionMapping` + sRGB encoding ile gerçekçi 360° uzay arka planı
- Mevcut 120K prosedürel yıldız korundu (additive blending ile panorama üzerine derinlik katıyor)
- **Etkilenen dosya:** `Frontend/js/scene-init.js`

## [0.23.0] - 2025-07-28
### Özellik
- **JSON Editör — İki Sekmeli Tasarım**: Editör artık `quran_data.json` ve `quran_roots.json` için ayrı sekmelere sahip
- Sekmeler arası geçişte içerik korunuyor (cache)
- Kaydet: data sekmesinde DatasetStore'a, roots sekmesinde `rootDictionary`'ye günceller
- Doğrulama: data sekmesinde ayet sayısı, roots sekmesinde kök sayısı gösterir
- Dışa Aktar: aktif sekmeye göre doğru dosya adını kullanır
- "Dipnot Ekle" butonu yalnızca data sekmesinde görünür
- **Etkilenen dosyalar:** `Frontend/index.html`, `Frontend/js/datasets.js`

## [0.22.2] - 2025-07-28
### Görsel
- **Ay-Yıldız boyut küçültme**: UV ölçeği `0.40 → 0.55` — pattern artık küre çapının ~%55'i
- **Dönüş senkronizasyonu**: Shader'daki bağımsız Y-ekseni rotasyonu kaldırıldı; ay-yıldız artık küre mesh'inin geometrik dönüşüyle (`child.rotation.y`) birlikte dönüyor
- **Fatiha suresi kırmızı**: Sure küre rengi ve ayet instance renkleri `0xff0000` olarak override edildi
- **Etkilenen dosyalar:** `Frontend/js/shaders.js`, `Frontend/js/data-loader.js`

## [0.22.1] - 2025-07-28
### Görsel
- **Türk Bayrağı Ay-Yıldız SDF**: Tüm node (sure/ayet) küre shader'larına SDF tabanlı hilal ve 5 köşeli yıldız gömüldü
- Hilal: iki ofsetli daire farkı (max/negate), Yıldız: Inigo Quilez sdStar5 algoritması
- Y ekseni etrafında yavaş dönüş (`time * 0.08`), ön yarıküre `facing` maskesi
- Plazma üzerine sıcak beyaz parıltı olarak `mix()` ile harmanlama, hafif `pulse` animasyonu
- Etkilenen shader'lar: `sunBodyFS` (sure küreleri), `ayahSunFS` (ayet instanced mesh)
- **Etkilenen dosya:** `Frontend/js/shaders.js`

## [0.22.0] - 2025-07-28
### Mimari
- **Modülarizasyon**: Monolitik `index.html` (~3774 satır script) 20 ayrı JS dosyasına bölündü (`Frontend/js/`)
- Dosyalar: state, shaders, constants, key-manager, auth, data-store, highlight, audio, scene-init, data-loader, interaction, tooltip, hud, warp, search, settings, datasets, websocket, notes, loading
- Bağımlılık sırasına göre `<script src>` etiketleriyle yükleniyor
- `var` ile paylaşımlı state (global scope, ES module değil)
- **index.html 861 satıra düştü** (sadece HTML + CSS + script etiketleri)

## [0.21.5] - 2025-07-28
### Düzeltme
- **GPU Bellek Sızıntısı**: `processData()` ve `updateHighlightLines()` — layout/dataset değiştirildiğinde eski Three.js geometry, material ve texture'lar dispose edilmiyordu → artık düzgün temizleniyor
### Temizlik
- **Kullanılmayan değişken kaldırıldı**: `ayahIndexMap` (tanımlı ama hiç referans edilmiyordu)
- **Kullanılmayan shader'lar kaldırıldı**: `coronaVS/FS`, `outerGlowVS/FS` (sahneden daha önce çıkarılmıştı ama 50 satırlık tanımları duruyordu)

## [0.21.4] - 2025-07-28
### Düzeltme
- **Desktop Çift Ses Sorunu**: Python winsound + HTML `<audio>` aynı anda çalıyordu → Desktop'ta HTML audio atlanıyor, sadece winsound kullanılıyor
  - `playBesmeleAudio()`: `window.pywebview` kontrolü ile desktop tespit edilip HTML audio devre dışı bırakılıyor
  - `on_loaded()` (desktop_app.py): `_besmele_played` guard eklendi — tekrar tetiklenirse çalmaz
  - Web tarafı aynen korunuyor (autoplay unlock flow)
- **Besmele Erken Kesilme**: `_dismissLoading()`'e minimum süre guard'ı eklendi — veri hızlı yüklense bile besmele bitene kadar loading screen kalıyor
- Etkilenen dosyalar: `Frontend/index.html`, `DataEngine/desktop_app.py`

## [0.21.3] - 2025-07-28
### Düzeltme
- **Boş Kök Anlamları Tamamlandı**: quran_roots.json'daki 45 boş kök (اله, ربب, علم, كفر, كتب vb.) Gemini AI ile dolduruldu
  - Tüm meaning, meaning_ar, pronunciation ve derived alanları tamamlandı
  - En sık geçen kökler dahil (اله=1263, ربب=857, علم=726 geçiş)
  - `fix_empty_roots.py` scripti oluşturuldu (tekrar kullanılabilir)
- Etkilenen dosyalar: `Frontend/quran_roots.json`, `DataEngine/quran_roots.json`, `DataEngine/fix_empty_roots.py`

## [0.21.2] - 2025-07-28
### Yeni Özellik
- **HUD Pinned Tooltip**: HUD listesindeki ayet kartlarına hover yapılınca tooltip HUD'un hemen yanında (sağında) sabit konumda açılıyor
  - Tooltip ekranda sabit kalıyor, fare ayrılınca kapanmıyor
  - ✕ kapatma butonu eklendi (hover efektli)
  - Fare başka bir ayet kartına geçince tooltip içeriği otomatik güncelleniyor
  - HUD kapatıldığında pinned tooltip da otomatik kapanıyor
  - 3D sahne üzerindeki normal tooltip davranışı aynen korunuyor
  - `buildTooltipContent()` helper ile DRY refactor: tooltip HTML tek noktadan üretiliyor
- Etkilenen dosyalar: `Frontend/index.html`

## [0.21.1] - 2025-07-28
### Düzeltme
- **HUD Liste Kök Tag Template**: HUD içindeki ilişkili ayet kartlarındaki kök etiketleri, tooltip'teki template ile aynı hale getirildi
  - Sadece ortak kökler (`shared`) yerine ayetin tüm kökleri (`rn.roots`) gösteriliyor
  - Kök harfleri büyük ve kalın (`text-[18px] font-bold`) — tooltip ile birebir aynı
  - Tıklanınca türemiş kelimeler, anlam, Arapça anlam ve geçiş sayısı detay panelinde açılıyor (mevcut `toggleHudRootDetail`)
- Etkilenen dosyalar: `Frontend/index.html`

## [0.20.5] - 2025-07-27
### Düzeltme
- **Shader Parlaklık Dengesi**: Sure ve ayet shader yoğunlukları doğru katmana göre ayarlandı
  - Sure gövdesi (sunBodyFS): `whiteHot=0.3`, `rim=1.2` — korona+glow katmanları bloom sağladığı için gövde incelikli
  - Ayet gövdesi (ayahSunFS): `whiteHot=0.7`, `rim=2.2` — ekstra katman olmadığı için parlak tutuldu
- Etkilenen dosyalar: `Frontend/index.html`

## [0.20.3] - 2025-07-27
### Düzeltme
- **HDR Bloom Pipeline**: ACES tone mapping bloom'dan ÖNCE uygulanınca renkler soluyordu — düzeltildi
  - `renderer.toneMapping = NoToneMapping` (kaldırıldı)
  - `HalfFloatType` WebGLRenderTarget ile HDR değerler korunuyor
  - Bloom: threshold=0.9 (i.html), strength=1.5, radius=0.6
  - Custom ACES ShaderPass bloom'dan SONRA eklendi (renkler korunur, tone mapping en son)
  - Korona/glow i.html orijinal değerlerine döndürüldü (0.08, 0.06)
- Etkilenen dosyalar: `Frontend/index.html`

## [0.20.0] - 2025-07-27
### İyileştirme
- **UnrealBloomPass Post-Processing**: i.html'deki sıcak atmosferik parıltıyı tam olarak yakalamak için Three.js UnrealBloomPass eklendi
  - CDN'den EffectComposer, RenderPass, ShaderPass, CopyShader, LuminosityHighPassShader, UnrealBloomPass yükleniyor
  - Bloom pipeline: RenderPass → UnrealBloomPass → ACES ShaderPass
  - `composer.render()` ile post-processing pipeline aktif, resize handler güncellendi
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`

## [0.19.0] - 2025-07-26
### İyileştirme
- **GLSL Güneş Simülasyonu**: Surah node'larındaki canvas tabanlı güneş çizimi (`createSunTexture`) kaldırıldı, yerine i.html'den alınan prosedürel GLSL shader animasyonu eklendi
  - Güneş gövdesi: Simplex noise FBM + ridge filament + rim lighting (sunBodyVS/FS)
  - Korona: Vertex deformasyon (noise tabanlı) + BackSide additive blending (coronaVS/FS)
  - Dış halo: Fresnel tabanlı yumuşak glow (outerGlowVS/FS)
  - Her sure kendi renginde (`uColor` uniform) prosedürel plazma animasyonu gösterir
  - Ayet küreleri basit MeshBasicMaterial'e geçirildi (instanceColor ile renklendirme)
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`

## [0.18.1] - 2025-07-25
### İyileştirme
- **Star Wars Lightspeed Referans Güncellemesi**: Warp efekti Star Wars Lightspeed Supercut referansına uygun hale getirildi
  - Yıldızlar noktadan çizgiye kademeli uzama (smoothstep ile hız bazlı)
  - Mavi-indigo + beyaz renk karışımı (vBright varying ile per-star renk)
  - Merkez karanlık tünel (glow kaldırıldı)
  - Warp çıkış efekti: çizgiler kısalır + beyaz flash (%83-95 aralığı)
  - Yavaş giriş rampa (%0-25 küpsel) → tam hyperspace (%25-85) → hızlı çıkış (%85-100)
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`, `FEATURES.md`

## [0.18.0] - 2025-07-25
### İyileştirme
- **WebGL Warp Efekti**: Hyperspace warp geçiş efekti Canvas2D'den Three.js WebGL ShaderMaterial'e taşındı
  - 8000 yıldızlı GPU-hızlandırmalı tünel efekti (BufferGeometry + custom GLSL)
  - Vertex shader: silindirik dağılım, perspektif projeksiyon, hıza bağlı streak uzaması
  - Fragment shader: çekirdek parlama, yumuşak kenar, mavi-beyaz renk gradyanı, additive blending
  - Canvas2D overlay (`warp-canvas`) tamamen kaldırıldı — tek WebGL context üzerinde render
  - Warp mesh kamerayı takip eder, FOV zoom + kamera lerp korundu
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`, `FEATURES.md`, `README.md`

## [0.17.0] - 2025-07-24
### Eklenen
- **Arapça Arama Desteği**: Arama çubuğunda Arapça metin ve kök arama özelliği
  - Arapça metin normalizasyonu: harekeler (tashkeel) otomatik kaldırılır, elif varyantları birleştirilir
  - Ayet metinlerinde (`text`) ve köklerde (`roots`) Arapça arama
  - Arama çubuğunda ع butonu ile Arapça sanal klavye popup
  - Arapça modda RTL yön ve Amiri fontu
  - Sonuçlarda Arapça ayet metni ve eşleşen kökler gösterilir
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`

## [0.16.6] - 2025-07-23
### İyileştirme
- **LICENSE**: Detaylı Türkçe çeviri ile düzenlendi — İngilizce orijinal metin + 4 bölümlü Türkçe çeviri (lisans verilmesi, koşullar, garanti reddi, sorumluluk sınırlaması)
- **LICENSE.txt**: Mükerrer dosya silindi (eski placeholder şablon)
- **.gitignore**: Projeye uygun olarak sadeleştirildi — gereksiz .NET/C#/NuGet kuralları kaldırıldı, Python/PyInstaller/güvenlik/VS IDE bölümleri düzenlendi
- **.gitattributes**: Projeye uygun olarak yeniden yazıldı — Python/JS/HTML/JSON dosya tipleri eklendi
- **README.md**: Lisans badge'i "Özel" → "MIT" olarak güncellendi
- Etkilenen dosyalar: `LICENSE`, `LICENSE.txt` (silindi), `.gitignore`, `.gitattributes`, `README.md`, `CHANGELOG.md`
- **README.md**: Lisans badge'i "Özel" → "MIT" olarak güncellendi, lisans bölümü MIT bilgisiyle yenilendi
- Etkilenen dosyalar: `LICENSE`, `README.md`, `CHANGELOG.md`

## [0.16.5] - 2025-07-23
### Eklenen
- **README.md**: Kapsamlı proje tanıtım dosyası oluşturuldu — proje açıklaması, özellik listesi, mimari diyagram, proje yapısı, hızlı başlangıç, EXE dağıtım, server-client kurulum, yapılandırma, API referansı, teknoloji yığını, kullanım kılavuzu, teknik detaylar, sürüm geçmişi, katkıda bulunma rehberi
- Etkilenen dosyalar: `README.md`, `CHANGELOG.md`

## [0.16.4] - 2025-07-23
### İyileştirme
- **Uzay Gemisi Navigasyon Görünümü**: Yıldız alanı vakum ortamına uygun olarak yeniden tasarlandı
  - Titreşim kaldırıldı: atmosfer yok → yıldızlar sabit iğne ucu noktalar (%1.2 sensör gürültüsü hariç)
  - Çekirdek keskinliği 5× artırıldı (exp -60 → -320): kırınımsız nokta ışık kaynağı
  - Halo %66 azaltıldı ve sadece parlak yıldızlarda görünür (teleskop lens etkisi)
  - Boyutlar %65 küçültüldü (500-6000 → 180-2400), maks 40px → 10px
  - Sönük yıldızlar desatüre beyaz, sadece parlak yıldızlar renkli (göz adaptasyonu)
  - Dönüş animasyonu kaldırıldı: yıldız alanı sabit inertial referans çerçevesi
  - 120.000 yıldız: Samanyolu bandı yoğunluk farkından doğal olarak belirir
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`

## [0.16.3] - 2025-07-23
### İyileştirme
- **Gerçek Samanyolu Yıldız Haritası**: Yıldız alanı astronomi verilerine dayalı olarak yeniden yazıldı
  - Galaktik düzlem (J2000 GNP: RA=192.86°, Dec=+27.13°) boyunca yoğunlaşan Samanyolu bandı (%45)
  - Galaktik şişkinlik (bulge) — Sagittarius A* yönünde kümelenme (%10)
  - Macellan Bulutları — Büyük/Küçük uydu galaksi kümeleri (%5)
  - Alan yıldızları — düzgün küresel dağılım (%40)
  - Planck sıcaklığı tabanlı B-V → RGB renk dönüşümü
  - Twinkling %65 azaltıldı (0.35→0.10 sönük, 0.05→0.02 parlak yıldızlar)
  - Halo yoğunluğu azaltıldı (0.25→0.18), çekirdek sertliği artırıldı (50→60)
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`

## [0.16.2] - 2025-07-23
### İyileştirme
- **Gerçekçi Yıldız Alanı**: Arka plan yıldızları tamamen yeniden yazıldı
  - Custom ShaderMaterial: yumuşak glow çekirdeği + halo (additive blending)
  - 6 spektral tip (O/B mavi → M kırmızı cüce), güç-yasası boyut dağılımı (çok sönük, az parlak)
  - Twinkling animasyonu: sönük yıldızlar daha fazla, parlak yıldızlar daha az titreşir
  - 80.000 yıldız, hafif galaktik düzlem yassılması
  - Yavaş kozmik dönüş animasyonu (`0.002 rad/s`)
  - Pencere yeniden boyutlandırmada shader uniform otomatik güncellenir
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`

## [0.16.1] - 2025-07-23
### İyileştirme
- **Çevrimiçi Kullanıcılar Paneli**: Windows `alert()` yerine modern glassmorphism modal eklendi
  - Kullanıcı adı, IP adresi, makine adı (hostname), bağlantı süresi bilgileri gösterilir
  - Aktif kullanıcı "SEN" etiketi ile vurgulanır
  - Renkli avatar, hover efektleri, animasyonlu açılış
  - Sunucu/WebSocket port bilgisi footer'da gösterilir
- **Backend**: WebSocket client bilgileri genişletildi (IP, hostname, bağlanma zamanı)
- **Backend**: `/api/online-users` endpoint'i `details` dizisi döndürür
- Etkilenen dosyalar: `DataEngine/desktop_app.py`, `Frontend/index.html`, `CHANGELOG.md`

## [0.16.0] - 2025-07-23
### Eklenen
- **Server-Client Modu**: `config.json` üzerinden `"mode": "server"` / `"mode": "client"` desteği eklendi
  - Server modu: Mevcut davranış — HTTP/WebSocket sunucusu başlatır + masaüstü penceresi açar
  - Client modu: Sunucu başlatmadan uzak sunucuya bağlanan masaüstü penceresi açar (terminal makineler için)
  - `server_ip`, `server_port`, `server_ws_port` ayarlarıyla uzak sunucu hedefi belirlenir
  - CLI desteği: `--mode client` argümanı
- Etkilenen dosyalar: `DataEngine/desktop_app.py`, `DataEngine/config.json`, `INSTALL.md`, `FEATURES.md`, `CHANGELOG.md`

## [0.15.1] - 2025-07-23
### Eklenen
- **INSTALL.md**: Profesyonel kurulum ve kullanım kılavuzu oluşturuldu — ön gereksinimler, adım adım kurulum, `.env` ve `config.json` yapılandırması, masaüstü/web/EXE çalıştırma modları, kullanım senaryoları, API referansı, hata çözümleri, güncelleme ve kaldırma talimatları
- Etkilenen dosyalar: `INSTALL.md`, `CHANGELOG.md`

## [0.15.0] - 2025-07-23
### Eklenen
- **EXE Dağıtım Desteği**: PyInstaller ile tek klasör (one-folder) EXE paketleme altyapısı eklendi
  - `SemantikGalaksi.spec`: PyInstaller spec dosyası — Frontend dosyaları ve config.json otomatik bundle edilir
  - `build_exe.bat`: Tek komutla EXE oluşturan build script'i
  - `desktop_app.py`: Frozen mode (`sys._MEIPASS`) desteği eklendi — EXE ve geliştirme ortamı ayrı yol çözümlemesi
  - Kullanıcı verileri (notes, keys, config) EXE yanına yazılır; bundle edilen dosyalar salt-okunur kalır
- Etkilenen dosyalar: `DataEngine/desktop_app.py`, `DataEngine/requirements.txt`, `SemantikGalaksi.spec`, `build_exe.bat`, `.gitignore`

### Düzeltilen
- **Neon Kök Vurgulama Bozulması**: Arapça RTL metinde `display: inline-block` kullanımı kelimelerin üst üste binmesine neden oluyordu; `display: inline` olarak düzeltildi, `text-shadow` yoğunluğu azaltıldı, gereksiz `background` ve `border-radius` kaldırıldı
- **Web Besmele Sesi Çalmıyor**: Tarayıcı autoplay politikası nedeniyle besmele sesi çalmıyordu; loading ekranında "▶ Dokunarak Başlat" butonu eklendi, kullanıcı etkileşimi sonrası ses başlatılıp loading ekranı besmele süresince bekliyor
- Etkilenen dosyalar: `Frontend/index.html`

## [0.14.0] - 2025-01-XX
### Düzeltilen
- **Ayet Küre Kalitesi**: Ayet küreleri artık surah rengine göre prosedürel texture alıyor (eskisi: tek cyan texture, 16 segment → yeni: surah bazlı renkli texture, 48 segment, 512px çözünürlük)
- **Tooltip Taşma**: Uzun ayet metinleri tooltip dışına taşmıyordu; `max-width` daraltıldı (520→420px), `max-height: 60vh`, `overflow-x:hidden`, `word-break:break-word` eklendi
- **HUD Panel Scroll Taşma**: Sol panelde içerik scroll dışına çıkıyordu; `overflow-x-hidden`, `contain:paint`, `scrollbar-width:thin` eklendi, metin kutuları `word-break`/`overflow-wrap` ile sarılıyor
- Etkilenen dosyalar: `Frontend/index.html`, `CHANGELOG.md`, `FEATURES.md`

## [0.13.0] - 2025-01-XX
### Eklenen
- **Uzay Yerleşim Modelleri**: 4 farklı 3D yerleşim modeli eklendi — kullanıcı üst toolbar'dan seçebilir
  - 🌌 **Galaksi**: Arşimed spirali, Samanyolu modeli (mevcut varsayılan)
  - 🌫️ **Bulutsu**: Gauss bulut kümeleri — 7 küme merkezi, organik dağılım
  - 📦 **Küp**: 3B ızgara — 5×5×5 kristal yapı, düzenli grid
  - 🔮 **Küre**: Fibonacci küre — altın oran dağılımı
- **WYSIWYG Not Editörü**: Zengin metin editörü ile not tutma (📓 butonu)
  - Bold, İtalik, Underline, Strikethrough, Başlıklar (H1-H3), Listeler, Alıntı, Bağlantı, Kod
  - Sunucu taraflı saklama (`DataEngine/notes/{username}.json`) + localStorage fallback
  - Not listesi sidebar, oluşturma/silme/düzenleme, tarih takibi
  - REST API: `GET/POST /api/notes`, `DELETE /api/note/{id}`
- **Modern Header**: Glassmorphism tasarım, backdrop-blur, kompakt buton grid, responsive
- `calcLayoutPositions()` fonksiyonu: Modüler yerleşim hesaplama sistemi
- `switchLayout()` fonksiyonu: Anlık model değiştirme, veri yeniden işleme

### Düzeltilen
- **Ses Tekrarlama**: `_besmelePlaying` flag artık fade sonrası sıfırlanmıyor — login tıklamasında ses tekrarlanmaz
- **Kök Çizgi Görünürlüğü**: 3D modellerde ayah scatter yarıçapı artırıldı (60K→300-400K), tube kalınlığı artırıldı (40→150), arka plan çizgi opacity artırıldı (0.02→0.05)
- **Kök Çizgi Glow Gölgesi**: Glow mesh `AdditiveBlending` + `depthWrite:false` ile gerçek ışıma efektine dönüştürüldü (eski: normal blending ile koyu gölge görünümü)
- Etkilenen dosyalar: `Frontend/index.html`, `DataEngine/desktop_app.py`, `CHANGELOG.md`, `FEATURES.md`

## [0.12.0] - 2025-01-XX
### Eklenen
- **Neon Yükleme Ekranı**: Loading screen neon stile yükseltildi — cyan (#00f2ff) glow, neon halka, neon flicker animasyonu, mor radyal aksan
- **Besmele TTS Sesi**: Gemini 2.5 Flash TTS ile Türkçe Eûzü Besmele sesi üretildi ve `besmele.wav` olarak kaydedildi
- **Otomatik Ses Çalma**: Loading screen açılışında besmele sesi otomatik oynar, ekran kapanırken yumuşak fade-out
- **TTS Ses Üretici Script**: `DataEngine/generate_besmele_audio.py` — Gemini API ile besmele sesi üretip WAV olarak kaydetme
- Yeni CSS keyframes: `loadBgPulse`, `loadNeonFlicker`, `loadNeonRing`
- Etkilenen dosyalar: `Frontend/index.html`, `Frontend/besmele.wav`, `DataEngine/generate_besmele_audio.py`

## [0.11.0] - 2025-01-XX
### Eklenen
- **WebSocket Gerçek Zamanlı Senkronizasyon**: Raw WebSocket sunucusu (ek bağımlılık yok)
- **Değişiklik Bildirimleri**: Veri seti kaydetme/silme/yeniden adlandırma/çoğaltma işlemleri tüm bağlı istemcilere anlık broadcast edilir
- **Toast Bildirimleri**: Sağ üstte animasyonlu bildirim kartları (4 renk tipi: info/warn/success/muted)
- **Çevrimiçi Kullanıcılar Göstergesi**: Sol altta bağlı/ayrılan kullanıcı sayısı + tıkla liste gör
- **Otomatik Yeniden Bağlanma**: WebSocket koptuğunda 3 saniyede otomatik reconnect
- **ThreadingTCPServer**: HTTP sunucusu artık çoklu istekleri eş zamanlı işler
- **Eûzü Besmele Yükleme Ekranı**: Sanatsal loading screen — Eûzü (أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ) + Besmele (بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ), Türkçe/Latin çevirileri, altın tonlu glow animasyonları, kademeli fade-up, minimum 3sn görünür
- `/api/online-users` endpoint
- Etkilenen dosyalar: `DataEngine/desktop_app.py`, `Frontend/index.html`, `DataEngine/config.json`

## [0.10.0] - 2025-01-XX
### Eklenen
- **Esnek IP/Port Yapılandırması**: `config.json`, environment variable (`SGX_PORT`, `SGX_HOST`) ve CLI argümanları (`--port`, `--host`) ile port/host ayarlanabilir
- **Otomatik Port Bulma**: `auto_port: true` ile meşgul port otomatik atlanır
- **Native Dosya İndirme**: pywebview `create_file_dialog(SAVE_DIALOG)` ile OS "Farklı Kaydet" diyaloğu
- **Veri Seti Yeniden Adlandırma**: Dataset manager'da ✏️ butonu ile isim değiştirme
- **Veri Seti Çoğaltma**: Dataset manager'da 📋 butonu ile kopya oluşturma
- **Dosya Boyutu Bilgisi**: Dataset listesinde KB/MB cinsinden boyut gösterimi
- **Silme Onayı**: Veri seti silmeden önce `confirm()` diyaloğu
- Etkilenen dosyalar: `DataEngine/desktop_app.py`, `Frontend/index.html`, `DataEngine/config.json`

### Düzeltilen
- pywebview'da Blob+anchor indirme çalışmıyor → native save dialog kullanılıyor
- Editör "Dışa Aktar" butonu çalışmıyor → async downloadJSON ile düzeltildi

## [0.9.0]
### Eklenen
- Kimlik doğrulama sistemi (login/logout, token tabanlı)
- Rol yönetimi (admin/editor/viewer)
- Admin paneli (kullanıcı CRUD)
- Şifre değiştirme

## [0.8.0]
### Eklenen
- Çok kullanıcılı sunucu modu (LAN erişimi, 0.0.0.0 binding)
- REST API (dataset CRUD)
- IndexedDB + Server dual-mode DatasetStore

## [0.7.0]
### Eklenen
- Kök istatistikleri (bar chart, yüzde)
- Dipnot sistemi (📌 toggle, inline popup)
- JSON Editör (satır numaraları, doğrulama, Arapça klavye)
- Veri Seti Yöneticisi (📂 modal, IndexedDB)
