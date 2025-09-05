const unzipper = require("unzipper");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { Readable } = require('stream');

// VERSI AMAN DAN SEDERHANA UNTUK MENGHENTIKAN ERROR
const parseZip = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Tidak ada file .zip yang diunggah." });
  }

  const tempDir = path.join(__dirname, "..", "temp", uuidv4());

  try {
    // 1. Buat direktori temporer utama
    await fs.promises.mkdir(tempDir, { recursive: true });

    // 2. Gunakan unzipper.Extract yang lebih andal dengan mengubah buffer ke stream
    const stream = Readable.from(req.file.buffer);
    await new Promise((resolve, reject) => {
        stream.pipe(unzipper.Extract({ path: tempDir }))
            .on('finish', resolve)
            .on('error', reject);
    });

    // 3. Cari file .htm/.html
    const files = await fs.promises.readdir(tempDir);
    const htmlFile = files.find(f => f.endsWith('.htm') || f.endsWith('.html'));

    if (!htmlFile) {
      // Cek subdirektori jika ada
      let foundHtml = null;
      for (const file of files) {
          const subDirPath = path.join(tempDir, file);
          if (fs.statSync(subDirPath).isDirectory()) {
              const subFiles = await fs.promises.readdir(subDirPath);
              foundHtml = subFiles.find(f => f.endsWith('.htm') || f.endsWith('.html'));
              if (foundHtml) {
                  htmlFile = path.join(file, foundHtml);
                  break;
              }
          }
      }
      if (!htmlFile) throw new Error("File .htm atau .html tidak ditemukan di dalam zip.");
    }

    // 4. Baca file HTML dan ekstrak semua teks mentah
    const htmlPath = path.join(tempDir, htmlFile);
    const htmlContent = await fs.promises.readFile(htmlPath, "utf-8");
    const $ = cheerio.load(htmlContent);
    const rawText = $('body').text();

    // 5. Kirim kembali HANYA teks mentah
    res.status(200).json({ text: rawText });

  } catch (error) {
    console.error("Error parsing zip [SAFE MODE]:", error);
    res.status(500).json({ message: "Gagal memproses file zip.", error: error.message });
  } finally {
    // 6. Hapus direktori temporer
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }
};

// Fungsi lama, tidak digunakan
const parseDocx = async (req, res) => {
    res.status(400).json({ message: "Metode ini sudah tidak digunakan." });
};

module.exports = { parseDocx, parseZip };
