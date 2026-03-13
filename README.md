<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Three.js-r128-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/WebSocket-RFC_6455-4353FF?style=for-the-badge" alt="WebSocket">
  S%C3%BCr%C3%BCm-0.37.0-34d399
  <img src="https://img.shields.io/badge/Lisans-MIT-34d399?style=for-the-badge" alt="Lisans">
  <br>
  <a href="https://github.com/hzkucuk/SemantikGalaksi/actions/workflows/release.yml">
    <img src="https://github.com/hzkucuk/SemantikGalaksi/actions/workflows/release.yml/badge.svg" alt="MSI Release">
  </a>
  <a href="https://github.com/hzkucuk/SemantikGalaksi/releases/latest">
    <img src="https://img.shields.io/github/v/release/hzkucuk/SemantikGalaksi?style=flat-square&label=Son%20Sürüm&color=34d399" alt="Latest Release">
  </a>
</p>

<h1 align="center">🕋 Kur'an-ı Kerim Kelime Kök Uzayı</h1>

<p align="center">
  <strong>Kur'an-ı Kerim surelerini ve ayetlerini 3D uzay görselleştirmesi ile keşfedin.</strong><br>
  Semantik kök bağlantıları · Gerçek Samanyolu yıldız haritası · Çok kullanıcılı · Masaüstü + Web
</p>

<p align="center">
  <em>بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</em>
</p>

---

## 📖 Nedir?

**Kur'an-ı Kerim Kelime Kök Uzayı**, Kur'an-ı Kerim'deki her ayetin her kelimesini **Arapça kök** bazında analiz eder, aynı kökü paylaşan ayetleri tespit eder ve bu semantik bağlantılardan interaktif bir **3D uzay haritası** oluşturur.

### Nasıl Çalışır?

```
   ┌─────────────┐         ┌─────────────────┐         ┌──────────────────┐
   │  Ayet       │         │  Kelime Kök     │         │  Bağlantı        │
   │  Bakara:255 │───────▶ │  Analizi        │───────▶ │  Haritası        │
   │  (Ayetü'l-  │         │                 │         │                  │
   │   Kürsî)    │         │  عَلِمَ (bilmek) │         │  Bakara:255 ←──▶ │
   │             │         │  سَمَاء (gök)    │         │  Zümer:67   ←──▶ │
   │             │         │  أَرْض (yer)     │         │  Tâhâ:98    ←──▶ │
   └─────────────┘         └─────────────────┘         │  ...200+ ayet    │
                                                       └──────────────────┘
                                                               │
                                                               ▼
                                                    ┌──────────────────────┐
                                                    │  3D Uzay Navigasyonu │
                                                    │                      │
                                                    │  🪐 Sure = Gezegen   │
                                                    │  🌙 Ayet = Uydu      │
                                                    │  ── Kök  = Işık Yolu │
                                                    └──────────────────────┘
```

1. **Kök çıkarma** — Kur'an'daki 6236 ayetin her kelimesi Arapça kök formuna ayrıştırılır (örn. **كَتَبَ** → **ك ت ب** kökü)
2. **Çapraz eşleştirme** — Aynı kökü paylaşan ayetler tespit edilir; bir ayetteki kök başka hangi surelerde, hangi ayetlerde geçiyor bulunur
3. **Uzay haritası** — 114 sure birer **gezegen**, her ayet birer **uydu** olarak 3D uzayda konumlandırılır; ortak kökleri paylaşan ayetler arasında **neon ışık yolları** çizilir
4. **Navigasyon** — Kullanıcı bu haritada bir uzay gemisi gibi gezinir: bir surenin gezegenine tıklayarak ayetlerini görür, kök bağlantılarını takip ederek Kur'an'ın farklı surelerindeki anlam ilişkilerini keşfeder

Sonuç olarak Kur'an-ı Kerim'in **tüm semantik ağı** uzayda bir yıldız haritası gibi gözler önüne serilir — hangi kavramlar hangi surelerde tekrarlanıyor, hangi kökler Kur'an genelinde birbirine bağlı, tek bakışta görülür hale gelir.

Uygulama, **uzay gemisi kokpiti** estetiğiyle tasarlanmış olup arka planda J2000 astronomik verilerine dayanan gerçekçi bir Samanyolu yıldız haritası yer alır.

---

## ✨ Öne Çıkan Özellikler

### 🌌 3D Uzay Görselleştirmesi
- **114 sure** = 114 gezegen küresi (prosedürel GLSL güneş simülasyonu, Simplex noise FBM + rim lighting)
- **6236+ ayet** = her sure etrafında yörüngede dönen uydu küreleri
- **Kök bağlantıları** = ayetler arası neon ışık çizgileri (AdditiveBlending glow)
- **5 yerleşim modeli**: Galaksi (Arşimed spirali), Bulutsu (Gauss kümeleri), Küp (3B ızgara), Küre (Fibonacci), الله (Arapça kaligrafi)
- **Hyperspace warp**: Sureler arası GPU-hızlandırmalı geçiş (Three.js ShaderMaterial, 8000 yıldız, GLSL streak efekti)
- **GLSL Prosedürel Güneş Simülasyonu** (v0.19.0): Simplex noise FBM + ridge filament + rim lighting — her sure kendi renginde plazma animasyonu
- **HDR Bloom Pipeline** (v0.20.0): UnrealBloomPass + custom ACES tone mapping ShaderPass (strength=0.7, radius=0.6, threshold=0.3)
- **Sinematik Hyperspace Warp** (v0.25.1): Millennium Falcon GIF referansına sadık — karanlık arka plan, uzun parlak beyaz çizgiler, punch ivme, çıkış flash
- **Fatiha Suresi** (v0.22.2): Kırmızı renk vurgusu (`0xff0000`) — ilk sure özel olarak işaretli

