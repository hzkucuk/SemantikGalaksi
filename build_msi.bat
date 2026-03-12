@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM ── Versiyon oku (tek kaynak: VERSION dosyası) ──────────────
set /p APP_VER=<VERSION

echo ╔══════════════════════════════════════════════════════════╗
echo ║     SemantikGalaksi — MSI Installer Build Script        ║
echo ║     Sürüm: %APP_VER%                                       ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo   Dizin: %cd%
echo.

REM ── 1. Python kontrolü ─────────────────────────────────────
echo [1/5] Python kontrol ediliyor...
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
echo [2/5] cx_Freeze kontrol ediliyor...
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
echo [3/5] Proje bagimliliklari kontrol ediliyor...
pip install -r DataEngine\requirements.txt --quiet
if errorlevel 1 (
    echo [X] Bagimliliklar kurulamadi!
    pause
    exit /b 1
)
echo       Tum bagimliliklar hazir.
echo.

REM ── 4. state.js versiyonunu senkronize et ───────────────────
echo [4/6] Frontend versiyonu senkronize ediliyor...
python -c "import re,pathlib;v=pathlib.Path('VERSION').read_text().strip();p=pathlib.Path('Frontend/js/state.js');t=p.read_text(encoding='utf-8');p.write_text(re.sub(r\"APP_VERSION\s*=\s*'[^']*'\",\"APP_VERSION = '\"+v+\"'\",t),encoding='utf-8');print('       APP_VERSION =',v)"
echo.

REM ── 5-6. Her iki MSI'yi olustur (Server + Client) ──────────
if exist "dist\*.msi" del /q "dist\*.msi"

echo [5/6] SERVER MSI olusturuluyor (tum dosyalar dahil)...
if exist "build" rmdir /s /q "build"
set SG_BUILD_MODE=server
python setup.py bdist_msi
if errorlevel 1 (
    echo [X] Server MSI build BASARISIZ!
    pause
    exit /b 1
)
for /f "delims=" %%f in ('dir /b /s dist\*.msi 2^>nul') do (
    move "%%f" "dist\SemantikGalaksi-%APP_VER%-server-win64.msi" >nul 2>&1
)
echo       Server MSI tamam.
echo.

echo [6/6] CLIENT MSI olusturuluyor (JSON veriler haric)...
if exist "build" rmdir /s /q "build"
set SG_BUILD_MODE=client
python setup.py bdist_msi
if errorlevel 1 (
    echo [X] Client MSI build BASARISIZ!
    pause
    exit /b 1
)
for /f "delims=" %%f in ('dir /b /s dist\*.msi 2^>nul ^| findstr /v server') do (
    move "%%f" "dist\SemantikGalaksi-%APP_VER%-client-win64.msi" >nul 2>&1
)
echo       Client MSI tamam.
echo.

echo ╔══════════════════════════════════════════════════════════╗
echo ║  [✓] MSI Build BASARILI! (2 paket)                      ║
echo ╠══════════════════════════════════════════════════════════╣
for %%f in (dist\*.msi) do (
    echo ║  %%f  (%%~zf bytes^)
)

echo ║                                                          ║
echo ║  Kurulum:                                                ║
echo ║    1. dist\ klasorundan .msi dosyasini calistirin        ║
echo ║    2. Kurulum sihirbazini takip edin                     ║
echo ║    3. Masaustu ve Baslat Menusu kisayollari olusturulur  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause
