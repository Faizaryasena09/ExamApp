const fs = require("fs");
const path = require("path");
const dbPromise = require("../models/database");

async function cleanUnusedUploads() {
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) {
    console.warn("⚠️ Folder /uploads tidak ditemukan");
    return;
  }

  const filesInUpload = fs.readdirSync(uploadDir);
  const connection = await dbPromise;

  const [rows] = await connection.query("SELECT soal, opsi FROM questions");

  const usedImages = new Set();

  rows.forEach(row => {
    const soal = row.soal || "";
    let opsiList = [];
    try {
      opsiList = JSON.parse(row.opsi || "[]");
    } catch (err) {
      console.warn("❗ Opsi tidak bisa di-parse:", row.opsi);
    }

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
  filesInUpload.forEach(file => {
    if (!usedImages.has(file)) {
      const filePath = path.join(uploadDir, file);
      fs.unlinkSync(filePath);
      deleted.push(file);
    }
  });
}

module.exports = cleanUnusedUploads;
