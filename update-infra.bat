@echo off
setlocal enabledelayedexpansion

REM --- Konfigurasi ---
set DOCKER_IMAGE_NAME=exam-app
set DOCKER_CONTAINER_NAME=exam-app-container
set ENV_FILE=backend\.env

REM --- 1. Baca Port dari .env file ---
echo [INFO] Membaca port dari %ENV_FILE%...
for /f "tokens=1,* delims==" %%%a in ('findstr /R "^WEB_PORT=" "%ENV_FILE%"') do (
    set WEB_PORT=%%%b
)

if not defined WEB_PORT (
    echo [ERROR] Gagal menemukan WEB_PORT di %ENV_FILE%.
    exit /b 1
)
echo [INFO] Port yang akan digunakan: %WEB_PORT%

REM --- 2. Hentikan dan Hapus Container Docker yang Ada ---
echo [INFO] Menghentikan container lama...
docker stop %DOCKER_CONTAINER_NAME% >nul 2>&1
echo [INFO] Menghapus container lama...
docker rm %DOCKER_CONTAINER_NAME% >nul 2>&1

REM --- 3. Bangun Ulang Docker Image ---
echo [INFO] Membangun ulang Docker image: %DOCKER_IMAGE_NAME%...
docker build -t %DOCKER_IMAGE_NAME% . 
if %errorlevel% neq 0 (
    echo [ERROR] Gagal membangun Docker image.
    exit /b 1
)

REM --- 4. Jalankan Container Baru ---
echo [INFO] Menjalankan container baru di port %WEB_PORT%...
docker run -d --name %DOCKER_CONTAINER_NAME% -p %WEB_PORT%:%WEB_PORT% --env-file .\backend\.env %DOCKER_IMAGE_NAME%
if %errorlevel% neq 0 (
    echo [ERROR] Gagal menjalankan container Docker baru.
    exit /b 1
)

echo [SUCCESS] Container Docker berhasil dijalankan.

REM --- 5. Restart Apache (Placeholder) ---
echo.
echo [ACTION REQUIRED] Silakan restart service Apache secara manual.
REM Ganti baris di bawah ini dengan path ke httpd.exe Anda
"D:\RushlessServer\apache\bin\httpd.exe" -k restart

echo.
echo [SUCCESS] Proses pembaruan infrastruktur selesai.
