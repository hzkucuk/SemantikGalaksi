"""
Kur'an Veri Pipeline — Orkestratör
══════════════════════════════════
3 adımı sırayla çalıştırır ve toplam süreyi raporlar.

    ┌──────────────────┐
    │  ADIM 1 — Fetch  │  Quran API → quran_raw.json
    │  (step1)         │  6236 ayet (Arapça + Türkçe)
    └────────┬─────────┘
             ▼
    ┌──────────────────┐
    │  ADIM 2 — Roots  │  quran_raw.json → quran_data.json
    │  (step2, Gemini) │  Her ayetin sülasi kökleri
    └────────┬─────────┘
             ▼
    ┌──────────────────┐
    │  ADIM 3 — Dict   │  quran_data.json → quran_roots.json
    │  (step3, Gemini) │  Kök sözlüğü (anlam + türemiş kelimeler)
    └──────────────────┘

Kullanım:
    python run_pipeline.py              # Tüm adımlar
    python run_pipeline.py --from 2     # 2. adımdan başla
    python run_pipeline.py --only 1     # Sadece 1. adım

Gereksinimler:
    pip install -r requirements.txt
    .env dosyasında API_KEY tanımlı olmalı (adım 2 ve 3 için)
"""

import sys
import time
import argparse


def run_step(step_num, module_name, run_func, is_async=False):
    """Tek bir adımı çalıştırır ve süresini ölçer."""
    print(f"\n{'▓' * 60}")
    print(f"  ▶ ADIM {step_num} başlatılıyor...")
    print(f"{'▓' * 60}\n")

    start = time.time()
    try:
        if is_async:
            import asyncio
            import os
            if os.name == "nt":
                asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            asyncio.run(run_func())
        else:
            run_func()

        elapsed = time.time() - start
        print(f"\n  ⏱ Adım {step_num} tamamlandı: {format_duration(elapsed)}")
        return True
    except SystemExit as e:
        if e.code and e.code != 0:
            print(f"\n  ✗ Adım {step_num} başarısız!")
            return False
        return True
    except Exception as e:
        print(f"\n  ✗ Adım {step_num} hatası: {e}")
        return False


def format_duration(seconds):
    """Saniyeyi okunabilir formata çevirir."""
    if seconds < 60:
        return f"{seconds:.1f}sn"
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    if minutes < 60:
        return f"{minutes}dk {secs}sn"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}sa {mins}dk {secs}sn"


def main():
    parser = argparse.ArgumentParser(description="Kur'an Veri Pipeline")
    parser.add_argument("--from", dest="from_step", type=int, default=1,
                        help="Başlangıç adımı (1-3)")
    parser.add_argument("--only", type=int, default=None,
                        help="Sadece belirtilen adımı çalıştır (1-3)")
    args = parser.parse_args()

    print("╔" + "═" * 58 + "╗")
    print("║     KUR'AN VERİ PİPELINE — SemantikGalaksi            ║")
    print("╚" + "═" * 58 + "╝")

    # ── Adımları belirle ──
    if args.only:
        steps_to_run = [args.only]
    else:
        steps_to_run = [s for s in [1, 2, 3] if s >= args.from_step]

    if not steps_to_run:
        print("Geçersiz adım numarası!")
        sys.exit(1)

    total_start = time.time()
    results = {}

    # ── Adım 1: Quran API ──
    if 1 in steps_to_run:
        from step1_fetch_quran import fetch_quran
        results[1] = run_step(1, "step1_fetch_quran", fetch_quran, is_async=False)
        if not results[1]:
            print("\n✗ Pipeline durdu.")
            sys.exit(1)

    # ── Adım 2: Kök Ayıklama ──
    if 2 in steps_to_run:
        from step2_extract_roots import run as step2_run
        results[2] = run_step(2, "step2_extract_roots", step2_run, is_async=True)
        if not results[2]:
            print("\n✗ Pipeline durdu.")
            sys.exit(1)

    # ── Adım 3: Kök Sözlüğü ──
    if 3 in steps_to_run:
        from step3_build_root_dict import run as step3_run
        results[3] = run_step(3, "step3_build_root_dict", step3_run, is_async=True)
        if not results[3]:
            print("\n✗ Pipeline durdu.")
            sys.exit(1)

    # ── Sonuç Raporu ──
    total_elapsed = time.time() - total_start
    print(f"\n\n{'═' * 60}")
    print(f"  ✓ Pipeline tamamlandı!")
    print(f"  ⏱ Toplam süre: {format_duration(total_elapsed)}")
    for step, ok in results.items():
        status = "✓" if ok else "✗"
        print(f"    {status} Adım {step}")
    print(f"{'═' * 60}")

    if 3 in results and results[3]:
        print(f"\n  Frontend'e kopyala:")
        print(f"    cp quran_data.json ../Frontend/")
        print(f"    cp quran_roots.json ../Frontend/")


if __name__ == "__main__":
    main()
