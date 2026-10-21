@echo off
title DENIZ 9. SINIF MATEMATIK VE TEST TAKIP SISTEMI
chcp 65001 >nul
cls
echo =========================================================================
echo    🎓 DENIZ 9. SINIF MATEMATIK & DENEME SINAVI TAKIP PLATFORMU
echo =========================================================================
echo.
echo  [+] Web sunucusu baslatiliyor (Port 8080)...
echo  [+] Deniz'in uygulamasi tarayicinizda aciliyor...
echo.
echo  Uygulama Adresi: http://localhost:8080
echo.
echo  Pencereyi kapatmadiginiz surece yerel sunucu calismaya devam eder.
echo =========================================================================
echo.

start http://localhost:8080
python -m http.server 8080

pause
