@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   SemantikGalaksi - EXE Build Script
echo ============================================
echo   Dizin: %cd%
echo ============================================
echo.
echo [*] EXE olusturuluyor...
pyinstaller SemantikGalaksi.spec --noconfirm
if errorlevel 1 (
    echo [X] Build basarisiz!
    pause
    exit /b 1
)
if not exist "dist\SemantikGalaksi\config.json" (
    copy "DataEngine\config.json" "dist\SemantikGalaksi\config.json"
)
echo.
echo ============================================
echo   Build basarili!
echo   Cikti: dist\SemantikGalaksi\SemantikGalaksi.exe
echo ============================================
pause
