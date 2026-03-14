# Copilot Direktifi — SemantikGalaksi

**Öncelik:** Güvenlik > Mimari bütünlük > Stabilite > Performans

## Temel Kurallar
- Sadece istenen bloğu değiştir; tüm dosyayı yeniden yazma.
- Public API / method imzalarını açık talimat olmadan değiştirme.
- Talep dışı refactor yapma.
- Belirsizlikte işlemi başlatma, soru sor.
- Büyük değişiklikleri parçala, her adımda onay iste.
- **Kod Çelişmezlik İlkesi:** Bir yapının (modül, fonksiyon, stil, olay dinleyici) kodları, diğer yapıların kodlarıyla **çelişmemeli**. Değişiklik yapmadan önce etkilenen tüm dosyaları tara — aynı DOM elemanını, global değişkeni veya event'i kullanan diğer kodları bul ve uyumluluğu doğrula. Bir yerde yapılan değişiklik başka bir yerdeki mantığı bozuyorsa, her iki tarafı da güncelle.

## Mimari
- Mevcut mimariyi koru: Frontend (vanilla JS, Three.js, GLSL), Backend (Python, pywebview).
- Katman ihlali yasak. Yeni pattern eklemeden önce gerekçe sun.
- Script yükleme sırası (`index.html`): `flags.js` → `i18n.js` → `state.js` → diğerleri. Bu sırayı bozma.

### Çalışma Modları (3 Katman)
Uygulama üç farklı modda çalışır — her mod farklı kısıtlara sahiptir:

| Mod | Açıklama | Python Bridge | localStorage | .env erişimi |
|-----|----------|--------------|-------------|-------------|
| **Server** | `desktop_app.py` HTTP sunucu + pywebview pencere (varsayılan) | ✅ `window.pywebview.api.*` | ✅ | ✅ (Python okur) |
| **Client (Terminal)** | pywebview uzak sunucuya bağlanır (`server_ip:server_port`) | ✅ `window.pywebview.api.*` | ✅ | ✅ (Python okur) |
| **Web** | Sadece tarayıcı — Python backend yok | ❌ | ✅ | ❌ |

**Kritik Kurallar:**
- `window.pywebview` erişimi **her zaman** `if(window.pywebview)` koruması ile yapılmalı.
- **Web modunda** API key yönetimi yalnızca `KeyManager` (localStorage) üzerinden çalışır — `.env` dosyasına erişim yoktur.
- **Desktop modlarda** (Server/Client) `.env`'deki `API_KEY` otomatik olarak hem `.api_keys` dosyasına hem JS `KeyManager`'a senkronize edilir (`_sync_env_key_to_stores`).
- Yeni bir Python bridge metodu eklendiğinde, web modunda fallback davranışı da tanımlanmalı.

