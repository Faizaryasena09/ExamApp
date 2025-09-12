const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Repo konfigurasi
const GITHUB_REPO = "Faizaryasena09/ExamApp";
const REPO_BRANCH = "update";
const GITHUB_URL = `https://github.com/${GITHUB_REPO}.git`;

// Lokasi file commit hash di server/container
const LOCAL_COMMIT_HASH_PATH = "/app/backend/commit_hash.txt";

exports.checkUpdate = async (req, res) => {
  // Ambil hash commit remote
  const getRemoteCommit = () => {
    return new Promise((resolve, reject) => {
      exec(`git ls-remote ${GITHUB_URL} ${REPO_BRANCH}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`[CHECK-UPDATE-ERR] ${stderr}`);
          return reject(new Error("Gagal mengambil info pembaruan dari GitHub."));
        }
        const remoteHash = stdout.split("\t")[0];
        resolve(remoteHash);
      });
    });
  };

  try {
    const remoteCommit = await getRemoteCommit();

    if (!remoteCommit) {
      return res.status(500).json({ message: "Tidak bisa mendapatkan commit dari remote." });
    }

    let localCommit = null;

    if (fs.existsSync(LOCAL_COMMIT_HASH_PATH)) {
      localCommit = fs.readFileSync(LOCAL_COMMIT_HASH_PATH, "utf8").trim();
    } else {
      // Kalau file belum ada → bikin direktori + file baru
      const dirPath = path.dirname(LOCAL_COMMIT_HASH_PATH);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[CHECK-UPDATE] Direktori ${dirPath} dibuat.`);
      }

      fs.writeFileSync(LOCAL_COMMIT_HASH_PATH, remoteCommit, "utf8");
      console.log(`[CHECK-UPDATE] File ${LOCAL_COMMIT_HASH_PATH} dibuat dengan commit ${remoteCommit}`);
      return res.json({
        updateAvailable: false,
        message: "File commit_hash.txt belum ada, sudah dibuat dan disamakan dengan versi terbaru.",
        localCommit: remoteCommit,
        remoteCommit,
      });
    }

    res.json({
      updateAvailable: remoteCommit !== localCommit,
      localCommit,
      remoteCommit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.installUpdate = async (req, res) => {
  res.status(202).json({
    message: "Proses pembaruan dimulai. Ini akan memakan waktu beberapa menit. Aplikasi akan restart setelah selesai.",
  });

  const updateScript = `
#!/bin/bash
echo "[UPDATE] Memulai proses pembaruan..."

UPDATE_DIR="/tmp/examapp_update"

# 1. Bersihkan & buat direktori sementara
rm -rf $UPDATE_DIR
mkdir -p $UPDATE_DIR
echo "[UPDATE] Direktori sementara dibuat di $UPDATE_DIR"

# 2. Clone branch update
git clone --branch ${REPO_BRANCH} --single-branch --depth 1 ${GITHUB_URL} $UPDATE_DIR
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
echo "[UPDATE] Me-restart PM2..."
pm2 restart all

echo "[UPDATE] Me-restart Apache..."
apachectl -k graceful || service apache2 restart

echo "[UPDATE] Proses pembaruan selesai!"
`;

  const child = exec(updateScript, (error, stdout, stderr) => {
    if (error) {
      console.error(`[UPDATE-ERROR] ${error.message}`);
      console.error(`[UPDATE-STDERR] ${stderr}`);
      return;
    }
    console.log(`[UPDATE-STDOUT] ${stdout}`);
  });

  child.stdout.on("data", (data) => {
    console.log(`[UPDATE-LOG] ${data.toString()}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`[UPDATE-LOG-ERR] ${data.toString()}`);
  });
};
