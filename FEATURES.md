# FEATURES - Kur'an-ı Kerim Kelime Kök Uzayı

## EXE Olarak Dağıtım (PyInstaller)
Uygulama PyInstaller ile tek klasör (one-folder) EXE olarak paketlenebilir.

| Bileşen | Açıklama |
|---------|----------|
| `SemantikGalaksi.spec` | PyInstaller build tanımı — Frontend, config.json otomatik dahil |
| `build_exe.bat` | Tek çift tıkla EXE oluşturma |
| Frozen Mode | `sys._MEIPASS` ile bundle dosyaları, `sys.executable` ile yazılabilir kullanıcı verileri ayrılır |

- **Bundle edilen dosyalar** (salt-okunur): `Frontend/` klasörü, `config.json`
- **Yazılabilir dosyalar** (EXE yanında oluşur): `webview_data/`, `notes/`, `config.json` (kullanıcı kopyası)
- **Build**: Proje kök dizininde `build_exe.bat` çalıştırın → `dist\SemantikGalaksi\SemantikGalaksi.exe`
- **Dağıtım**: `dist\SemantikGalaksi` klasörünü ZIP olarak paketleyin

## Uzay Yerleşim Modelleri
Sureler ve ayetler 4 farklı 3D yerleşim modeliyle uzayda konumlandırılabilir. Tüm modellerde **Dünya-Ay ölçeği** kullanılır:
- Sure (Dünya) yarıçapı: 1500 birim
- Ayet (Ay) yarıçapı: 400 birim (0.27× Dünya oranı)
- Yörünge mesafesi: ~45000-80000 birim (model bağımlı)

| Model | İkon | Algoritma | Açıklama |
|-------|------|-----------|----------|
| Galaksi | 🌌 | Arşimed Spirali | 4 tam dönüşlü Samanyolu spirali, disk kalınlığı ±300k |
| Bulutsu | 🌫️ | Gauss Kümeleri | 7 küme merkezi, Fibonacci dağılımı, Gauss saçılma |
| Küp | 📦 | 3B Izgara | 5×5×5 = 125 düğüm noktası, kristal kafes yapı |
| Küre | 🔮 | Fibonacci Küre | Altın oran açısı (φ), eşit alan dağılımı |

- **Ayah Saçılma**: Galaksi modelinde disk (yukarı/aşağı), diğerlerinde küresel 3B saçılma
- **Ayah Küre Kalitesi**: Her ayet küresi kendi surahının rengine uygun prosedürel texture alır (48 segment, 512px)
- **Anlık Geçiş**: `switchLayout()` ile veri yeniden işlenir, warp ile geçiş
- **UI**: Toolbar'da 🌌 butonu → açılır menü, her seçenek açıklama alt-metni içerir

## WYSIWYG Not Editörü
Kullanıcılar zengin metin formatında not tutabilir. Notlar sunucu tarafında kullanıcı bazlı JSON dosyalarına kaydedilir.

| Biçimlendirme | Açıklama |
|---------------|----------|
| **B** / *I* / U / ~~S~~ | Kalın, İtalik, Altı Çizili, Üstü Çizili |
| H1 / H2 / H3 | Başlık seviyeleri |
| ☰ / ☷ | Madde işaretli / Numaralı liste |
| ❝ | Blok alıntı |
| 🔗 | Bağlantı ekleme |
| ⌨ | Satır içi kod |

- **Otomatik Kayıt**: Her değişiklik 500ms debounce ile otomatik kaydedilir
- **Sunucu Desteği**: Desktop modda `DataEngine/notes/{username}.json` dosyasına kaydedilir (taşınabilir)
- **Web Fallback**: Sunucu yoksa localStorage'a kaydedilir
- **REST API**: `GET/POST /api/notes` (tüm notlar), `DELETE /api/note/{id}` (tekil silme)
- **Not Listesi**: Sol sidebar'da tüm notlar tarihe göre listelenir
- **Kullanıcı Bazlı**: Her kullanıcı kendi notlarını görür

