const fs = require("fs");
const path = require("path");
const dbPromise = require("../models/database");

async function cleanUnusedUploads() {
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) return;

  const itemsInUpload = fs.readdirSync(uploadDir);
  const connection = await dbPromise;

  const [questions] = await connection.query("SELECT soal, opsi FROM questions");
  const [settings] = await connection.query("SELECT logo FROM web_settings");

  const usedImages = new Set();

  // Tambah logo yang digunakan
  if (settings && settings[0]?.logo) {
    const logo = settings[0].logo;
    const logoMatch = logo.match(/\/uploads\/([^"]+)/);
    if (logoMatch) {
      usedImages.add(logoMatch[1]);
    }
  }

  // Tambah gambar dari soal dan opsi
  questions.forEach(row => {
    const soal = row.soal || "";
    let opsiList = [];
    try {
      opsiList = JSON.parse(row.opsi || "[]");
    } catch (err) {}

    const htmlList = [soal, ...opsiList];
    htmlList.forEach(html => {
      const matches = html.match(/src="\/uploads\/([^"]+)"/g);
      if (matches) {
        matches.forEach(match => {
          const filename = match.match(/\/uploads\/([^"]+)"/)[1];
          usedImages.add(filename);
        });
      }
    });
  });

  const deleted = [];

  itemsInUpload.forEach(item => {
    const itemPath = path.join(uploadDir, item);
    const isDirectory = fs.statSync(itemPath).isDirectory();

    if (isDirectory) {
      fs.rmSync(itemPath, { recursive: true, force: true });
      deleted.push(`${item}/`);
      return;
    }

    if (!usedImages.has(item)) {
      fs.unlinkSync(itemPath);
      deleted.push(item);
    }
  });

  if (deleted.length > 0) {
    console.log("🧹 Upload cleaner: item dihapus:", deleted.join(", "));
  }
}

module.exports = cleanUnusedUploads;
