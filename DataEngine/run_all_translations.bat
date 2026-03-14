@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ============================================
echo   Kok Cevirileri - Tum Diller (EN/RU/IT/ES)
echo   Batch: 75, Timeout: 300s
echo   Baslangic: %date% %time%
echo ============================================

echo.
echo [1/4] EN cevirisi basliyor...
python generate_root_translations.py ***REDACTED*** en
echo EN tamamlandi: %time%

echo.
echo [2/4] RU cevirisi basliyor...
python generate_root_translations.py ***REDACTED*** ru
echo RU tamamlandi: %time%

echo.
echo [3/4] IT cevirisi basliyor...
python generate_root_translations.py ***REDACTED*** it
echo IT tamamlandi: %time%

echo.
echo [4/4] ES cevirisi basliyor...
python generate_root_translations.py ***REDACTED*** es
echo ES tamamlandi: %time%

echo.
echo ============================================
echo   TAMAMLANDI! %date% %time%
echo ============================================
pause
