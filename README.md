<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Three.js-r152-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/WebSocket-RFC_6455-4353FF?style=for-the-badge" alt="WebSocket">
  <img src="https://img.shields.io/badge/Sürüm-0.18.0-34d399?style=for-the-badge" alt="Sürüm">
  <img src="https://img.shields.io/badge/Lisans-MIT-34d399?style=for-the-badge" alt="Lisans">
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
- **114 sure** = 114 gezegen küresi (prosedürel texture, Fresnel atmosfer glow)
- **6236+ ayet** = her sure etrafında yörüngede dönen uydu küreleri
- **Kök bağlantıları** = ayetler arası neon ışık çizgileri (AdditiveBlending glow)
- **4 yerleşim modeli**: Galaksi (Arşimed spirali), Bulutsu (Gauss kümeleri), Küp (3B ızgara), Küre (Fibonacci)
- **Hyperspace warp**: Sureler arası GPU-hızlandırmalı geçiş (Three.js ShaderMaterial, 8000 yıldız, GLSL streak efekti)

### ⭐ Uzay Gemisi Navigasyon Yıldız Haritası
- **120.000 yıldız**, J2000 galaktik koordinatlara dayalı dağılım
- **Samanyolu bandı**: Galaktik düzlem (GNP: RA=192.86°, Dec=+27.13°) boyunca yoğunlaşma
- **Galaktik şişkinlik**: Sagittarius A* yönünde kümelenme
- **Macellan Bulutları**: Büyük/Küçük uydu galaksi kümeleri
- **Planck B-V → RGB**: Gerçek yıldız renkleri (O/B mavi → M kırmızı cüce)
- **Vakum fiziği**: Atmosfer yok → titreşimsiz, iğne ucu kadar keskin noktalar

### 🤖 Yapay Zekâ Analizi
- **Google Gemini 2.5 Flash** entegrasyonu
- Seçilen ayetin semantik, morfolojik ve tematik AI analizi
- Uygulama içi API anahtar yönetimi (güvenli Base64 depolama)

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

### 🔐 Kimlik Doğrulama ve Yetkilendirme
- Token tabanlı oturum, SHA-256 + salt şifreleme
- 3 rol: **admin** (tam yetki), **editor** (CRUD), **viewer** (salt okunur)
- Admin paneli: kullanıcı oluşturma / silme / rol değiştirme

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    Masaüstü Penceresi                    │
│                  (pywebview / WebView2)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Frontend (index.html)                                 │
│   ├── Three.js — 3D sahne, kameralar, küreler, çizgiler │
│   ├── Custom GLSL Shader — yıldız alanı, atmosfer glow  │
│   ├── Tailwind CSS — UI bileşenleri                     │
│   ├── Canvas2D — hyperspace warp efekti                 │
│   ├── WebSocket Client — gerçek zamanlı senkronizasyon  │
│   └── REST Client — auth, dataset, notes API            │
│                                                         │
├───────────────────── HTTP / WS ─────────────────────────┤
│                                                         │
│   Backend (desktop_app.py)                              │
│   ├── ThreadingTCPServer — HTTP sunucusu                │
│   ├── Raw WebSocket Server — RFC 6455 uyumlu            │
│   ├── Auth Module — token, session, RBAC                │
│   ├── Dataset Manager — JSON dosya CRUD                 │
│   ├── Notes Manager — kullanıcı bazlı not depolama      │
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
│   ├── index.html                # Ana arayüz (3D uzay + tüm UI)
│   ├── warp.html                 # Warp geçiş sayfası
│   ├── quran_data.json           # Kur'an verileri (sureler, ayetler, kökler)
│   ├── three.min.js              # Three.js 3D kütüphanesi
│   ├── OrbitControls.js          # 3D kamera kontrolü
│   ├── tailwind.min.js           # Tailwind CSS
│   ├── besmele.wav               # Besmele ses dosyası
│   └── datasets/                 # Kullanıcı veri setleri
├── SemantikGalaksi.spec          # PyInstaller build tanımı
├── build_exe.bat                 # EXE build script'i
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
| **Three.js** | 3D sahne, kamera, mesh, partikül sistemi |
| **Custom GLSL** | Yıldız alanı shader, Fresnel atmosfer glow, hyperspace warp streak efekti |
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

---

## 📋 Sürüm Geçmişi

| Sürüm | Tarih | Öne Çıkan |
|-------|-------|-----------|
| **0.18.0** | 2025-07-25 | WebGL warp efekti (Canvas2D → Three.js ShaderMaterial) |
| **0.17.0** | 2025-07-24 | Arapça arama desteği, HUD Arapça klavye, versiyon etiketi |
| **0.16.4** | 2025-07-23 | Uzay gemisi navigasyon yıldız görünümü |
| **0.16.0** | 2025-07-23 | Server-Client ağ modu, çevrimiçi kullanıcı paneli |
| **0.15.0** | 2025-07-23 | EXE dağıtım, PyInstaller, INSTALL.md |
| **0.14.0** | 2025-01-XX | Prosedürel ayet texture, tooltip düzeltmeleri |
| **0.13.0** | 2025-01-XX | 4 yerleşim modeli, WYSIWYG not editörü, modern header |
| **0.12.0** | 2025-01-XX | Neon yükleme ekranı, Besmele TTS sesi |
| **0.11.0** | 2025-01-XX | WebSocket senkronizasyon, toast bildirimleri |
| **0.10.0** | 2025-01-XX | Esnek yapılandırma, native dosya indirme |
| **0.9.0** | — | Kimlik doğrulama, rol sistemi |
| **0.8.0** | — | Çok kullanıcılı sunucu, REST API |
| **0.7.0** | — | Kök istatistikleri, JSON editör, veri seti yöneticisi |

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