## Modern Header
- Glassmorphism tasarım: `backdrop-filter: blur(24px) saturate(1.4)`
- Kompakt buton grid (36×36px, 10px border-radius)
- Responsive: mobilde sadece ikon, desktop'ta ikon + etiket
- Logo alanı: 🕋 ikonu + başlık + alt başlık

## Ayet Seslendirme (TTS)
HUD panelindeki ayet detay kartında ve ilişkili ayet listesinde bulunan seslendir düğmeleri ile Türkçe meal seslendirme.

| Bileşen | Açıklama |
|---------|----------|
| Gemini TTS | Google Gemini 2.5 Flash Preview TTS — `Charon` sesi, Türkçe |
| Tarayıcı TTS | `SpeechSynthesis` API fallback (tr-TR, rate 0.9) |
| PCM→WAV | 24kHz PCM verisini WAV başlığı ile sarmalama (`pcmToWav`) |
| Önbellek | `audioCache` Map — aynı metin tekrar istendiğinde ağ çağrısı yapılmaz |
| Durum göstergesi | ▶ (hazır) → ⏳ (yükleniyor) → ⏹ (çalıyor) → ▶ (bitti) |

### Seslendir Düğmesi Konumları
| Konum | Fonksiyon | Açıklama |
|-------|-----------|----------|
| HUD ayet detay kartı | `speakCurrentHudAyah()` | Aktif ayetin mealini seslendirir |
| İlişkili ayet listesi | `speakThis(btn, nodeId)` | Her ilişkili ayetin yanındaki ▶ butonu |

## Arapça Arama Desteği
Hem üst arama çubuğu hem HUD panelindeki semantik bağlantı araması Arapça girişi destekler.

### Arama Motoru
| Özellik | Açıklama |
|---------|----------|
| Otomatik dil algılama | Unicode `\u0600-\u06FF` aralığı ile Arapça girdi tespiti |
| Hareke normalizasyonu | Fethâ, damma, kesra, şedde, sükûn vb. tashkeel otomatik kaldırılır |
| Elif normalizasyonu | أ إ آ ٱ → ا birleştirmesi |
| Tâ marbûta | ة → ه normalizasyonu |
| Elif maksûra | ى → ي normalizasyonu |
| Metin arama | Ayet metinleri (`text` alanı) içinde Arapça arama |
| Kök arama | Ayet kökleri (`roots` alanı) içinde Arapça arama |

### Arapça Sanal Klavye
Üç ayrı konumda Arapça sanal klavye bulunur:

| Konum | Buton | Kullanım |
|-------|-------|----------|
| Üst arama çubuğu | ع | Ayet metni ve kök arama |
| HUD semantik bağlantılar | ع | Bağlantılı ayetleri filtreleme |
| JSON Editör | ⌨ Arapça | Veri seti düzenleme |

- **RTL modu**: Klavye aktifken input yönü sağdan sola döner, Amiri fontu aktif olur
- **4 satır düzen**: Harfler (3 satır) + Harekeler & kontrol tuşları (1 satır)
- **Sonuç gösterimi**: Arapça aramada sonuçlarda ayet metni ve eşleşen kökler (🔤) gösterilir

## WebGL Hyperspace Warp Efekti (v0.25.1 — Millennium Falcon GIF Referans)
Sureler arası geçişlerde GPU-hızlandırmalı hyperspace warp efekti. Millennium Falcon lightspeed GIF'ine sadık: **arka plan karanlık kalır, efektin %90'ı yıldız çizgileridir**.

| Bileşen | Detay |
|---------|-------|
| Geometri | 10000 instance × 6 vertex `InstancedBufferGeometry` — radyal streak quad'ları |
| Streak VS | Clip-space, uzunluk cap 8.0, hızla kalınlaşma (2.5x), parlaklık boost (3x) |
| Streak FS | Beyaz-dominant: `paleBlue → coolWhite → pureWhite`, baş→kuyruk glow |
| Background | SADECE çıkış flash (kısa beyaz patlama) — overlay/tunnel/blueshift YOK |
| Blending | `THREE.AdditiveBlending` — streak glow birikimi |
| Kamera | FOV 65°→62°→68°→65°, minimal sallanma — Star Wars tarzı sabit açı |
| Performans | Tek draw call, tüm hesaplama GPU GLSL shader'larında |

