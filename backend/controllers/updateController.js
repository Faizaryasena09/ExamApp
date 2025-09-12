const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Ambil PAT dari environment variable
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = "Faizaryasena09/ExamApp";
const GITHUB_URL_WITH_PAT = `https://oauth2:${GITHUB_PAT}@github.com/${GITHUB_REPO}.git`;
const REPO_BRANCH = "update";

const LOCAL_COMMIT_HASH_PATH = "/app/backend/commit_hash.txt";

exports.checkUpdate = async (req, res) => {
  const getRemoteCommit = () => {
    return new Promise((resolve, reject) => {
      exec(`git ls-remote ${GITHUB_URL_WITH_PAT} ${REPO_BRANCH}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error fetching remote commit: ${stderr}`);
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
  res.status(202).json({ message: "Proses pembaruan dimulai. Ini akan memakan waktu beberapa menit. Aplikasi akan restart setelah selesai." });

  const updateScript = `
    #!/bin/bash
    echo "[UPDATE] Memulai proses pembaruan..."
    
    # Direktori sementara
    UPDATE_DIR="/tmp/examapp_update"
    
    # 1. Bersihkan dan buat direktori sementara
    rm -rf $UPDATE_DIR
    mkdir -p $UPDATE_DIR
    echo "[UPDATE] Direktori sementara dibuat di $UPDATE_DIR"
    
    # 2. Clone branch 'update' dari repo
    git clone --branch ${REPO_BRANCH} --single-branch ${GITHUB_URL_WITH_PAT} $UPDATE_DIR
    if [ $? -ne 0 ]; then
        echo "[UPDATE-ERROR] Gagal melakukan git clone. Membatalkan."
        exit 1
    fi
    echo "[UPDATE] Repositori berhasil di-clone."
    
    # Simpan hash commit baru
    cd $UPDATE_DIR
    NEW_COMMIT_HASH=$(git rev-parse HEAD)
    cd - # Kembali ke direktori sebelumnya

    # 3. Install dependensi backend
    echo "[UPDATE] Menginstal dependensi backend..."
    cd $UPDATE_DIR/backend && npm install
    if [ $? -ne 0 ]; then
        echo "[UPDATE-ERROR] Gagal menjalankan npm install di backend."
        exit 1
    fi
    echo "[UPDATE] Dependensi backend berhasil diinstal."
    
    # 4. Install dan build frontend
    echo "[UPDATE] Menginstal dependensi frontend..."
    cd $UPDATE_DIR/frontend && npm install
    if [ $? -ne 0 ]; then
        echo "[UPDATE-ERROR] Gagal menjalankan npm install di frontend."
        exit 1
    fi
    echo "[UPDATE] Dependensi frontend berhasil diinstal."
    
    echo "[UPDATE] Mem-build aplikasi frontend..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "[UPDATE-ERROR] Gagal mem-build frontend."
        exit 1
    fi
    echo "[UPDATE] Frontend berhasil di-build."

    # 5. Pindahkan file backend baru (override)
    echo "[UPDATE] Menyalin file backend baru..."
    rsync -a --delete $UPDATE_DIR/backend/ /app/backend/

    # 6. Pindahkan file frontend build baru (override)
    echo "[UPDATE] Menyalin file frontend baru..."
    rsync -a --delete $UPDATE_DIR/frontend/build/ /var/www/html/

    # 7. Simpan hash commit baru ke file
    echo $NEW_COMMIT_HASH > ${LOCAL_COMMIT_HASH_PATH}
    echo "[UPDATE] Hash commit baru disimpan."

    # 8. Restart services
    echo "[UPDATE] Me-restart PM2..."
    pm2 restart all
    
    echo "[UPDATE] Me-restart Apache..."
    apachectl -k graceful || service apache2 restart

    # 9. Bersihkan direktori sementara
    rm -rf $UPDATE_DIR
    
    echo "[UPDATE] Proses pembaruan selesai!"
  `;

  // Jalankan skrip di background
  const child = exec(updateScript, (error, stdout, stderr) => {
    if (error) {
      console.error(`[UPDATE-ERROR] Gagal menjalankan skrip pembaruan: ${error.message}`);
      console.error(`[UPDATE-STDERR] ${stderr}`);
      return;
    }
    console.log(`[UPDATE-STDOUT] ${stdout}`);
  });

  // Log output secara real-time
  child.stdout.on('data', (data) => {
    console.log(`[UPDATE-LOG] ${data.toString()}`);
  });
  child.stderr.on('data', (data) => {
    console.error(`[UPDATE-LOG-ERR] ${data.toString()}`);
  });
};
