# DataEngine — Kur'an Veri Pipeline

Kur'an ayetlerini API'den çeker, Gemini AI ile Arapça kök analizi yapar ve frontend için JSON dosyalarý üretir.

## Pipeline Akýþý

```
ADIM 1 (Fetch)       ?  quran_raw.json     (6236 ayet: Arapça + Türkçe)
ADIM 2 (Roots/AI)    ?  quran_data.json    (ayet + sülasi kökler)
ADIM 3 (Dict/AI)     ?  quran_roots.json   (kök sözlüðü: anlam + türemiþ)
```

## Dosya Yapýsý

| Dosya | Açýklama |
|-------|----------|
| `run_pipeline.py` | Orkestratör — 3 adýmý sýrayla çalýþtýrýr |
| `step1_fetch_quran.py` | Quran API'den Arapça + Türkçe veri çeker |
| `step2_extract_roots.py` | Gemini ile kök ayýklama |
| `step3_build_root_dict.py` | Gemini ile kök sözlüðü oluþturma |
| `gemini_client.py` | Ortak Gemini API istemcisi (paylaþýmlý) |

## Kurulum

```bash
cd DataEngine
pip install -r requirements.txt
```

`.env` dosyasý:
```
API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

## Kullaným

```bash
python run_pipeline.py              # Tüm adýmlar
python run_pipeline.py --from 2     # 2. adýmdan baþla
python run_pipeline.py --only 1     # Sadece 1. adým
```

## Resume Desteði

Adým 2-3 kesintiye dayanýklýdýr (progress dosyalarý ile kaldýðý yerden devam eder).

## Frontend'e Kopyalama

```bash
cp quran_data.json ../Frontend/
cp quran_roots.json ../Frontend/
```
