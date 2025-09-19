const { exec } = require("child_process");
const fs = require("fs");

const GITHUB_REPO = "Faizaryasena09/ExamApp";
const REPO_BRANCH = "main";
const LOCAL_COMMIT_HASH_PATH = "/app/backend/commit_hash.txt";

let sseClients = [];

const sendLogToClients = (logLine) => {
  const formattedLog = `data: ${JSON.stringify({ log: logLine })}\n\n`;
  sseClients.forEach(client => client.res.write(formattedLog));
};

exports.streamUpdateLogs = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  sseClients.push({ id: clientId, res });
  sendLogToClients("[INFO] Koneksi SSE log berhasil dibuat.");

  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
};

exports.checkUpdate = async (req, res) => {
  const getRemoteCommit = () =>
    new Promise((resolve, reject) => {
      exec(`git ls-remote https://github.com/${GITHUB_REPO}.git ${REPO_BRANCH}`, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || "Gagal fetch commit remote"));
        resolve(stdout.split("\t")[0]);
      });
    });

  const getLocalCommit = () =>
    fs.existsSync(LOCAL_COMMIT_HASH_PATH)
      ? fs.readFileSync(LOCAL_COMMIT_HASH_PATH, "utf8").trim()
      : "tidak-diketahui";

  try {
    const remoteCommit = await getRemoteCommit();
    const localCommit = getLocalCommit();
    res.json({ updateAvailable: remoteCommit !== localCommit, localCommit, remoteCommit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.installUpdate = async (req, res) => {
  res.status(202).json({ message: "Proses pembaruan dimulai..." });

  const updateScript = `
#!/bin/bash
echo "[INFO] Memulai proses pembaruan..."
UPDATE_DIR="/tmp/examapp_update"
mkdir -p $UPDATE_DIR

git clone --branch ${REPO_BRANCH} --single-branch https://github.com/${GITHUB_REPO}.git $UPDATE_DIR
echo "[INFO] Repositori berhasil di-clone."

cd $UPDATE_DIR
NEW_COMMIT_HASH=$(git rev-parse HEAD)
cd -

echo "[INFO] Menginstal dependensi backend..."
cd $UPDATE_DIR/backend && npm install --legacy-peer-deps || echo "[INFO] Beberapa warning npm backend"
cd -

echo "[INFO] Menginstal dependensi frontend..."
cd $UPDATE_DIR/frontend && npm install --legacy-peer-deps || echo "[INFO] Beberapa warning npm frontend"
cd -

echo "[INFO] Mem-build frontend..."
cd $UPDATE_DIR/frontend && npm run build || echo "[INFO] Beberapa warning build frontend"
cd -

echo "[INFO] Menyalin backend (tidak termasuk uploads)..."
rsync -a --exclude 'public/uploads' $UPDATE_DIR/backend/ /app/backend/ || echo "[INFO] Beberapa file backend tidak tersalin, tapi proses lanjut"
echo "[INFO] Menyalin frontend..."
rsync -a $UPDATE_DIR/frontend/build/ /var/www/html/ || echo "[INFO] Beberapa file frontend tidak tersalin, tapi proses lanjut"

echo $NEW_COMMIT_HASH > ${LOCAL_COMMIT_HASH_PATH}
echo "[INFO] Hash commit baru disimpan."

echo "[INFO] Me-restart Apache..."
apachectl -k graceful || service apache2 restart

echo "[INFO] Me-restart PM2..."
pm2 restart all

rm -rf $UPDATE_DIR
echo "[SUCCESS] Proses pembaruan selesai!"
`;

  const child = exec(updateScript);

  child.stdout.on("data", (data) => {
    data.toString().split("\n").forEach(line => {
      if (line) sendLogToClients(line);
    });
  });

  child.stderr.on("data", (data) => {
    data.toString().split("\n").forEach(line => {
      if (line) {
        if (line.toLowerCase().includes("fatal") || line.toLowerCase().includes("error")) {
          sendLogToClients(`[ERROR] ${line}`);
        } else {
          sendLogToClients(`[INFO] ${line}`);
        }
      }
    });
  });

  child.on("close", (code) => {
    const finalMessage = code === 0 ? "[SUCCESS] Proses pembaruan selesai! Backend & Frontend siap." : "[FAILED] Proses pembaruan gagal!";
    sendLogToClients(finalMessage);
    sendLogToClients("__END__");
  });
};
