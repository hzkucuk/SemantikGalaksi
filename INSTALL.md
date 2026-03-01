# 🕋 Kur'an-ı Kerim Kelime Kök Uzayı — Kurulum ve Kullanım Kılavuzu

> **Sürüm:** 0.15.0 · **Son Güncelleme:** 2025-07-23
>
> Kur'an-ı Kerim surelerini ve ayetlerini 3D uzay görselleştirmesi ile keşfetmenizi sağlayan masaüstü ve web uygulaması.

---

## 📑 İçindekiler

1. [Ön Gereksinimler](#1--ön-gereksinimler)
2. [Kurulum Adımları](#2--kurulum-adımları)
3. [Ortam Değişkenleri ve `.env` Yapılandırması](#3--ortam-değişkenleri-ve-env-yapılandırması)
4. [Sunucu Yapılandırması (`config.json`)](#4--sunucu-yapılandırması-configjson)
5. [Uygulamayı Çalıştırma](#5--uygulamayı-çalıştırma)
6. [EXE Olarak Paketleme (Dağıtım)](#6--exe-olarak-paketleme-dağıtım)
7. [Temel Kullanım Senaryoları](#7--temel-kullanım-senaryoları)
8. [API Referansı](#8--api-referansı)
9. [Sık Karşılaşılan Hatalar ve Çözümleri](#9--sık-karşılaşılan-hatalar-ve-çözümleri)
10. [Güncelleme Talimatları](#10--güncelleme-talimatları)
11. [Kaldırma Talimatları](#11--kaldırma-talimatları)

---

## 1 · Ön Gereksinimler

| Bileşen | Minimum Sürüm | Açıklama |
|---------|---------------|----------|
| **Python** | 3.10+ | 3.12 önerilir |
| **pip** | 22+ | Python ile birlikte gelir |
| **İşletim Sistemi** | Windows 10/11 | pywebview masaüstü modu Windows'a özgüdür; web modu tüm platformlarda çalışır |
| **Tarayıcı** (web modu) | Chrome/Edge/Firefox güncel | Three.js WebGL desteği gereklidir |
| **Git** | 2.30+ | Repo klonlama için |

💡 **İpucu:** Python kurulumunda **"Add Python to PATH"** seçeneğini işaretlemeyi unutmayın.

⚠️ **Uyarı:** Masaüstü modu (pywebview penceresi) yalnızca **Windows** üzerinde Edge/Chromium WebView2 ile çalışır. Linux/macOS kullanıcıları uygulamayı **web modu** ile kullanabilir.

### Python Sürüm Kontrolü

```bash
python --version
pip --version
```

---

## 2 · Kurulum Adımları

### 2.1 — Repo Klonlama

```bash
git clone <REPO_URL> KuranKokUzayi
cd KuranKokUzayi
```

### 2.2 — Sanal Ortam Oluşturma

```bash
# Sanal ortam oluştur
python -m venv venv

# Aktif et (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Aktif et (Windows CMD)
venv\Scripts\activate.bat

# Aktif et (Linux/macOS)
source venv/bin/activate
```

⚠️ **Uyarı:** PowerShell'de `Activate.ps1` çalışmıyorsa önce şu komutu çalıştırın:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 2.3 — Bağımlılıkları Yükleme

```bash
pip install -r DataEngine/requirements.txt
```

Yüklenecek paketler:

| Paket | Sürüm | Kullanım Alanı |
|-------|-------|----------------|
| `requests` | ≥ 2.28.0 | HTTP istekleri |
| `beautifulsoup4` | ≥ 4.11.0 | HTML/XML ayrıştırma |
| `python-dotenv` | ≥ 1.0.0 | `.env` dosyası desteği |
| `aiohttp` | ≥ 3.8.0 | Asenkron HTTP |
| `pywebview` | ≥ 5.0 | Masaüstü pencere (WebView) |
| `pyinstaller` | ≥ 6.0 | EXE paketleme (opsiyonel) |

💡 **İpucu:** EXE oluşturmayacaksanız `pyinstaller` kurulumu zorunlu değildir.

### 2.4 — Proje Dizin Yapısı

Kurulum sonrası dizin yapısı aşağıdaki gibi olmalıdır:

```
KuranKokUzayi/
├── DataEngine/
│   ├── desktop_app.py          # Ana uygulama (sunucu + masaüstü)
│   ├── config.json             # Sunucu yapılandırması
│   ├── requirements.txt        # Python bağımlılıkları
│   ├── .env                    # API anahtarları (Gemini)
│   └── generate_besmele_audio.py  # Besmele ses üretici
├── Frontend/
│   ├── index.html              # Ana arayüz (Three.js 3D uzay)
│   ├── warp.html               # Warp geçiş efekti
│   ├── quran_data.json         # Kur'an verileri
│   ├── three.min.js            # Three.js kütüphanesi
│   ├── OrbitControls.js        # 3D kamera kontrolü
│   ├── tailwind.min.js         # Tailwind CSS
│   ├── besmele.wav             # Besmele ses dosyası
│   └── datasets/               # Kullanıcı veri setleri
├── SemantikGalaksi.spec        # PyInstaller build tanımı
├── build_exe.bat               # EXE build script'i
├── CHANGELOG.md
├── FEATURES.md
└── INSTALL.md                  # Bu dosya
```

---

## 3 · Ortam Değişkenleri ve `.env` Yapılandırması

`.env` dosyası `DataEngine/` dizininde bulunur ve Gemini AI API anahtarını içerir.

### Örnek `.env` Dosyası

```env
API_KEY=BURAYA_KENDI_GEMINI_API_ANAHTARINIZI_YAZIN
GEMINI_MODEL=gemini-2.5-flash
```

⚠️ **Uyarı:** `.env` dosyasındaki `API_KEY` değerini kendi Google Gemini API anahtarınızla değiştirin. Repo'daki örnek anahtar çalışmayabilir.

### Gemini API Anahtarı Alma

1. [Google AI Studio](https://aistudio.google.com/) adresine gidin
2. **Get API key** butonuna tıklayın
3. Yeni bir anahtar oluşturun veya mevcut bir projeyi seçin
4. Anahtarı kopyalayıp `.env` dosyasına yapıştırın

💡 **İpucu:** API anahtarlarını uygulama içinden de yönetebilirsiniz — giriş yaptıktan sonra arayüzdeki anahtar yönetimi panelini kullanın.

⚠️ **Güvenlik:** `.env` dosyasını asla Git'e göndermeyin. `.gitignore` dosyasına eklendiğinden emin olun.

---

## 4 · Sunucu Yapılandırması (`config.json`)

`DataEngine/config.json` dosyası sunucu ayarlarını belirler:

```json
{
  "port": 8080,
  "host": "0.0.0.0",
  "auto_port": true,
  "ws_port": 8081
}
```

| Parametre | Varsayılan | Açıklama |
|-----------|-----------|----------|
| `port` | `8080` | HTTP sunucu portu |
| `host` | `0.0.0.0` | Dinleme adresi (`0.0.0.0` = tüm ağ arayüzleri) |
| `auto_port` | `true` | Port meşgulse otomatik boş port bul |
| `ws_port` | `8081` | WebSocket sunucu portu |

### Yapılandırma Öncelik Sırası (düşükten yükseğe)

1. **`config.json`** — varsayılan değerler
2. **Ortam değişkenleri** — `SGX_PORT`, `SGX_HOST`
3. **CLI argümanları** — `--port`, `--host`

```bash
# Ortam değişkeni ile port değiştirme
set SGX_PORT=9090
python DataEngine/desktop_app.py

# CLI argümanı ile port değiştirme
python DataEngine/desktop_app.py --port 9090 --host 192.168.1.5
```

---

## 5 · Uygulamayı Çalıştırma

### 5.1 — Masaüstü Modu (Önerilen)

Masaüstü modu, pywebview ile native bir pencere açar:

```bash
cd KuranKokUzayi
python DataEngine/desktop_app.py
```

Uygulama başlatıldığında:
- HTTP sunucusu arka planda başlar (varsayılan: `http://127.0.0.1:8080`)
- WebSocket sunucusu başlar (varsayılan: `ws://127.0.0.1:8081`)
- Masaüstü penceresi tam ekran açılır
- Besmele sesi çalar (Windows)

### 5.2 — Web Modu (Tarayıcıdan Erişim)

Aynı komutu çalıştırdıktan sonra, aynı ağdaki herhangi bir cihazdan tarayıcı ile erişebilirsiniz:

```
http://<SUNUCU_IP>:8080
```

Konsolda görünen çıktıdan IP adresini ve portu öğrenebilirsiniz:

```
Sunucu başlatıldı: http://127.0.0.1:8080
WebSocket:         ws://127.0.0.1:8081
Ağ erişimi:        http://192.168.1.100:8080
Varsayılan giriş:  admin / admin123
```

### 5.3 — Varsayılan Giriş Bilgileri

| Kullanıcı Adı | Şifre | Rol |
|---------------|-------|-----|
| `admin` | `admin123` | Yönetici |

⚠️ **Uyarı:** İlk girişten sonra yönetici şifresini mutlaka değiştirin!

💡 **İpucu:** Admin panelinden yeni kullanıcılar oluşturabilirsiniz. Roller: `admin`, `editor`, `viewer`.

### 5.4 — Özel Port ile Çalıştırma

```bash
# Belirli bir port ile
python DataEngine/desktop_app.py --port 3000

# Belirli bir host ve port ile
python DataEngine/desktop_app.py --host 127.0.0.1 --port 3000
```

---

## 6 · EXE Olarak Paketleme (Dağıtım)

Python kurulmadan çalışacak bağımsız bir EXE oluşturmak için:

### 6.1 — Build

```bash
# Proje kök dizininde
build_exe.bat
```

Veya manuel olarak:

```bash
pyinstaller SemantikGalaksi.spec --noconfirm
```

### 6.2 — Çıktı

```
dist/
└── SemantikGalaksi/
    ├── SemantikGalaksi.exe    # Ana çalıştırılabilir dosya
    ├── config.json             # Yapılandırma (düzenlenebilir)
    └── ... (bağımlılık DLL'leri)
```

### 6.3 — Dağıtım

1. `dist\SemantikGalaksi` klasörünü ZIP olarak paketleyin
2. Hedef bilgisayarda ZIP'i çıkartın
3. `SemantikGalaksi.exe` dosyasını çalıştırın

💡 **İpucu:** EXE yanında oluşan `config.json` dosyasını düzenleyerek port/host ayarlarını değiştirebilirsiniz.

⚠️ **Uyarı:** Bundle edilen dosyalar (Frontend vb.) salt okunurdur. Kullanıcı verileri (notlar, API anahtarları, config) EXE'nin bulunduğu dizine yazılır.

---

## 7 · Temel Kullanım Senaryoları

### 7.1 — Giriş Yapma

1. Uygulama açıldığında Eûzü Besmele yükleme ekranı görünür
2. **"▶ Dokunarak Başlat"** butonuna tıklayın (tarayıcı ses politikası gereği)
3. Besmele sesi çalar, ardından giriş ekranı gelir
4. Kullanıcı adı ve şifrenizi girin → **Giriş** butonuna tıklayın

### 7.2 — 3D Uzay Görselleştirmesi

Giriş sonrası ana ekranda Kur'an surelerinin 3D uzayda yerleştirilmiş halini görürsünüz:

- **🖱️ Sol tık + sürükle:** Kamerayı döndür
- **🖱️ Sağ tık + sürükle:** Kamerayı kaydır
- **🖱️ Scroll:** Yakınlaştır / Uzaklaştır
- **Küre üzerine tıkla:** Surenin ayetlerini ve kök bağlantılarını görüntüle

### 7.3 — Uzay Yerleşim Modelini Değiştirme

Üst toolbar'daki 🌌 butonuna tıklayarak 4 farklı model arasında geçiş yapabilirsiniz:

| Model | Açıklama |
|-------|----------|
| 🌌 **Galaksi** | Arşimed spirali, Samanyolu modeli (varsayılan) |
| 🌫️ **Bulutsu** | Gauss bulut kümeleri, organik dağılım |
| 📦 **Küp** | 5×5×5 kristal kafes yapı |
| 🔮 **Küre** | Fibonacci küre, altın oran dağılımı |

### 7.4 — Veri Seti Yönetimi

- **⬇ İndir:** Veri setini JSON olarak dışa aktar
- **✏️ Yeniden Adlandır:** Veri setinin adını değiştir
- **📋 Çoğalt:** Mevcut veri setinin kopyasını oluştur
- **🗑️ Sil:** Onay sonrası veri setini kaldır

### 7.5 — Not Tutma (WYSIWYG Editör)

1. Toolbar'daki 📓 butonuna tıklayın
2. Zengin metin editörü ile notunuzu yazın (Bold, İtalik, Başlıklar, Listeler, Alıntı, Kod, Bağlantı)
3. Notlar **otomatik olarak** 500ms debounce ile kaydedilir
4. Sol sidebar'dan önceki notlarınızı görüntüleyin veya silin

💡 **İpucu:** Masaüstü modunda notlar `DataEngine/notes/{kullanıcı_adı}.json` dosyasına; web modunda sunucu yoksa `localStorage`'a kaydedilir.

### 7.6 — Çok Kullanıcılı Çalışma (WebSocket)

Aynı ağdaki birden fazla kullanıcı eş zamanlı çalışabilir:

- Veri seti kaydetme/silme/yeniden adlandırma/çoğaltma işlemleri anlık olarak tüm kullanıcılara bildirilir
- Sol alttaki göstergeden çevrimiçi kullanıcıları görebilirsiniz
- Toast bildirimleri ile değişikliklerden haberdar olursunuz

### 7.7 — API Anahtar Yönetimi

Uygulama arayüzünden Gemini API anahtarlarınızı güvenli şekilde yönetebilirsiniz:
- Anahtar ekleme / silme
- Anahtar durumu takibi (aktif/beklemede)
- Anahtarlar Base64 ile kodlanarak `webview_data/.api_keys` dosyasında saklanır

### 7.8 — Kullanıcı Yönetimi (Admin)

Admin rolündeki kullanıcılar:
- Yeni kullanıcı oluşturabilir
- Kullanıcı rollerini değiştirebilir (`admin` / `editor` / `viewer`)
- Kullanıcı silebilir
- Kendi şifrelerini değiştirebilir

---

## 8 · API Referansı

Tüm API endpoint'leri `Authorization: Bearer <token>` header'ı gerektirir (login hariç).

### Kimlik Doğrulama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/auth/login` | Giriş yap → token al |
| `POST` | `/api/auth/logout` | Çıkış yap |
| `GET` | `/api/auth/me` | Oturum bilgisi |
| `GET` | `/api/auth/users` | Kullanıcı listesi (admin) |
| `POST` | `/api/auth/users` | Yeni kullanıcı oluştur (admin) |
| `PUT` | `/api/auth/user/{username}` | Rol değiştir (admin) |
| `DELETE` | `/api/auth/user/{username}` | Kullanıcı sil (admin) |
| `POST` | `/api/auth/change-password` | Şifre değiştir |

### Veri Setleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/datasets` | Veri seti listesi |
| `GET` | `/api/dataset/{name}` | Veri seti detayı |
| `POST` | `/api/dataset/{name}` | Veri seti kaydet |
| `DELETE` | `/api/dataset/{name}` | Veri seti sil |
| `POST` | `/api/dataset-rename` | Yeniden adlandır |
| `POST` | `/api/dataset-duplicate` | Çoğalt |
| `GET` | `/api/download/{name}` | Dosya indir |

### Notlar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/notes` | Kullanıcının notları |
| `POST` | `/api/notes` | Notları kaydet |
| `DELETE` | `/api/note/{id}` | Not sil |

### Diğer

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/online-users` | Çevrimiçi kullanıcılar |
| `GET` | `/api/info` | Sunucu bilgileri (IP, port, WS portu) |

---

## 9 · Sık Karşılaşılan Hatalar ve Çözümleri

### ❌ `ModuleNotFoundError: No module named 'webview'`

**Sebep:** pywebview yüklenmemiş veya sanal ortam aktif değil.

```bash
# Sanal ortamı aktif edip yeniden yükleyin
.\venv\Scripts\Activate.ps1
pip install pywebview>=5.0
```

### ❌ `OSError: [Errno 10048] Port 8080 zaten kullanımda`

**Sebep:** Başka bir uygulama aynı portu kullanıyor.

```bash
# Çözüm 1: auto_port etkinleştirin (config.json'da)
# "auto_port": true

# Çözüm 2: Farklı port ile çalıştırın
python DataEngine/desktop_app.py --port 9090
```

### ❌ `WebSocket sunucusu: ws port kullanılamadı`

**Sebep:** WebSocket portu (varsayılan: HTTP portu + 1) meşgul.

```bash
# config.json'da ws_port değerini değiştirin
{ "ws_port": 9091 }
```

### ❌ Besmele Sesi Çalmıyor (Web Modu)

**Sebep:** Tarayıcı autoplay politikası ses çalmayı engelliyor.

**Çözüm:** Yükleme ekranındaki **"▶ Dokunarak Başlat"** butonuna tıklayın. Bu, tarayıcı ses politikası gereği kullanıcı etkileşimi sonrası sesi başlatır.

### ❌ Masaüstü Penceresi Açılmıyor (Linux/macOS)

**Sebep:** pywebview'ın masaüstü modu Windows Edge/Chromium WebView2'ye bağlıdır.

**Çözüm:** Uygulamayı web modu ile kullanın — sunucu başlatıldıktan sonra tarayıcıdan `http://127.0.0.1:8080` adresine gidin.

### ❌ `FileNotFoundError: besmele.wav`

**Sebep:** Besmele ses dosyası `Frontend/` dizininde eksik.

```bash
# Yeniden oluşturmak için (Gemini API anahtarı gerekir):
python DataEngine/generate_besmele_audio.py <API_KEY>
```

### ❌ 3D Görselleştirme Yüklenmiyor / Boş Ekran

**Sebep:** WebGL desteklenmiyor veya `quran_data.json` eksik.

**Çözüm:**
1. Tarayıcınızın WebGL'i desteklediğinden emin olun (Chrome/Edge güncel sürüm)
2. `Frontend/quran_data.json` dosyasının mevcut olduğunu kontrol edin
3. Tarayıcı konsolunu (F12) açıp hata mesajlarını inceleyin

### ❌ `401 Unauthorized` Hatası

**Sebep:** Oturum süresi dolmuş veya geçersiz token.

**Çözüm:** Sayfayı yenileyip tekrar giriş yapın. Varsayılan giriş: `admin` / `admin123`.

---

## 10 · Güncelleme Talimatları

### 10.1 — Kaynak Koddan Güncelleme

```bash
cd KuranKokUzayi

# Son değişiklikleri çek
git pull origin main

# Sanal ortamı aktif et
.\venv\Scripts\Activate.ps1

# Bağımlılıkları güncelle
pip install -r DataEngine/requirements.txt --upgrade

# Uygulamayı yeniden başlat
python DataEngine/desktop_app.py
```

### 10.2 — EXE Güncelleme

1. Yeni sürümün ZIP dosyasını indirin
2. Mevcut `config.json` ve `notes/` klasörünü yedekleyin
3. Eski `SemantikGalaksi` klasörünü silin
4. Yeni ZIP'i aynı konuma çıkartın
5. Yedeklediğiniz `config.json` ve `notes/` klasörünü geri kopyalayın

⚠️ **Uyarı:** EXE güncellemesinde `config.json` ve `notes/` klasörünü yedeklemeyi unutmayın — aksi takdirde yapılandırmanız ve notlarınız kaybolur.

---

## 11 · Kaldırma Talimatları

### 11.1 — Kaynak Kod Kurulumu

```bash
# Sanal ortamı deaktif et
deactivate

# Proje dizinini sil
rm -rf KuranKokUzayi      # Linux/macOS
rmdir /s /q KuranKokUzayi  # Windows CMD
Remove-Item -Recurse -Force KuranKokUzayi  # PowerShell
```

### 11.2 — EXE Kurulumu

`SemantikGalaksi` klasörünü silin. Uygulama kayıt defterine (registry) herhangi bir giriş yapmaz.

💡 **İpucu:** Kullanıcı verilerini (notlar, API anahtarları) saklamak istiyorsanız silmeden önce `notes/` ve `webview_data/` klasörlerini yedekleyin.

---

## 📚 Ek Kaynaklar

- **CHANGELOG.md** — Sürüm geçmişi ve değişiklik detayları
- **FEATURES.md** — Tüm özelliklerin teknik dokümantasyonu
- **DataEngine/config.json** — Sunucu yapılandırma şablonu

---

> 🕋 *Bismillahirrahmanirrahim*
