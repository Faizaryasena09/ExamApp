const unzipper = require("unzipper");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { Readable } = require("stream");

// Regex fleksibel
const questionNumberRegex = /^\s*\d+[\.\)]?\s*/;  
const optionRegex = /^\s*[A-Ea-e][\.\)]?\s*/;  
const answerRegex = /^\s*(ANS|ANSWER|JAWABAN)\s*[:\-]?\s*([A-Ea-e])/i;  

// Fallback keyword
const keywordQuestionRegex = /\b(soal|pertanyaan|question)\b[:\-]?\s*/i;  
const keywordOptionRegex = /\b(pilihan|opsi|option)\b[:\-]?\s*/i;  

// Fungsi bersihin html/text
const cleanHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/\uFFFD/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const parseZip = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Tidak ada file .zip yang diunggah." });
  }

  const tempDir = path.join(__dirname, "..", "temp", uuidv4());
  const publicUploadsDir = path.join(__dirname, "..", "public", "uploads", "images");

  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
    await fs.promises.mkdir(publicUploadsDir, { recursive: true });

    // Extract zip
    const stream = Readable.from(req.file.buffer);
    await new Promise((resolve, reject) => {
      stream.pipe(unzipper.Extract({ path: tempDir }))
        .on("finish", resolve)
        .on("error", reject);
    });

    // Cari file HTML
    let htmlFile = "";
    const filesInTemp = await fs.promises.readdir(tempDir);
    let baseDir = tempDir;

    htmlFile = filesInTemp.find(f => f.endsWith(".htm") || f.endsWith(".html"));
    if (!htmlFile) {
      const subDir = filesInTemp.find(f =>
        fs.statSync(path.join(tempDir, f)).isDirectory()
      );
      if (subDir) {
        baseDir = path.join(tempDir, subDir);
        const subFiles = await fs.promises.readdir(baseDir);
        htmlFile = subFiles.find(f => f.endsWith(".htm") || f.endsWith(".html"));
      }
    }
    if (!htmlFile) {
      throw new Error("File .htm atau .html tidak ditemukan di dalam zip.");
    }

    // Load HTML
    const htmlPath = path.join(baseDir, htmlFile);
    let htmlContent = await fs.promises.readFile(htmlPath, "utf-8");
    const $ = cheerio.load(htmlContent);

    // Proses gambar
    await Promise.all(
      $("img").map(async (_, img) => {
        const imgSrc = $(img).attr("src");
        if (!imgSrc) return;

        const originalImagePath = path.join(baseDir, imgSrc);
        if (fs.existsSync(originalImagePath)) {
          const newFileName = `${uuidv4()}${path.extname(originalImagePath)}`;
          const newImagePath = path.join(publicUploadsDir, newFileName);
          await fs.promises.copyFile(originalImagePath, newImagePath);
          $(img).attr("src", `/uploads/images/${newFileName}`);
        }
      }).get()
    );

    // Parsing soal
    const questions = [];
    let currentQuestion = null;

    $("body").find("p, li, div").each((_, element) => {
      const el = $(element);
      const rawText = el.text().trim();
      const text = cleanHtml(rawText);
      const html = cleanHtml(el.html());

      // Skip kosong (kecuali ada gambar)
      if (!text && !el.find("img").length) return;

      // 1️⃣ Deteksi soal
      if ((questionNumberRegex.test(text) || keywordQuestionRegex.test(text)) && !currentQuestion) {
        // Push soal lama tanpa jawaban
        if (currentQuestion) {
          questions.push(currentQuestion);
        }

        currentQuestion = {
          soal: html
            .replace(questionNumberRegex, "")
            .replace(keywordQuestionRegex, "")
            .trim(),
          opsi: [],
          jawaban: "",
          tipe_soal: "pilihan_ganda",
          detected_by: questionNumberRegex.test(text) ? "regex" : "keyword"
        };
      }

      // 2️⃣ Dalam soal aktif
      else if (currentQuestion) {
        // Jawaban
        if (answerRegex.test(text)) {
          const match = text.match(answerRegex);
          currentQuestion.jawaban = match[2].toUpperCase();
          questions.push(currentQuestion);
          currentQuestion = null;
        }
        // Opsi
        else if (optionRegex.test(text) || keywordOptionRegex.test(text)) {
          currentQuestion.opsi.push(
            html.replace(optionRegex, "").replace(keywordOptionRegex, "").trim()
          );
        }
        // Tambahan isi soal
        else {
          currentQuestion.soal += `<br>${html}`;
        }
      }

      // 3️⃣ Kalau belum ada soal tapi ada jawaban → fallback
      else if (answerRegex.test(text) && questions.length > 0) {
        const match = text.match(answerRegex);
        questions[questions.length - 1].jawaban = match[2].toUpperCase();
      }
    });

    // Auto-close terakhir
    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    res.status(200).json(questions);

  } catch (error) {
    console.error("Error parsing zip:", error);
    res.status(500).json({ message: "Gagal memproses file zip.", error: error.message });
  } finally {
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }
};

// Dummy parseDocx
const parseDocx = async (req, res) => {
  res.status(400).json({ message: "Metode ini sudah tidak digunakan." });
};

module.exports = { parseDocx, parseZip };
  