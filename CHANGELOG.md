# CHANGELOG

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