### 🇹🇷 Türk Bayrağı SDF Shader
- **Hilal + 5 köşeli yıldız**: Tüm küre shader'larına SDF (Signed Distance Field) olarak gömülü
- Hilal: İki ofsetli daire farkı, Yıldız: Inigo Quilez `sdStar5` algoritması
- **Kameraya dönük projeksiyon**: View-space `vNormal` ile her açıdan görünür
- Plazma üzerine sıcak beyaz parıltı olarak `mix()` ile harmanlama, hafif `pulse` animasyonu

### 🌠 Milky Way Panorama Skybox
- **Gerçek Samanyolu panoraması**: `milkyway.jpg` equirectangular projeksiyon
- Ters çevrilmiş küre (50M yarıçap, `BackSide`, `depthWrite: false`) ile sonsuz uzay illüzyonu
- Kamerayı takip eder — her yöne bakıldığında gerçekçi 360° uzay arka planı
- Mevcut 120K prosedürel yıldızlarla birlikte katmanlı derinlik

### ⭐ Uzay Gemisi Navigasyon Yıldız Haritası
- **120.000 prosedürel yıldız**, J2000 galaktik koordinatlara dayalı dağılım
- **Samanyolu bandı**: Galaktik düzlem (GNP: RA=192.86°, Dec=+27.13°) boyunca yoğunlaşma
- **Galaktik şişkinlik**: Sagittarius A* yönünde kümelenme
- **Macellan Bulutları**: Büyük/Küçük uydu galaksi kümeleri
- **Planck B-V → RGB**: Gerçek yıldız renkleri (O/B mavi → M kırmızı cüce)
- **Difraksiyon çizgileri** (v0.25.0): Parlak yıldızlarda 4+4 kollu çapraz ışık efekti (ortogonal + 45°)
- **Çoklu frekans kırpışma** (v0.25.0): 3 katmanlı sinüs dalga titreşimi (%5-8 amplitüd)
- **Milky Way panorama** ile birlikte katmanlı derinlik efekti

### 🌌 Cosmos Atmosferi (v0.25.0)
- **7 Prosedürel Nebula**: GLSL FBM noise tabanlı renkli gaz bulutsuları — mor, turkuaz, turuncu, kırmızı, mavi, fuşya, yeşil
  - Billboard rotasyonu ile her açıdan görünür, Additive blending
  - Filament yapıları (ridge noise), parlak çekirdek, yumuşak kenar maskesi
- **3000 Uzay Tozu Partikülü**: Kamera etrafında süzülen mavi-beyaz/altın toz tanecikleri
  - Sinüsoidal kırpışma, derinlik hissi, Additive blending
- **3 Kozmik Toz Şeridi**: Karanlık nebula — arka planı kısmen kapatan prosedürel toz desenleri
  - Kızılımsı kenar efekti (yıldız ışığının tozdan geçişi)
- **Katmanlı render**: `milkyway.jpg` → Kozmik toz → Nebulalar → Yıldızlar → Uzay tozu → Veri küreleri

### 🔊 Ayet Seslendirme (TTS)
- **Doğrudan MP3 oynatma** — Süleymaniye Vakfı ses dosyaları (6088 ayet)
- **Gemini 2.5 Flash TTS** ile Türkçe meal seslendirme (fallback)
- Tarayıcı SpeechSynthesis fallback (API anahtarı yoksa)
- HUD panelinde ve ilişkili ayet listesinde seslendir düğmeleri
- PCM → WAV dönüşümü, önbellekleme, durum göstergesi (▶ / ⏳ / ⏹)

### 📖 Zengin Dipnot & Tefsir Sistemi (v0.31.0)
- **Yapılandırılmış dipnotlar** — ayet referansları tıklanabilir link olarak gösterilir
- **Tefsir popup** — her ayet için detaylı tefsir içeriği (metin + çapraz referans linkleri)
- **Çapraz referans haritası** — tefsir bazlı ayet→ayet bağlantıları (`mapping_data`)
- Tıklanabilir referanslara tıklayınca ilgili ayete warp navigasyonu

### 🤖 Yapay Zekâ Analizi
- **Google Gemini 2.5 Flash** entegrasyonu
- Seçilen ayetin semantik, morfolojik ve tematik AI analizi
- Uygulama içi API anahtar yönetimi (güvenli Base64 depolama)

### 📝 İki Sekmeli JSON Editör
- **quran_data.json** ve **quran_roots.json** için ayrı sekmeler
- Sekmeler arası geçişte içerik korunuyor (cache mekanizması)
- Sekmeye göre akıllı doğrulama: data sekmesinde ayet sayısı, roots sekmesinde kök sayısı
- Dışa aktarım: aktif sekmeye göre doğru dosya adı
- "Dipnot Ekle" butonu yalnızca data sekmesinde görünür

