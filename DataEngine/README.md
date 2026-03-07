# DataEngine — Kur'an Veri Pipeline

Kur'an ayetlerini API'den çeker, Gemini AI ile Arapça kök analizi yapar ve frontend için JSON dosyaları üretir.

## Pipeline Akışı

```
ADIM 1 (Fetch)       →  quran_raw.json     (6236 ayet: Arapça + Türkçe)
ADIM 2 (Roots/AI)    →  quran_data.json    (ayet + sülasi kökler)
ADIM 3 (Dict/AI)     →  quran_roots.json   (kök sözlüğü: anlam + türemiş)
```

## Dosya Yapısı

| Dosya | Açıklama |
|-------|----------|
| `run_pipeline.py` | Orkestratör — 3 adımı sırayla çalıştırır |
| `step1_fetch_quran.py` | Quran API'den Arapça + Türkçe veri çeker |
| `step2_extract_roots.py` | Gemini ile kök ayıklama |
| `step3_build_root_dict.py` | Gemini ile kök sözlüğü oluşturma |
| `gemini_client.py` | Ortak Gemini API istemcisi (paylaşımlı) |

## Kurulum

```bash
cd DataEngine
pip install -r requirements.txt
```

`.env` dosyası:
```
API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

## Kullanım

```bash
python run_pipeline.py              # Tüm adımlar
python run_pipeline.py --from 2     # 2. adımdan başla
python run_pipeline.py --only 1     # Sadece 1. adım
```

## Resume Desteği

Adım 2-3 kesintiye dayanıklıdır (progress dosyaları ile kaldığı yerden devam eder).

## Frontend'e Kopyalama

```bash
cp quran_data.json ../Frontend/
cp quran_roots.json ../Frontend/
```
