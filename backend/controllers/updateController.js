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

  const scriptPath = path.resolve(__dirname, "../update.sh");

  const child = exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
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