### 🧩 Modüler Mimari (v0.22.0+)
- Monolitik `index.html` (~3774 satır) → **20 bağımsız JS modülü** (`Frontend/js/`)
- Bağımlılık sırasına göre `<script>` etiketleriyle yükleme
- `index.html` artık sadece **~861 satır** (HTML + CSS + script referansları)
- **Modüller**: state, shaders, constants, key-manager, auth, data-store, highlight, audio, scene-init, data-loader, interaction, tooltip, hud, warp, search, settings, datasets, websocket, notes, loading

### 👥 Çok Kullanıcılı Gerçek Zamanlı Çalışma
- **Raw WebSocket** sunucusu (ek bağımlılık gerektirmez)
- Veri seti değişiklikleri anlık tüm kullanıcılara broadcast
- Çevrimiçi kullanıcı paneli (IP, hostname, bağlantı süresi)
- Toast bildirim sistemi
- Otomatik reconnect (3 sn)

### 🖥️ Server-Client Ağ Mimarisi
- **Server modu**: HTTP + WebSocket sunucusu başlatır + masaüstü penceresi açar
- **Client modu**: Sunucu başlatmadan uzak makineye bağlanan masaüstü penceresi
- Tek EXE, `config.json` ile mod seçimi

### 📓 WYSIWYG Not Editörü
- Zengin metin: Bold, İtalik, Başlıklar, Listeler, Alıntı, Kod, Bağlantı
- 500ms debounce ile otomatik kayıt
- Kullanıcı bazlı sunucu depolama + localStorage fallback

### 🔍 Arapça Arama
- Üst arama çubuğunda ve HUD panelinde **Arapça metin** ve **kök** arama
- **Hareke normalizasyonu**: Fethâ, damma, kesra, şedde vb. otomatik kaldırılır
- **Elif normalizasyonu**: أ إ آ ٱ → ا birleştirmesi
- **ع butonu** ile Arapça sanal klavye (3 konumda: arama, HUD, editör)
- RTL mod: Klavye aktifken input yönü sağdan sola + Amiri fontu

### 📌 HUD Pinned Tooltip (v0.21.2)
- Ayet kartlarına hover yapılınca tooltip HUD'un yanında **sabit konumda** açılır
- Fare başka karta geçince içerik otomatik güncellenir
- ✕ kapatma butonu, HUD kapanınca tooltip de otomatik kapanır
- `buildTooltipContent()` helper ile DRY tooltip HTML üretimi

### 📚 Arapça Kök Sözlüğü (v0.21.3)
- **2139 Arapça kök** — Gemini AI ile anlam, Arapça anlam, telaffuz ve türemiş kelimeler
- `quran_roots.json`: Her kök için `meaning`, `meaning_ar`, `pronunciation`, `derived` alanları
- DataEngine pipeline: `step1_fetch_quran.py` → `step2_extract_roots.py` → `step3_build_root_dict.py`
- Boş kök anlamları otomatik tamamlama (`fix_empty_roots.py`)

### 🎬 Neon Yükleme Ekranı + Besmele (v0.12.0)
- **Eûzü Besmele** yükleme ekranı: Arapça + Türkçe + Latin çeviriler, altın tonlu glow animasyonları
- **Gemini TTS** ile üretilmiş Besmele sesi (`besmele.wav`) — loading sırasında otomatik çalar
- Neon cyan glow, halka animasyonu, flicker efekti, mor radyal aksan
- Besmele bitene kadar loading ekranı kalır (minimum süre guard)

### 🔄 Otomatik Güncelleme (v0.34.4)
- Uygulama açılışta **GitHub Release API** üzerinden yeni sürüm kontrolü yapar
- Yeşil toast bildirimi ile kullanıcıya yeni sürüm sunulur (“Güncelle” / “Kapat”)
- Güncelleme öncesi tüm kullanıcı verileri (notlar, config, datasets, DB) uygulama klasörü altında **ZIP olarak yedeklenir**
- MSI sessiz kurulum (`msiexec /passive /norestart`)
- Maksimum 5 yedek tutulur, eski yedekler otomatik silinir

### 🔐 Kimlik Doğrulama ve Yetkilendirme
- Token tabanlı oturum, SHA-256 + salt şifreleme
- 3 rol: **admin** (tam yetki), **editor** (CRUD), **viewer** (salt okunur)
- Admin paneli: kullanıcı oluşturma / silme / rol değiştirme

