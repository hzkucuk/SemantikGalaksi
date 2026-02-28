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
   { "port": 8080, "host": "0.0.0.0", "auto_port": true }
   ```
2. **Environment Variable**: `SGX_PORT=9090 SGX_HOST=192.168.1.5`
3. **CLI Argümanları**: `python desktop_app.py --port 9090 --host 0.0.0.0`

`auto_port: true` → belirtilen port meşgulse otomatik olarak sonraki boş port bulunur.

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