### Güvenlik — API Anahtarları
- **`.env` dosyası git'e ASLA commit edilmez** (`.gitignore`'da tanımlı).
- `.api_keys` dosyası Base64 encode ile `webview_data/` altında saklanır (`.gitignore`'da).
- Kod içinde hardcoded API key yasak. Placeholder kullan: `BURAYA_API_ANAHTARINIZI_YAZIN`.
- `run_all_translations.bat` ve Python scriptleri `.env`'den `API_KEY` okur.
- Yeni dosya oluştururken veya commit öncesi `AIzaSy` pattern'i ile tarama yap.

## Kodlama Standartları
- Magic number yasak; sabit veya enum kullan.
- Exception yutma; handle et veya rethrow et.
- Log'larda şifre/token/PII maskele.
- Python scriptlerinde **emoji kullanma** — Windows cp1254 console redirect'te crash yapar. ASCII eşdeğer kullan.

## i18n (Çoklu Dil) Kuralları — ÖNEMLİ

### UI Metinleri
- **Hiçbir JS dosyasında hardcoded Türkçe string KOYMA.** Her kullanıcıya görünen metin `t('key.name')` ile çağrılmalı.
- Yeni metin eklediğinde:
  1. `i18n.js` gömülü TR objesine Türkçe key ekle
  2. Tüm locale JSON dosyalarına (`Frontend/locales/*.json`) karşılık gelen çevirilerini ekle
  3. Kodda `t('yeni.key')` kullan
- Locale dosya sayısı dinamik — sadece mevcut olanları güncelle, yeni ülke dosyası oluşturma (kullanıcı ekler).

### Locale Dosya Standartları
- **Format:** `{DİL}-{bölge}.json` — Örnek: `TR-tr`, `EN-en`, `DE-de`, `FR-fr`, `AR-sa`, `JA-jp`
- **Konum:** `Frontend/locales/`
- **Yapı:** Düz JSON, `meta` objesi + çeviri key'leri. Meta zorunlu alanlar:
  ```json
  {
    "meta": {
      "code": "DE-de",
      "name": "German",
      "nativeName": "Deutsch",
      "flag": "🇩🇪",
      "direction": "ltr",
      "besmeleAudio": "besmele_de.wav"
    }
  }
  ```
- Sistem `locales/` klasöründeki JSON dosyalarını otomatik keşfeder (auto-discover). Yeni dosya bırakılırsa dropdown'a eklenir.

### Bayrak Sistemi
- Tüm ülke bayrakları `Frontend/js/flags.js` dosyasında SVG olarak tanımlı (~42 ülke).
- `CountryFlags.get('XX-xx')` → inline SVG döndürür. Bilinmeyen kodlar için otomatik renkli placeholder üretir.
- Yeni dil eklendiğinde bayrak `flags.js`'e SVG olarak eklenmeli.
- `i18n.js` doğrudan `CountryFlags.get()` kullanır — bayrak verisi **asla** i18n.js'e yazılmaz.

### Kök Anlamları Çevirisi
- Her dil için `Frontend/locales/roots_{lang}.json` dosyası gerekir (ör: `roots_en.json`).
- Çeviri scripti: `DataEngine/generate_root_translations.py <API_KEY> <lang_code>`
- Batch boyutu 50 kök/çağrı, Gemini API, retry 3x, rate limit backoff.

### Besmele Sesleri
- Her dil için `Frontend/locales/besmele_{lang}.wav` dosyası (ör: `besmele_en.wav`).
- TTS scripti: `DataEngine/generate_besmele_i18n.py <API_KEY> [lang_code]`

### Bayrak SDF Shader
- Gezegen kaplamalarında dil bazlı bayrak gösterimi.
- `shaders.js`: `getFlag(viewNorm, flagType)` dispatcher — flagType int uniform.
- `data-loader.js`: `_getLangFlagType()` → 0-4 map, `uFlagType` uniform.
- **Fatiha (Sure 1) DAİMA flagType=0 (Türk bayrağı)** — dil değişse bile.
- Yeni dil = yeni SDF fonksiyonu gerekir → `shaders.js`'e ekle + `getFlag()` dispatcher'ı güncelle + `_getLangFlagType()` map'ini güncelle.

### Locale Editor
- JSON editörde dil dosyaları düzenlenebilir (datasets.js).
- CRUD API: `GET/POST /api/locale/{name}` (desktop_app.py).

### Yeni Dil Ekleme Kontrol Listesi
Yeni bir dil eklendiğinde sırasıyla yapılması gerekenler:
1. `Frontend/locales/{LANG}-{bölge}.json` — locale dosyası (meta + tüm çeviri key'leri)
2. `Frontend/locales/roots_{lang}.json` — kök anlamları çevirisi (generate_root_translations.py)
3. `Frontend/locales/besmele_{lang}.wav` — besmele TTS sesi (generate_besmele_i18n.py)
4. `Frontend/js/flags.js` — ülke bayrağı SVG (CountryFlags map'ine ekle)
5. `Frontend/js/shaders.js` — bayrak SDF fonksiyonu + getFlag() dispatcher güncelle
6. `Frontend/js/data-loader.js` — `_langFlagMap` + `_getLangFlagType()` güncelle
7. Tüm mevcut JS'lerdeki yeni t() key'lerinin locale dosyalarında karşılığı var mı kontrol et

## Otodökümantasyon (otomatik — hatırlatma bekleme)
Her değişiklik sonrası:
- **VERSION:** Proje kök dizinindeki `VERSION` dosyası tek kaynak (single source of truth). Her sürüm değişikliğinde bu dosyayı güncelle. `setup.py`, `build_msi.bat` ve `index.html` bu dosyadan okur.
- **Frontend/js/state.js:** `APP_VERSION` değişkenini `VERSION` dosyasıyla aynı değere güncelle.
- **CHANGELOG.md:** `[vX.Y.Z] — YYYY-MM-DD — [Özet] — [Etkilenen dosya]`
- **FEATURES.md:** Yeni yetenek veya mantık değişikliğinde güncelle.
- **INSTALL.md:** NuGet / config / env değişikliğinde senkronize et.
- **README.md:** Her değişiklik veya güncelleme sonrası README.md'yi kontrol et ve güncelle:
  - Sürüm badge'ini güncel tut (`Sürüm-X.Y.Z`).
  - Yeni özellik eklendiğinde "Öne Çıkan Özellikler" bölümüne ekle.
  - Mimari değişiklikte "Mimari" diyagramını ve "Proje Yapısı" ağacını güncelle.
  - Teknik değişiklikte "Teknik Detaylar" ve "Teknoloji Yığını" bölümlerini güncelle.
  - Sürüm tablosuna yeni sürümü ekle.
  - Bug fix veya iyileştirme varsa "Son Düzeltmeler ve İyileştirmeler" tablosunu güncelle.
- Semantic versioning: breaking=MAJOR, yeni özellik=MINOR, düzeltme=PATCH.

## Git İşlemleri
- Her değişiklik tamamlandıktan sonra otomatik olarak `git add -A`, `git commit -m "mesaj"`, `git push origin master` çalıştır.
- Kullanıcıdan onay bekleme, doğrudan push yap.
- Her versiyon güncellemesinde `git tag -a vX.Y.Z -m "açıklama"` oluştur ve `git push origin vX.Y.Z` ile push'la.

## MSI Derleme Politikası
- PATCH sürümleri (X.Y.1 – X.Y.4) için **MSI build yapma**, sadece git push yap.
- PATCH 5'e ulaşıldığında (X.Y.5): MINOR sürümü artır (X.Y+1.0), MSI build (`build_msi.bat`) çalıştır, release oluştur.
- Yani her 5 patch'te bir release derlemesi gerçekleşir.
- Kullanıcı **"release derle"** dediğinde patch sayısına bakılmaksızın: MINOR sürümü artır, MSI build çalıştır, git tag + push yap, release oluştur.
- Build başarısız olursa push yapma, hatayı düzelt.

## Yanıt Formatı
1. Değişiklik özeti (1-2 cümle)
2. Sadece değişen kod bloğu
3. Dokümantasyon güncellemeleri
4. Onay noktası