### 2 Faz Giriş + Simetrik Çıkış
| Faz | Aralık | Açıklama |
|-----|--------|----------|
| 1. Yavaş Birikim | %0-45 (~1.3s) | Yıldızlar noktadan çizgiye kademeli uzar, hafif zoom-in |
| 2. GÜM! | %45-50 (~0.15s) | Ani patlama, streak'ler tam hız, kamera sarsıntısı |
| → Drift | Anında | GÜM'den 0 frame gecikmeyle ters çıkış başlar |
| 3. Ters GÜM | %0-5 (~0.09s) | Ani frenleme, streak'ler hızla yavaşlar |
| 4. Sönme | %5-100 (~1.7s) | Streak'ler yavaşça kaybolur, kamera yerine oturur |

- **Başlatma**: Bir sureye tıklama veya `warpToId()` çağrısı ile tetiklenir
- **Süre**: Giriş ~1.5s + Çıkış ~1.8s
- **Post-warp drift**: 2000 birim overshoot + sönümlü geri dönüş

## WebSocket Gerçek Zamanlı Senkronizasyon

## Cosmos Atmosferi (v0.25.0)
Gerçek uzay oyunlarındaki atmosferi yakalamak için sahneye eklenen katmanlı görsel efektler.

### Katman Yapısı
| Katman | Öğe | Blending | RenderOrder |
|--------|-----|----------|-------------|
| 0 | `milkyway.jpg` skybox | Normal | -1 |
| 1 | 3 Kozmik toz şeridi | Normal | -0.3 |
| 2 | 7 Prosedürel nebula | Additive | -0.5 |
| 3 | 120K yıldız + difraksiyon | Additive | 0 |
| 4 | 3000 uzay tozu partikülü | Additive | 0 |
| 5 | Quran veri küreleri | Normal | 0+ |

### Prosedürel Nebulalar
- **7 adet** farklı renkte gaz bulutsası: Mor, Turkuaz, Turuncu, Kırmızı, Mavi, Fuşya, Yeşil
- **GLSL FBM noise**: Mevcut `snoise` + `fbm` + `ridge` fonksiyonları kullanılarak prosedürel desen
- **Billboard rotasyonu**: Her frame `lookAt(camera)` ile kameraya dönük
- **Filament yapıları**: `ridge(snoise(...))` ile ince gaz telleri
- **Parlak çekirdek**: Gaussian `exp(-d*d*4)` ile merkez parıltı
- **PlaneGeometry**: 8-14M birim ölçekli düzlem, sahnenin farklı bölgelerinde

### Uzay Tozu Partikülleri
- **3000 adet** küçük parlak toz tanecik
- Kamera etrafında küresel dağılım (500K-5M birim yarıçap)
- **Kamera takibi**: `spaceDust.position.copy(camera.position)` — her yerde süzülen toz hissi
- Mavi-beyaz (%50), altın (%25), saf beyaz (%25) renk dağılımı
- Sinüsoidal kırpışma (0.6 + 0.4 × sin)

### Kozmik Toz Şeritleri
- **3 adet** geniş karanlık nebula — arka planı kısmen kapatan toz desenleri
- Normal blending (ışığı emer, kapatır)
- Kızılımsı kenar: Yıldız ışığının tozdan geçişi efekti (Mie saçılımı referansı)
- PlaneGeometry (yatay dikdörtgen, scale × 0.4 oran)

### Yıldız İyileştirmeleri
- **Difraksiyon çizgileri**: Parlak yıldızlarda (vSizeNorm > 0.15) 4+4 kollu ışık efekti
  - 4 ortogonal kol (yatay + dikey): `exp(-ay²×800) × exp(-ax×8)`
  - 4 çapraz kol (45°): `abs(c.x ± c.y) × 0.7071` rotasyonlu
- **Çoklu frekans kırpışma**: 3 sinüs katmanı (0.7Hz, 1.3Hz, 2.1Hz) × farklı fazlar
  - Toplam amplitüd: %5-8 (önceki: %1-2)
  - `vSizeNorm` ile ağırlıklı — sadece parlak yıldızlar belirgin titrer

