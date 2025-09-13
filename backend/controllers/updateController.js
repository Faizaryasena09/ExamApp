const { exec } = require("child_process");
const fs = require("fs");

// Ambil PAT dari environment variable
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = "Faizaryasena09/ExamApp";
const GITHUB_URL_WITH_PAT = `https://oauth2:${GITHUB_PAT}@github.com/${GITHUB_REPO}.git`;
const REPO_BRANCH = "update";
const GITHUB_URL = `https://github.com/${GITHUB_REPO}.git`;

// Tentukan URL: kalau ada PAT pakai private URL, kalau nggak ada pakai publik
const GITHUB_URL = GITHUB_PAT
  ? `https://oauth2:${GITHUB_PAT}@github.com/${GITHUB_REPO}.git`
  : `https://github.com/${GITHUB_REPO}.git`;

// Path ini mengasumsikan lokasi di dalam kontainer Docker
const LOCAL_COMMIT_HASH_PATH = "/app/backend/commit_hash.txt";

// =============================================
// Bagian untuk Real-time Logging (SSE)
// =============================================
let sseClients = [];

// Fungsi untuk mengirim log ke semua client yang terhubung
const sendLogToClients = (logLine) => {
  // Format data sesuai standar SSE
  const formattedLog = `data: ${JSON.stringify({ log: logLine })}\n\n`;
  sseClients.forEach(client => client.res.write(formattedLog));
};

// Controller untuk endpoint SSE
exports.streamUpdateLogs = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);
  console.log(`[SSE] Client log update terhubung: ${clientId}`);

  // Kirim pesan konfirmasi koneksi
  sendLogToClients("[INFO] Koneksi untuk log real-time berhasil dibuat.");

  req.on('close', () => {
    console.log(`[SSE] Client log update terputus: ${clientId}`);
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
};

// =============================================
// Controller untuk Fitur Update
// =============================================

exports.checkUpdate = async (req, res) => {
<<<<<<< HEAD
  if (!GITHUB_PAT) {
    return res.status(500).json({ message: "GITHUB_PAT tidak diatur di file .env." });
  }

=======
  // Ambil hash commit remote
=======
const LOCAL_COMMIT_HASH_PATH = "/app/backend/commit_hash.txt";

exports.checkUpdate = async (req, res) => {
>>>>>>> b073347a7952c304367a6f9c18d2316eebd4e59f
>>>>>>> 8186995532442c22a811b7baa66e941905eddcac
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

  const getLocalCommit = () => {
    if (fs.existsSync(LOCAL_COMMIT_HASH_PATH)) {
      return fs.readFileSync(LOCAL_COMMIT_HASH_PATH, "utf8").trim();
    }
    return "tidak-diketahui";
  };

  try {
    const remoteCommit = await getRemoteCommit();
    const localCommit = getLocalCommit();

    if (!remoteCommit) {
        return res.status(500).json({ message: "Tidak bisa mendapatkan commit dari remote." });
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
  

  if (!GITHUB_PAT) {
    return res.status(500).json({ message: "GITHUB_PAT tidak diatur. Proses update tidak bisa dimulai." });
  }

  // Segera kirim respons 202 Accepted ke client
  res.status(202).json({ message: "Proses pembaruan dimulai..." });

  const updateScript = `
    #!/bin/bash
    echo "[UPDATE] Memulai proses pembaruan..."
    UPDATE_DIR="/tmp/examapp_update"
    rm -rf $UPDATE_DIR
    mkdir -p $UPDATE_DIR
    echo "[UPDATE] Direktori sementara dibuat di $UPDATE_DIR"
    git clone --branch ${REPO_BRANCH} --single-branch ${GITHUB_URL_WITH_PAT} $UPDATE_DIR
    if [ $? -ne 0 ]; then echo "[UPDATE-ERROR] Gagal melakukan git clone."; exit 1; fi
    echo "[UPDATE] Repositori berhasil di-clone."
    cd $UPDATE_DIR
    NEW_COMMIT_HASH=$(git rev-parse HEAD)
    cd - 
    echo "[UPDATE] Menginstal dependensi backend..."
    cd $UPDATE_DIR/backend && npm install
    if [ $? -ne 0 ]; then echo "[UPDATE-ERROR] Gagal npm install di backend."; exit 1; fi
    echo "[UPDATE] Dependensi backend OK."
    echo "[UPDATE] Menginstal dependensi frontend..."
    cd $UPDATE_DIR/frontend && npm install
    if [ $? -ne 0 ]; then echo "[UPDATE-ERROR] Gagal npm install di frontend."; exit 1; fi
    echo "[UPDATE] Dependensi frontend OK."
    echo "[UPDATE] Mem-build aplikasi frontend..."
    npm run build
    if [ $? -ne 0 ]; then echo "[UPDATE-ERROR] Gagal mem-build frontend."; exit 1; fi
    echo "[UPDATE] Frontend berhasil di-build."
    echo "[UPDATE] Menyalin file backend baru..."
    rsync -a --delete $UPDATE_DIR/backend/ /app/backend/
    echo "[UPDATE] Menyalin file frontend baru..."
    rsync -a --delete $UPDATE_DIR/frontend/build/ /var/www/html/
    echo $NEW_COMMIT_HASH > ${LOCAL_COMMIT_HASH_PATH}
    echo "[UPDATE] Hash commit baru disimpan."
    echo "[UPDATE] Me-restart PM2..."
    pm2 restart all
    echo "[UPDATE] Me-restart Apache..."
    apachectl -k graceful || service apache2 restart
    rm -rf $UPDATE_DIR
    echo "[UPDATE] Proses pembaruan selesai!"
  `;

  // Jalankan skrip dan stream outputnya
  const child = exec(updateScript);

  // Kirim setiap baris dari stdout ke client SSE
  child.stdout.on('data', (data) => {
    data.toString().split('\n').forEach(line => {
      if (line) {
        console.log(`[UPDATE-LOG] ${line}`);
        sendLogToClients(line);
      }
    });
  });

<<<<<<< HEAD
  // Kirim setiap baris dari stderr ke client SSE
  child.stderr.on('data', (data) => {
    data.toString().split('\n').forEach(line => {
      if (line) {
        console.error(`[UPDATE-LOG-ERR] ${line}`);
        sendLogToClients(`[ERROR] ${line}`);
      }
    });
=======
  const scriptPath = path.resolve(__dirname, "../update.sh");

<<<<<<< HEAD
  const child = exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
=======
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

echo "[UPDATE] Me-restart Apache..."
apachectl -k graceful || service apache2 restart

echo "[UPDATE] Proses pembaruan selesai!"

# 9. Restart service
echo "[UPDATE] Me-restart PM2..."
pm2 restart all

`;

  const child = exec(updateScript, (error, stdout, stderr) => {
>>>>>>> 745f47d109ea1e3941d4e3e31e8e14320c92cf91
    if (error) {
      console.error(`[UPDATE-ERROR] ${error.message}`);
      console.error(`[UPDATE-STDERR] ${stderr}`);
      return;
    }
    console.log(`[UPDATE-STDOUT] ${stdout}`);
>>>>>>> 8186995532442c22a811b7baa66e941905eddcac
  });

  // Kirim pesan akhir saat skrip selesai
  child.on('close', (code) => {
    const finalMessage = code === 0 ? "[SUCCESS] Proses pembaruan selesai! Anda mungkin perlu me-refresh halaman ini secara manual." : "[FAILED] Proses pembaruan gagal.";
    console.log(finalMessage);
    sendLogToClients(finalMessage);
    sendLogToClients("__END__"); // Sinyal akhir stream
  });
};