### 🔧 Son Düzeltmeler ve İyileştirmeler
| Sürüm | Düzeltme |
|-------|----------|
| v0.34.4 | **TTS Düzeltme**: `temperature:0` Gemini TTS'i bozuyordu (HTTP 500) — kaldırıldı. **Otomatik Güncelleme**: GitHub Release kontrolü, ZIP yedekleme, sessiz MSI kurulumu |
| v0.33.0 | **MSI Server/Client**: Kurulum tipi seçimi, **Besmele**: Süleymaniye Vakfı meali, **Kök Renk**: 16 ayrık renk index bazlı atama |
| v0.32.2 | **Zayıf Harf Eşdeğerlik Kontrolü**: İndirgenmiş kök eşleşmesinde ا/و/ي eşdeğerliği devre dışı — sahte renklendirme engellendi |
| v0.32.1 | **Kok Vurgulama Duzeltmesi**: Sedde destegi eklendi, yanlis pozitif eslesmeler engellendi — tum kokler dogru renkleniyor |
| v0.32.0 | **Sure Seslendirme**: HUD’da mor 📖 butonla tam sure MP3 dinleme (Süleymaniye Vakfı), ayet TTS eski davranışa döndürüldü |
| v0.31.1 | **Referans Düzeltmeleri**: 3 hatalı ayet referansı düzeltildi (16:145→16:115, 81:30→81:29 ×2), hadis/sayfa referansları korundu |
| v0.31.0 | **Zengin Veri Entegrasyonu**: `full_quran_rich_map.json` birleştirildi — dipnot_parsed linkleri, tefsir popup, çapraz referans haritası, doğrudan MP3 ses oynatma |
| v0.25.2 | **HUD Seslendirme Düğmesi**: Ana ayet detay panelinde DİPNOT yanına Seslendir (▶) butonu eklendi — Gemini TTS + tarayıcı fallback |
| v0.25.1 | **Sinematik Warp**: Millennium Falcon tarzı — yavaş birikim (1.3s) → GÜM! (0.15s) → simetrik ters çıkış (1.8s), minimal FOV, sıfır gecikme, karanlık arka plan, beyaz-dominant streak'ler |
| v0.24.1 | **Kök Renk Kontrast**: Arapça charCode kümelenmesi nedeniyle benzer hue değerleri → djb2 hash + 11 ayrık renk paleti (min 30° ayrım) |
| v0.21.5 | **GPU Bellek Sızıntısı**: Layout/dataset değişiminde eski geometry, material, texture dispose edilmiyor → düzeltildi |
| v0.21.5 | **Ölü Kod Temizliği**: Kullanılmayan `ayahIndexMap`, `coronaVS/FS`, `outerGlowVS/FS` kaldırıldı |
| v0.21.4 | **Desktop Çift Ses**: Python winsound + HTML audio aynı anda çalıyordu → Desktop'ta HTML audio devre dışı |
| v0.21.4 | **Besmele Erken Kesilme**: Veri hızlı yüklense bile besmele bitene kadar loading screen kalıyor |
| v0.21.1 | **HUD Kök Tag Uyumu**: HUD içindeki kök etiketleri tooltip ile birebir aynı template'e getirildi |
| v0.20.5 | **Shader Parlaklık Dengesi**: Sure gövdesi (whiteHot=0.3) vs ayet gövdesi (whiteHot=0.7) ayrımı |
| v0.20.3 | **HDR Bloom Düzeltmesi**: ACES tone mapping bloom'dan sonraya taşındı (renk solması düzeltildi) |
| v0.15.0 | **Neon Kök Vurgulama**: RTL metinde `inline-block` → `inline` düzeltmesi, text-shadow azaltma |
| v0.15.0 | **Web Besmele Sesi**: Tarayıcı autoplay politikası → "▶ Dokunarak Başlat" butonu eklendi |

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    Masaüstü Penceresi                    │
│                  (pywebview / WebView2)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Frontend (index.html + 20 JS modülü)                   │
│   ├── Three.js r128 — 3D sahne, kamera, mesh, bloom      │
│   ├── GLSL Shaders — güneş simülasyonu, Türk bayrağı SDF │
│   ├── HDR Bloom — UnrealBloomPass + ACES tone mapping    │
│   ├── Milky Way Skybox — equirectangular panorama        │
│   ├── Tailwind CSS — UI bileşenleri                      │
│   ├── WebSocket Client — gerçek zamanlı senkronizasyon   │
│   └── REST Client — auth, dataset, notes API             │
│                                                         │
├───────────────────── HTTP / WS ─────────────────────────┤
│                                                         │
│   Backend (desktop_app.py)                              │
│   ├── ThreadingTCPServer — HTTP sunucusu                │
│   ├── Raw WebSocket Server — RFC 6455 uyumlu            │
│   ├── Auth Module — token, session, RBAC                │
│   ├── Dataset Manager — JSON dosya CRUD                 │
│   ├── Notes Manager — kullanıcı bazlı not depolama      │
│   ├── Updater — GitHub Release kontrol + ZIP yedek + MSI │
│   └── API Key Bridge — pywebview JS↔Python köprüsü     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│   Veri Katmanı                                          │
│   ├── quran_data.json — Kur'an verileri (sure/ayet/kök) │
│   ├── datasets/ — kullanıcı veri setleri                │
│   ├── notes/ — kullanıcı notları                        │
│   ├── .api_keys — şifreli API anahtarları               │
│   └── config.json — sunucu yapılandırması               │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Proje Yapısı