## WebSocket Gerçek Zamanlı Senkronizasyon
Birden fazla kullanıcı aynı anda çalışırken değişiklikler anlık olarak tüm istemcilere iletilir.

| Olay | Tetiklenme | Etki |
|------|-----------|------|
| `dataset_saved` | Veri seti kaydedildiğinde | Dataset paneli otomatik yenilenir |
| `dataset_deleted` | Veri seti silindiğinde | Aktif set silindiyse orijinale döner |
| `dataset_renamed` | İsim değiştirildiğinde | Aktif set ismini günceller |
| `dataset_duplicated` | Çoğaltıldığında | Dataset paneli otomatik yenilenir |
| `user_joined` | Kullanıcı bağlandığında | Çevrimiçi sayısı güncellenir |
| `user_left` | Kullanıcı ayrıldığında | Çevrimiçi sayısı güncellenir |

- **Sunucu**: Raw WebSocket (Python `socket` + `struct`, ek paket gerektirmez)
- **Port**: Varsayılan HTTP port + 1 (config.json'da `ws_port` ile özelleştirilebilir)
- **Kimlik doğrulama**: Bağlantı URL'sinde `?token=xxx` query parametresi
- **Otomatik reconnect**: Bağlantı koptuğunda 3 saniyede yeniden dener
- **Toast bildirimleri**: Her olay için sağ üstte 4 sn görünen animasyonlu kart

## Esnek Sunucu Yapılandırması
Port ve host ayarları 3 katmanlı öncelikle yapılandırılabilir:

1. **config.json** (varsayılan): `DataEngine/config.json`
   ```json
   { "port": 8080, "host": "0.0.0.0", "auto_port": false, "mode": "server" }
   ```
2. **Environment Variable**: `SGX_PORT=9090 SGX_HOST=192.168.1.5`
3. **CLI Argümanları**: `python desktop_app.py --port 9090 --host 0.0.0.0 --mode client`

`auto_port: true` → belirtilen port meşgulse otomatik olarak sonraki boş port bulunur.

### Server-Client Ağ Modu
Birden fazla makineyle çalışma desteği (örn. 1 sunucu + N terminal):

| Ayar | Açıklama |
|------|----------|
| `mode` | `"server"` (sunucu başlatır) veya `"client"` (uzak sunucuya bağlanır) |
| `server_ip` | Client modunda bağlanılacak sunucu IP adresi |
| `server_port` | Client modunda sunucunun HTTP portu |
| `server_ws_port` | Client modunda sunucunun WebSocket portu |

- **Server**: `host: "0.0.0.0"` ile tüm ağ arayüzlerini dinler, `auto_port: false` sabit port sağlar
- **Client**: Sunucu başlatmaz, sadece pywebview penceresi ile `http://{server_ip}:{server_port}` adresine bağlanır

## Dosya İndirme (Dışa Aktarma)
- **Masaüstü modu**: OS native "Farklı Kaydet" diyaloğu (pywebview bridge)
- **Web modu**: Blob + anchor click (standart tarayıcı indirme)
- Editör "Dışa Aktar" ve dataset panel "⬇" butonları her iki modda çalışır.

## Veri Seti Yönetimi
| İşlem | Buton | Açıklama |
|-------|-------|----------|
| İndir | ⬇ | JSON dosyasını dışa aktar |
| Yeniden Adlandır | ✏️ | Dosya adını değiştir |
| Çoğalt | 📋 | Mevcut veri setinin kopyasını oluştur |
| Sil | 🗑 | Onay sonrası kalıcı silme |

- Dosya boyutu (KB/MB) ve değiştiren kullanıcı bilgisi listelenir.
- Viewer rolü yalnızca indirme yapabilir; düzenleme/silme/rename gizlenir.

## Kimlik Doğrulama ve Rol Sistemi
- **admin**: Tam yetki (kullanıcı CRUD, dataset CRUD)
- **editor**: Dataset okuma/yazma/silme
- **viewer**: Sadece okuma ve indirme
- Token tabanlı oturum, SHA-256 + salt şifreleme
- Varsayılan giriş: `admin / admin123`
