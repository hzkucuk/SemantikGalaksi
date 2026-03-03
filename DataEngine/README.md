# DataEngine — Kur'an Veri Pipeline

Kur'an ayetlerini API'den çeker, Gemini AI ile kök analizi yapar ve kök sözlüğü oluşturur.

## Mimari

```
┌──────────────────────┐
│  ADIM 1 — Fetch      │  Quran API → quran_raw.json
│  step1_fetch_quran   │  6236 ayet (Arapça Uthmani + Türkçe Diyanet)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  ADIM 2 — Roots      │  quran_raw.json → quran_data.json
│  step2_extract_roots │  Her ayetin sülasi (üç harfli) kökleri
│  (Gemini AI)         │  Resume + batch + backoff
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  ADIM 3 — Dict       │  quran_data.json → quran_roots.json
│  step3_build_root    │  Kök sözlüğü: anlam + türemiş kelimeler
│  (Gemini AI)         │  Resume + batch + backoff
└──────────────────────┘
```

## Dosya Yapısı

| Dosya | Açıklama |
|-------|----------|
| `run_pipeline.py` | Orkestratör — 3 adımı sırayla çalıştırır |
| `step1_fetch_quran.py` | Quran API'den veri çekici |
| `step2_extract_roots.py` | Gemini ile kök ayıklayıcı |
| `step3_build_root_dict.py` | Gemini ile kök sözlüğü oluşturucu |
| `gemini_client.py` | Ortak Gemini API istemcisi |
| `.env` | API anahtarı ve model ayarları |
| `requirements.txt` | Python bağımlılıkları |

## Kurulum

```bash
cd DataEngine
pip install -r requirements.txt
```

`.env` dosyasını oluştur:
```
API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
```

## Kullanım

### Tüm pipeline
```bash
python run_pipeline.py
```

### Belirli adımdan başla (resume)
```bash
python run_pipeline.py --from 2    # 2. adımdan başla
```

### Sadece tek adım
```bash
python run_pipeline.py --only 1    # Sadece API fetch
```

### Adımları ayrı çalıştır
```bash
python step1_fetch_quran.py
python step2_extract_roots.py
python step3_build_root_dict.py
```

## Çıktı Dosyaları

| Dosya | İçerik |
|-------|--------|
| `quran_raw.json` | Ham ayet verisi (Arapça + Türkçe) |
| `quran_data.json` | Ayetler + kök bilgileri |
| `quran_roots.json` | Kök sözlüğü (anlam, türemiş kelimeler) |

### quran_roots.json Şeması

```json
{
  "رحم": {
    "meaning": "merhamet, şefkat",
    "meaning_ar": "الرأفة والعطف",
    "pronunciation": "r-ḥ-m",
    "derived": [
      { "word": "الرَّحْمَٰنِ", "meaning": "Rahman (çok merhametli)" },
      { "word": "رَحْمَة", "meaning": "rahmet" }
    ],
    "ayahs": ["1:1", "1:3"],
    "count": 339
  }
}
```

## Resume Desteği

Adım 2 ve 3, kesintide kaldığı yerden devam eder:
- `progress_step2.json` — Kök ayıklama ilerlemesi
- `progress_step3.json` — Sözlük oluşturma ilerlemesi

İşlem tamamlandığında bu dosyalar güvenle silinebilir.

## Frontend'e Aktarma

Pipeline tamamlandıktan sonra:
```bash
cp quran_data.json ../Frontend/
cp quran_roots.json ../Frontend/
```