```
SemantikGalaksi/
├── DataEngine/
│   ├── desktop_app.py            # Ana uygulama (sunucu + masaüstü)
│   ├── config.json               # Sunucu yapılandırması
│   ├── requirements.txt          # Python bağımlılıkları
│   ├── .env                      # API anahtarları (Gemini)
│   ├── generate_besmele_audio.py # Besmele TTS ses üretici
│   └── quran_api_enricher.py     # Kur'an veri zenginleştirici
├── Frontend/
│   ├── index.html                # Ana arayüz (HTML + CSS + script ref, ~861 satır)
│   ├── js/                       # 20 modüler JavaScript dosyası
│   │   ├── state.js              # Paylaşımlı global state
│   │   ├── shaders.js            # GLSL shader'lar (güneş, Türk bayrağı SDF)
│   │   ├── constants.js          # Sabitler, sure adları, renk haritaları
│   │   ├── scene-init.js         # Three.js sahne, bloom, skybox, yıldızlar
│   │   ├── data-loader.js        # Veri işleme, küre oluşturma
│   │   ├── warp.js               # Hyperspace warp + animate loop
│   │   ├── datasets.js           # Veri seti yöneticisi + iki sekmeli editör
│   │   └── ... (13 modül daha)   # interaction, tooltip, hud, search, vb.
│   ├── quran_data.json           # Kur'an verileri (sureler, ayetler, kökler)
│   ├── quran_roots.json          # Arapça kök sözlüğü (2139 kök)
│   ├── milkyway.jpg              # Milky Way panorama (705 KB equirectangular)
│   ├── three.min.js              # Three.js r128
│   ├── OrbitControls.js          # 3D kamera kontrolü
│   ├── tailwind.min.js           # Tailwind CSS
│   ├── besmele.wav               # Besmele ses dosyası
│   └── datasets/                 # Kullanıcı veri setleri
├── SemantikGalaksi.spec          # PyInstaller build tanımı
├── build_exe.bat                 # EXE build script'i
├── VERSION                       # Tek kaynak sürüm dosyası
├── README.md                     # Bu dosya
├── INSTALL.md                    # Detaylı kurulum kılavuzu
├── FEATURES.md                   # Özellik detayları
└── CHANGELOG.md                  # Sürüm geçmişi
```

---

## 🚀 Hızlı Başlangıç

### Gereksinimler

| Bileşen | Minimum | Önerilen |
|---------|---------|----------|
| Python | 3.10+ | 3.12 |
| İşletim Sistemi | Windows 10 | Windows 11 |
| RAM | 4 GB | 8 GB |
| GPU | WebGL 2.0 desteği | Ayrık GPU |

### Kurulum

```bash
# 1. Repoyu klonlayın
git clone <REPO_URL> SemantikGalaksi
cd SemantikGalaksi

# 2. Sanal ortam oluşturun
python -m venv venv
.\venv\Scripts\Activate.ps1      # PowerShell
# venv\Scripts\activate.bat      # CMD

# 3. Bağımlılıkları yükleyin
pip install -r DataEngine/requirements.txt

# 4. (Opsiyonel) Gemini API anahtarınızı ayarlayın
#    DataEngine/.env dosyasını düzenleyin:
#    API_KEY=sizin_gemini_api_anahtariniz

# 5. Uygulamayı başlatın
python DataEngine/desktop_app.py
```

Uygulama başladığında:
```
Sunucu başlatıldı: http://127.0.0.1:8080
WebSocket:         ws://127.0.0.1:8081
Ağ erişimi:        http://192.168.x.x:8080
Varsayılan giriş:  admin / admin123
```

> 📘 Detaylı kurulum talimatları için bkz. [INSTALL.md](INSTALL.md)

---

## 📦 EXE Olarak Dağıtım

Python kurulu olmayan bilgisayarlarda çalıştırmak için:

```bash
# Proje kök dizininde
build_exe.bat
```

Çıktı: `dist\SemantikGalaksi\SemantikGalaksi.exe`

`dist\SemantikGalaksi` klasörünü ZIP'leyip dağıtın. Hedef makinede sadece EXE'yi çalıştırın.

---

## 📦 MSI Installer Paketi

Profesyonel Windows kurulum paketi (MSI) oluşturmak için:

```bash
# Proje kök dizininde
build_msi.bat
```

Script otomatik olarak:
1. ✅ Python varlığını kontrol eder
2. ✅ `cx_Freeze` yoksa kurar
3. ✅ Proje bağımlılıklarını yükler
4. ✅ MSI installer paketini oluşturur

Çıktı: `dist\SemantikGalaksi-0.24.0-win64.msi`

### MSI Paketi İçeriği

| Bileşen | Dahil mi? |
|---------|-----------|
| Python runtime | ✅ Gömülü (ayrı kurulum gerektirmez) |
| Tüm Python bağımlılıkları | ✅ (pywebview, requests, aiohttp, vb.) |
| Frontend dosyaları | ✅ (HTML, JS modülleri, JSON, ses, panorama) |
| WebView2 runtime | ⚠️ Windows 10+ ile birlikte gelir |
| Masaüstü kısayolu | ✅ Otomatik oluşturulur |
| Başlat Menüsü kısayolu | ✅ Otomatik oluşturulur |
| Kaldırma desteği | ✅ Denetim Masası → Program Kaldır |

> 💡 **Not:** MSI paketi Python'u içine gömer — hedef makinede Python kurulu olmasına gerek yoktur.

### 🚀 Otomatik Release (CI/CD)

`v*` formatında bir Git tag'ı push'landığında **GitHub Actions** otomatik olarak:
1. Windows runner'da MSI paketini build eder
2. GitHub Release oluşturur
3. MSI dosyasını release asset olarak yükler

```bash
# Örnek: v0.25.0 release oluşturma
git tag -a v0.25.0 -m "v0.25.0 — Yeni özellik açıklaması"
git push origin v0.25.0
# → GitHub Actions tetiklenir → Release + MSI otomatik oluşur
```

