#!/bin/bash
echo "[UPDATE] Memulai proses pembaruan..."

UPDATE_DIR="/tmp/examapp_update"
REPO_BRANCH="update"
GITHUB_URL="https://github.com/Faizaryasena09/ExamApp.git"
LOCAL_COMMIT_HASH_PATH="/app/backend/commit_hash.txt"

echo "[UPDATE] Membersihkan direktori sementara..."
rm -rf $UPDATE_DIR
mkdir -p $UPDATE_DIR
echo "[UPDATE] Direktori sementara dibuat di $UPDATE_DIR"

echo "[UPDATE] Meng-clone repo dari $GITHUB_URL (branch: $REPO_BRANCH)..."
git clone --quiet --branch ${REPO_BRANCH} --single-branch --depth 1 ${GITHUB_URL} $UPDATE_DIR
if [ $? -ne 0 ]; then
    echo "[UPDATE-ERROR] Gagal melakukan git clone. Membatalkan."
    exit 1
fi
echo "[UPDATE] Repositori berhasil di-clone."

cd $UPDATE_DIR
NEW_COMMIT_HASH=$(git rev-parse HEAD)
cd -

echo "[UPDATE] Menginstal dependensi backend..."
cd $UPDATE_DIR/backend && npm install --legacy-peer-deps || exit 1
echo "[UPDATE] Dependensi backend berhasil diinstal."

echo "[UPDATE] Menginstal dependensi frontend..."
cd $UPDATE_DIR/frontend && npm install --legacy-peer-deps || exit 1
echo "[UPDATE] Dependensi frontend berhasil diinstal."

echo "[UPDATE] Mem-build aplikasi frontend..."
npm run build || exit 1
echo "[UPDATE] Frontend berhasil di-build."

echo "[UPDATE] Menyalin file backend baru..."
rsync -a --delete $UPDATE_DIR/backend/ /app/backend/

echo "[UPDATE] Menyalin file frontend baru..."
rsync -a --delete $UPDATE_DIR/frontend/build/ /var/www/html/

echo $NEW_COMMIT_HASH > ${LOCAL_COMMIT_HASH_PATH}
echo "[UPDATE] Hash commit baru disimpan."

rm -rf $UPDATE_DIR
echo "[UPDATE] Direktori sementara dibersihkan."

echo "[UPDATE] Me-restart Apache..."
apachectl -k graceful || service apache2 restart

echo "[UPDATE] Me-restart PM2..."
pm2 restart all

echo "[UPDATE] Proses pembaruan selesai!"