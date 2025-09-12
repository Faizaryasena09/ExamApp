#!/bin/bash
echo "[UPDATE] Memulai proses pembaruan..."

UPDATE_DIR="/tmp/examapp_update"
REPO_BRANCH="update"
GITHUB_URL="https://github.com/Faizaryasena09/ExamApp.git"
LOCAL_COMMIT_HASH_PATH="/app/backend/commit_hash.txt"

# 1. Bersihkan & buat direktori sementara
echo "[UPDATE] Membersihkan direktori sementara..."
rm -rf $UPDATE_DIR
mkdir -p $UPDATE_DIR
echo "[UPDATE] Direktori sementara dibuat di $UPDATE_DIR"

# 2. Clone branch update
echo "[UPDATE] Meng-clone repo dari $GITHUB_URL (branch: $REPO_BRANCH)..."
git clone -v --branch ${REPO_BRANCH} --single-branch --depth 1 ${GITHUB_URL} $UPDATE_DIR
if [ $? -ne 0 ]; then
    echo "[UPDATE-ERROR] Gagal melakukan git clone. Membatalkan."
    exit 1
fi
echo "[UPDATE] Repositori berhasil di-clone."

cd $UPDATE_DIR
NEW_COMMIT_HASH=$(git rev-parse HEAD)
cd -

# 3. Install dependensi backend
echo "[UPDATE] Menginstal dependensi backend..."
cd $UPDATE_DIR/backend && npm install || exit 1
echo "[UPDATE] Dependensi backend berhasil diinstal."

# 4. Install & build frontend
echo "[UPDATE] Menginstal dependensi frontend..."
cd $UPDATE_DIR/frontend && npm install || exit 1
echo "[UPDATE] Dependensi frontend berhasil diinstal."

echo "[UPDATE] Mem-build aplikasi frontend..."
npm run build || exit 1
echo "[UPDATE] Frontend berhasil di-build."

# 5. Deploy backend
echo "[UPDATE] Menyalin file backend baru..."
rsync -a --delete $UPDATE_DIR/backend/ /app/backend/

# 6. Deploy frontend
echo "[UPDATE] Menyalin file frontend baru..."
rsync -a --delete $UPDATE_DIR/frontend/build/ /var/www/html/

# 7. Simpan hash commit baru
echo $NEW_COMMIT_HASH > ${LOCAL_COMMIT_HASH_PATH}
echo "[UPDATE] Hash commit baru disimpan."

# 8. Bersihkan direktori sementara
rm -rf $UPDATE_DIR
echo "[UPDATE] Direktori sementara dibersihkan."

# 9. Restart service
echo "[UPDATE] Me-restart Apache..."
apachectl -k graceful || service apache2 restart

echo "[UPDATE] Me-restart PM2..."
pm2 restart all

echo "[UPDATE] Proses pembaruan selesai!"