> 📥 **Son sürümü indir:** [GitHub Releases](https://github.com/hzkucuk/SemantikGalaksi/releases/latest)

---

## 🌐 Server-Client Ağ Kurulumu

Birden fazla makineyle çalışırken (örn. 1 sunucu + N terminal):

### Ana Makine (Server) — `config.json`
```json
{
  "mode": "server",
  "port": 8080,
  "host": "0.0.0.0",
  "auto_port": false,
  "ws_port": 8081
}
```

### Terminal (Client) — `config.json`
```json
{
  "mode": "client",
  "server_ip": "192.168.2.5",
  "server_port": 8080,
  "server_ws_port": 8081
}
```

> ⚠️ Sunucuda Windows Firewall'dan `8080` ve `8081` portlarını açın.

---

## ⚙️ Yapılandırma

### `config.json` Parametreleri

| Parametre | Varsayılan | Açıklama |
|-----------|-----------|----------|
| `mode` | `"server"` | `"server"` veya `"client"` |
| `port` | `8080` | HTTP sunucu portu |
| `host` | `"0.0.0.0"` | Dinleme adresi |
| `auto_port` | `false` | Port meşgulse otomatik boş port bul |
| `ws_port` | `8081` | WebSocket sunucu portu |
| `server_ip` | `"127.0.0.1"` | Client: uzak sunucu IP |
| `server_port` | `8080` | Client: uzak sunucu HTTP portu |
| `server_ws_port` | `8081` | Client: uzak sunucu WS portu |

### Yapılandırma Öncelik Sırası

```
config.json  <  Ortam Değişkeni (SGX_PORT, SGX_HOST)  <  CLI (--port, --host, --mode)
```

```bash
# CLI örnekleri
python DataEngine/desktop_app.py --port 9090
python DataEngine/desktop_app.py --mode client
python DataEngine/desktop_app.py --host 127.0.0.1 --port 3000
```

### `.env` — Gemini API

```env
API_KEY=sizin_gemini_api_anahtariniz
GEMINI_MODEL=gemini-2.5-flash
```

API anahtarı almak için: [Google AI Studio](https://aistudio.google.com/) → **Get API key**

---

## 🔌 API Referansı

Tüm endpoint'ler `Authorization: Bearer <token>` header'ı gerektirir (login hariç).

### Kimlik Doğrulama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/auth/login` | Giriş → `{ token, user }` |
| `POST` | `/api/auth/logout` | Çıkış |
| `GET` | `/api/auth/me` | Oturum bilgisi |
| `GET` | `/api/auth/users` | Kullanıcı listesi (admin) |
| `POST` | `/api/auth/users` | Kullanıcı oluştur (admin) |
| `PUT` | `/api/auth/user/{name}` | Rol değiştir (admin) |
| `DELETE` | `/api/auth/user/{name}` | Kullanıcı sil (admin) |
| `POST` | `/api/auth/change-password` | Şifre değiştir |

### Veri Setleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/datasets` | Liste |
| `GET` | `/api/dataset/{name}` | Detay |
| `POST` | `/api/dataset/{name}` | Kaydet |
| `DELETE` | `/api/dataset/{name}` | Sil |
| `POST` | `/api/dataset-rename` | Yeniden adlandır |
| `POST` | `/api/dataset-duplicate` | Çoğalt |
| `GET` | `/api/download/{name}` | İndir |

### Notlar ve Diğer

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/notes` | Kullanıcı notları |
| `POST` | `/api/notes` | Notları kaydet |
| `DELETE` | `/api/note/{id}` | Not sil |
| `GET` | `/api/online-users` | Çevrimiçi kullanıcılar (detaylı) |
| `GET` | `/api/info` | Sunucu bilgisi |

---

## 🛠️ Teknoloji Yığını

### Frontend
| Teknoloji | Kullanım |
|-----------|----------|
| **Three.js r128** | 3D sahne, kamera, mesh, partikül sistemi, HDR bloom pipeline |
| **Custom GLSL** | Prosedürel güneş simülasyonu (Simplex FBM), Türk bayrağı SDF (hilal + yıldız), hyperspace warp streak |
| **UnrealBloomPass** | HDR bloom + custom ACES tone mapping ShaderPass |
| **Milky Way Skybox** | Equirectangular panorama, ters çevrilmiş küre projeksiyon |
| **Tailwind CSS** | UI bileşenleri, responsive tasarım |
| **WebSocket API** | Gerçek zamanlı senkronizasyon |

### Backend
| Teknoloji | Kullanım |
|-----------|----------|
| **Python** `http.server` | HTTP sunucusu (stdlib, ek bağımlılık yok) |
| **Python** `socket` + `struct` | Raw WebSocket sunucusu (RFC 6455) |
| **pywebview** | Native masaüstü penceresi (WebView2) |
| **PyInstaller** | EXE paketleme |
| **hashlib** (SHA-256) | Şifre karma + salt |
| **Google Gemini** | AI metin analizi |

### Harici Bağımlılıklar

```
requests>=2.28.0        # HTTP istekleri
beautifulsoup4>=4.11.0  # HTML/XML ayrıştırma
python-dotenv>=1.0.0    # .env dosya desteği
aiohttp>=3.8.0          # Asenkron HTTP
pywebview>=5.0          # Masaüstü pencere
pyinstaller>=6.0        # EXE paketleme (opsiyonel)
```

---

## 🎮 Kullanım

### Temel Kontroller

| Kontrol | İşlev |
|---------|-------|
| 🖱️ Sol tık + sürükle | Kamerayı döndür |
| 🖱️ Sağ tık + sürükle | Kamerayı kaydır |
| 🖱️ Scroll | Yakınlaştır / uzaklaştır |
| Küreye tıkla | Sure detayı + ayet listesi |
| 🔍 Arama kutusu | Sure, ayet veya kök ara |

### Toolbar Butonları

| Buton | İşlev |
|-------|-------|
| 🌌 | Yerleşim modeli değiştir (Galaksi / Bulutsu / Küp / Küre) |
| 📓 | Not editörü aç/kapat |
| 📂 | Veri seti yöneticisi |
| ⚙️ | Ayarlar (kullanıcı yönetimi, API anahtarları) |
| 🔑 | API anahtar yönetimi |
| 🚪 | Çıkış |

### Varsayılan Giriş

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| `admin` | `admin123` | Yönetici |

> ⚠️ İlk girişten sonra şifrenizi değiştirmeniz önerilir.

---

## 🔬 Teknik Detaylar

### Yıldız Alanı Fiziği

Arka plan yıldız alanı, uzay gemisi navigasyon ekranı estetiğiyle tasarlanmıştır:

| Parametre | Değer | Gerekçe |
|-----------|-------|---------|
| Yıldız sayısı | 120.000 | Samanyolu bandının yoğunluk farkından belirmesi |
| Dağılım | J2000 galaktik koordinat | Gerçek galaktik düzlem, şişkinlik, Macellan Bulutları |
| Renk modeli | Planck B-V → RGB | Gerçek yıldız sıcaklığı → renk dönüşümü |
| Boyut dağılımı | `pow(random, 5.0)` | Güç-yasası parlaklık fonksiyonu |
| Titreşim | %1.2 | Vakumda yıldız titreşmez; sensör gürültüsü simülasyonu |
| Çekirdek | `exp(-d²×320)` | Atmosfersiz kırınımsız nokta ışık kaynağı |
| Blending | Additive | Fiziksel olarak doğru ışık birleşimi |

### Yerleşim Modelleri

| Model | Algoritma | Formül |
|-------|-----------|--------|
| Galaksi | Arşimed Spirali | `r = a + b·θ`, 4 dönüş, disk kalınlığı ±300k |
| Bulutsu | Gauss Kümeleri | 7 merkez, Fibonacci konumlama, σ saçılma |
| Küp | 3B Izgara | `5×5×5 = 125` düğüm, kristal kafes |
| Küre | Fibonacci Küre | Altın oran açısı `φ = (1+√5)/2`, eşit alan |

### WebSocket Protokolü

- **Handshake**: RFC 6455 uyumlu HTTP Upgrade
- **Kimlik doğrulama**: URL query `?token=xxx`
- **Frame format**: Opcode + maskeleme + payload
- **Mesaj tipleri**: `dataset_saved`, `dataset_deleted`, `dataset_renamed`, `dataset_duplicated`, `user_joined`, `user_left`

### HDR Bloom Pipeline

| Aşama | Detay |
|-------|-------|
| Renderer | `NoToneMapping`, `HalfFloatType` render target |
| Bloom | `UnrealBloomPass` — strength=0.7, radius=0.6, threshold=0.3 |
| Tone mapping | Custom ACES ShaderPass (bloom'dan **sonra** uygulanır) |
| Exposure | 0.9 |

### Türk Bayrağı SDF (Signed Distance Field)

| Bileşen | Algoritma |
|---------|-----------|
| Hilal | İki ofsetli dairenin `max/negate` farkı |
| Yıldız | Inigo Quilez `sdStar5` algoritması (`rf=0.42`) |
| Projeksiyon | View-space `vNormal` — kameraya her zaman dönük |
| Harmanlama | `mix(color, flagGlow, flag * 0.55 * pulse)` — plazma üzerine sıcak beyaz parıltı |
| Boyut | UV ölçeği `0.55` — küre çapının ~%55'i |

### Milky Way Skybox

| Parametre | Değer |
|-----------|-------|
| Kaynak | `milkyway.jpg` equirectangular panorama (705 KB) |
| Geometri | `SphereGeometry(50M)`, `side: THREE.BackSide` |
| Render | `depthWrite: false`, `renderOrder: -1` |
| Takip | Kamera pozisyonuna her frame kopyalanır (sonsuz uzaklık illüzyonu) |

### Veri Mühendisliği Pipeline (DataEngine)

```
Kur'an API ────▶ step1_fetch_quran.py ────▶ quran_data.json (ham veri)
                        │
                        ▼
                step2_extract_roots.py ────▶ kök listesi çıkarma
                        │
                        ▼
                step3_build_root_dict.py ──▶ quran_roots.json (2139 kök)
                        │
                        ▼
                fix_empty_roots.py ────────▶ Gemini AI ile boş anlamları doldurma
```

| Adım | Script | Çıktı |
|------|--------|-------|
| 1. Veri çekme | `step1_fetch_quran.py` | Ham Kur'an verileri (sure/ayet/metin) |
| 2. Kök çıkarma | `step2_extract_roots.py` | Her ayetin Arapça kök analizi |
| 3. Sözlük oluşturma | `step3_build_root_dict.py` | `quran_roots.json` — 2139 kök kaydı |
| 4. AI zenginleştirme | `fix_empty_roots.py` | Boş meaning/pronunciation alanlarını Gemini ile doldurma |
| 5. Veri zenginleştirme | `quran_api_enricher.py` | Ek metadata ile veri zenginleştirme |

---

## 📋 Sürüm Geçmişi

| Sürüm | Tarih | Öne Çıkan |
|-------|-------|-----------|
| **0.35.0** | 2025-07-28 | 🚀 Release — Otomatik güncelleme sistemi + TTS düzeltmesi |
| **0.34.4** | 2025-07-28 | TTS düzeltme (temperature:0 kaldırıldı), Otomatik güncelleme sistemi (GitHub Release + ZIP yedek + sessiz MSI) |
| **0.33.0** | 2025-07-28 | MSI Server/Client modu, Besmele Süleymaniye meali, 16 ayrık kök renk paleti |
| **0.32.2** | 2025-07-28 | Zayıf harf eşdeğerlik kontrolü — indirgenmiş kök sahte eşleşme engelleme |
| **0.32.1** | 2025-07-28 | Şedde desteği, yanlış pozitif kök eşleşme engelleme |
| **0.32.0** | 2025-07-28 | Sure seslendirme (MP3), ayet TTS ayrımı, eksik dipnot bildirimi |
| **0.31.1** | 2025-07-28 | 3 hatalı ayet referansı düzeltmesi |
| **0.31.0** | 2025-07-28 | Zengin veri entegrasyonu: dipnot_parsed linkleri, tefsir popup, çapraz referans haritası, doğrudan MP3 ses oynatma |
| **0.25.2** | 2025-07-28 | HUD seslendirme düğmesi: ana ayet panelinde Seslendir butonu (Gemini TTS + tarayıcı fallback) |
| **0.25.0** | 2025-07-28 | Cosmos atmosferi: 7 nebula, 3000 uzay tozu, 3 kozmik toz şeridi, difraksiyon, kırpışma |
| **0.24.1** | 2025-07-28 | Kök renk kontrast iyileştirmesi (djb2 hash + ayrık palet) |
| **0.24.0** | 2025-07-28 | MSI installer paketi (cx_Freeze, gömülü Python runtime) |
| **0.23.1** | 2025-07-28 | Milky Way panorama skybox (equirectangular, ters küre) |
| **0.23.0** | 2025-07-28 | JSON editör iki sekmeli tasarım (data + roots) |
| **0.22.2** | 2025-07-28 | Kameraya dönük bayrak (vNormal), Fatiha kırmızı renk |
| **0.22.1** | 2025-07-28 | Türk Bayrağı hilal + yıldız SDF shader'lara gömüldü |
| **0.22.0** | 2025-07-28 | Modülarizasyon — monolitik HTML → 20 JS modülü |
| **0.21.5** | 2025-07-28 | GPU bellek sızıntısı düzeltmesi, ölü kod temizliği |
| **0.21.4** | 2025-07-28 | Desktop çift ses sorunu düzeltmesi |
| **0.21.3** | 2025-07-28 | 45 boş kök anlamı Gemini AI ile tamamlandı |
| **0.21.2** | 2025-07-28 | HUD pinned tooltip |
| **0.21.1** | 2025-07-28 | HUD liste kök tag template düzeltmesi |
| **0.20.5** | 2025-07-27 | Shader parlaklık dengesi (sure vs ayet) |
| **0.20.3** | 2025-07-27 | HDR Bloom pipeline (ACES tone mapping düzeltmesi) |
| **0.20.0** | 2025-07-27 | UnrealBloomPass post-processing eklendi |
| **0.19.0** | 2025-07-26 | GLSL prosedürel güneş simülasyonu (Simplex FBM) |
| **0.18.0** | 2025-07-25 | WebGL warp efekti (Canvas2D → Three.js ShaderMaterial) |
| **0.17.0** | 2025-07-24 | Arapça arama desteği, HUD Arapça klavye, versiyon etiketi |
| **0.16.4** | 2025-07-23 | Uzay gemisi navigasyon yıldız görünümü |
| **0.16.0** | 2025-07-23 | Server-Client ağ modu, çevrimiçi kullanıcı paneli |
| **0.15.0** | 2025-07-23 | EXE dağıtım, PyInstaller, INSTALL.md |

Tam sürüm geçmişi için bkz. [CHANGELOG.md](CHANGELOG.md)

---

## 📚 Dokümantasyon

| Dosya | İçerik |
|-------|--------|
| [README.md](README.md) | Proje tanıtımı ve hızlı başlangıç (bu dosya) |
| [INSTALL.md](INSTALL.md) | Detaylı kurulum, yapılandırma, hata çözümleri |
| [FEATURES.md](FEATURES.md) | Özellik detayları ve teknik açıklamalar |
| [CHANGELOG.md](CHANGELOG.md) | Tüm sürüm geçmişi (semantic versioning) |

---

## 🤝 Katkıda Bulunma

1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/ozellik-adi`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inizi push edin (`git push origin feature/ozellik-adi`)
5. Pull Request açın

### Geliştirme Kuralları

- Public API imzalarını değiştirmeden önce tartışın
- `CancellationToken` varsa tüm alt çağrılara iletin
- Log'larda şifre/token/PII maskelenmeli
- Her değişiklik sonrası `CHANGELOG.md` güncellenmelidir
- Semantic versioning: breaking=MAJOR, yeni özellik=MINOR, düzeltme=PATCH

---

## ⚖️ Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakınız.

Kısaca: Yazılımı özgürce kullanabilir, kopyalayabilir, değiştirebilir, dağıtabilir ve ticari amaçla kullanabilirsiniz. Tek koşul, telif hakkı bildirimini ve lisans metnini korumanızdır.

---

<p align="center">
  <strong>سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ</strong><br>
  <sub>Allah'ın şanı yücedir ve O'na hamd olsun, Yüce Allah'ın şanı ne yücedir.</sub>
</p>
