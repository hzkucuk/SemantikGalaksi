@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ╔══════════════════════════════════════════════════════════╗
echo ║     SemantikGalaksi — MSI Installer Build Script        ║
echo ║     Sürüm: 0.30.1                                      ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo   Dizin: %cd%
echo.

REM ── 1. Python kontrolü ─────────────────────────────────────
echo [1/4] Python kontrol ediliyor...
python --version >nul 2>&1
if errorlevel 1 (
    echo [X] Python bulunamadi! Python 3.10+ gereklidir.
    echo     https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do echo       Python %%v bulundu.
echo.

REM ── 2. cx_Freeze kontrolü ve kurulumu ──────────────────────
echo [2/4] cx_Freeze kontrol ediliyor...
python -c "import cx_Freeze" >nul 2>&1
if errorlevel 1 (
    echo       cx_Freeze bulunamadi, kuruluyor...
    pip install cx_Freeze --quiet
    if errorlevel 1 (
        echo [X] cx_Freeze kurulamadi!
        pause
        exit /b 1
    )
    echo       cx_Freeze basariyla kuruldu.
) else (
    echo       cx_Freeze mevcut.
)
echo.

REM ── 3. Proje bağımlılıklarını kontrol et ───────────────────
echo [3/4] Proje bagimliliklari kontrol ediliyor...
pip install -r DataEngine\requirements.txt --quiet
if errorlevel 1 (
    echo [X] Bagimliliklar kurulamadi!
    pause
    exit /b 1
)
echo       Tum bagimliliklar hazir.
echo.

REM ── 4. MSI oluştur ─────────────────────────────────────────
echo [4/4] MSI paketi olusturuluyor...
echo       Bu islem birkac dakika surebilir...
echo.

REM Önceki build çıktılarını temizle
if exist "build" rmdir /s /q "build"
if exist "dist\*.msi" del /q "dist\*.msi"

python setup.py bdist_msi
if errorlevel 1 (
    echo.
    echo ╔══════════════════════════════════════════════════════════╗
    echo ║  [X] MSI build BASARISIZ!                               ║
    echo ║  Hata detaylari icin yukardaki ciktiyi inceleyin.       ║
    echo ╚══════════════════════════════════════════════════════════╝
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  [✓] MSI Build BASARILI!                                ║
echo ╠══════════════════════════════════════════════════════════╣

REM MSI dosyasını bul ve göster
for /f "delims=" %%f in ('dir /b /s dist\*.msi 2^>nul') do (
    echo ║  Cikti: %%f
    for %%s in ("%%f") do echo ║  Boyut: %%~zs bytes
)

echo ║                                                          ║
echo ║  Kurulum:                                                ║
echo ║    1. dist\ klasorundan .msi dosyasini calistirin        ║
echo ║    2. Kurulum sihirbazini takip edin                     ║
echo ║    3. Masaustu ve Baslat Menusu kisayollari olusturulur  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause
