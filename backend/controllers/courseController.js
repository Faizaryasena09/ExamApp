const poolPromise = require('../models/database');
const dbPromise = require('../models/database');
const mammoth = require("mammoth");
const fs = require("fs");

function shuffleArray(array) {
    return array
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
  }

// ✅ Tambah course
exports.createCourse = async (req, res) => {
    const {
      nama, pengajarId, kelas, tanggalMulai, tanggalSelesai,
      waktu, deskripsi, maxPercobaan, tampilkanHasil, useToken, tokenValue
    } = req.body;
  
    const { name, role } = req.cookies;
    if (!name || !role) return res.status(401).send("Unauthorized");
  
    try {
      const pool = await poolPromise;
      await pool.query(
        `INSERT INTO courses 
        (nama, pengajar_id, pengajar, kelas, tanggal_mulai, tanggal_selesai, waktu, deskripsi,
          maxPercobaan, tampilkanHasil, useToken, tokenValue, tokenCreatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nama,
          pengajarId,
          name,
          JSON.stringify(kelas),
          tanggalMulai,
          tanggalSelesai || null,
          waktu,
          deskripsi,
          maxPercobaan || 1,
          tampilkanHasil || false,
          useToken || false,
          useToken ? tokenValue?.slice(0, 6) : null,
          useToken ? new Date() : null
        ]
      );
      res.status(201).json({ message: "Course berhasil dibuat!" });
    } catch (err) {
      console.error("Gagal membuat course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };  

// ✅ Ambil semua courses (dengan filter)
exports.getCourses = async (req, res) => {
    const { role, name } = req.cookies;
    if (!name || !role) return res.status(401).send("Unauthorized");
  
    try {
      const pool = await poolPromise;
  
      let query = "SELECT * FROM courses";
      const params = [];
  
      // 🔍 Kalau guru, filter berdasarkan nama pengajar
      if (role === "guru") {
        query += " WHERE pengajar = ?";
        params.push(name);
      }
  
      // 🔍 Kalau siswa, ambil kelas dari tabel users
      let siswaKelas = null;
      if (role === "siswa") {
        const [userRows] = await pool.query("SELECT kelas FROM users WHERE name = ?", [name]);
        if (userRows.length === 0) {
          return res.status(404).json({ message: "User siswa tidak ditemukan" });
        }
  
        siswaKelas = String(userRows[0].kelas).toLowerCase().trim();
      }
  
      const [rows] = await pool.query(query, params);
  
      // 🔄 Parse kelas course + filter sesuai siswa (kalau siswa)
      const result = rows
        .map((row) => {
          let kelasParsed = [];
  
          try {
            kelasParsed = JSON.parse(row.kelas);
            if (!Array.isArray(kelasParsed)) {
              kelasParsed = [String(kelasParsed)];
            }
          } catch {
            kelasParsed = [String(row.kelas)];
          }
  
          return {
            ...row,
            kelas: kelasParsed,
          };
        })
        .filter((course) => {
          if (role === "siswa") {
            const courseKelasLower = course.kelas.map(k =>
              String(k).toLowerCase().trim()
            );
            return courseKelasLower.includes(siswaKelas);
          }
  
          return true; // admin dan guru udah difilter dari query awal
        });
  
      res.json(result);
    } catch (err) {
      console.error("❌ Gagal ambil data course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };
  

// ✅ Ambil detail 1 course
exports.getCourseById = async (req, res) => {
    const courseId = req.params.id;
  
    try {
      const pool = await poolPromise;
      const [rows] = await pool.query("SELECT * FROM courses WHERE id = ?", [courseId]);
  
      if (rows.length === 0) return res.status(404).json({ message: "Course tidak ditemukan" });
  
      const course = rows[0];
      course.kelas = JSON.parse(course.kelas);
      res.json(course);
    } catch (err) {
      console.error("Gagal ambil course by ID:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };  

// ✅ Update konfigurasi course
exports.updateCourse = async (req, res) => {
    const courseId = req.params.id;
    const {
      nama, kelas, tanggal_mulai, tanggal_selesai, waktu, deskripsi,
      maxPercobaan, tampilkanHasil, useToken, tokenValue
    } = req.body;
  
    try {
      const pool = await poolPromise;
      await pool.query(
        `UPDATE courses SET 
          nama = ?, 
          kelas = ?, 
          tanggal_mulai = ?, 
          tanggal_selesai = ?, 
          waktu = ?, 
          deskripsi = ?,
          maxPercobaan = ?, 
          tampilkanHasil = ?, 
          useToken = ?, 
          tokenValue = ?, 
          tokenCreatedAt = ?
        WHERE id = ?`,
        [
          nama,
          JSON.stringify(kelas),
          tanggal_mulai,
          tanggal_selesai || null,
          waktu,
          deskripsi,
          maxPercobaan || 1,
          tampilkanHasil || false,
          useToken || false,
          useToken ? tokenValue?.slice(0, 6) : null,
          useToken ? new Date() : null,
          courseId
        ]
      );
      res.json({ message: "Course berhasil diperbarui!" });
    } catch (err) {
      console.error("Gagal update course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };  

exports.deleteCourse = async (req, res) => {
  const courseId = req.params.id;
  try {
    const pool = await poolPromise;
    await pool.query("DELETE FROM courses WHERE id = ?", [courseId]);
    res.json({ message: "Course berhasil dihapus!" });
  } catch (err) {
    console.error("Gagal hapus course:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.simpanSoal = async (req, res) => {
    const db = await dbPromise; // ✅ ini WAJIB!
  
    const course_id = req.params.id;
    const { soal: soalList, acakSoal, acakJawaban } = req.body;
  
    if (!soalList || !Array.isArray(soalList)) {
      return res.status(400).json({ error: "Format soal tidak valid" });
    }
  
    try {
      for (const item of soalList) {
        const opsi = acakJawaban ? shuffleArray(item.opsi) : item.opsi;
  
        await db.query(
          "INSERT INTO questions (course_id, soal, opsi, jawaban) VALUES (?, ?, ?, ?)",
          [course_id, item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase()]
        );
      }
  
      res.json({ success: true, total: soalList.length });
    } catch (err) {
      console.error("❌ Gagal simpan soal:", err);
      res.status(500).json({ error: "Gagal menyimpan soal" });
    }
  };  
  
  exports.ambilSoal = async (req, res) => {
    const db = await dbPromise;
  
    const course_id = req.params.id;
  
    try {
      const [rows] = await db.query(
        "SELECT id, soal, opsi FROM questions WHERE course_id = ?",
        [course_id]
      );
  
      const acak = req.query.acak === "true";
      const hasil = acak ? shuffleArray(rows) : rows;
  
      res.json(hasil);
    } catch (err) {
      console.error("❌ Gagal ambil soal:", err);
      res.status(500).json({ error: "Gagal mengambil soal" });
    }
  };  

  exports.uploadSoalDocx = async (req, res) => {
    const filePath = req.file.path;
  
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      const soalList = parseSoalFromText(text);
      fs.unlinkSync(filePath); // Hapus file sementara
      res.json({ soal: soalList });
    } catch (err) {
      console.error("❌ Gagal parsing Word:", err);
      res.status(500).json({ error: "Gagal membaca file Word" });
    }
  };
  
  exports.getCourseStatus = async (req, res) => {
    const courseId = req.params.id;
    const userId = Number(req.query.user);
if (!userId || isNaN(userId)) {
  return res.status(400).json({ message: "User ID tidak valid" });
}

  
    try {
      const pool = await dbPromise;
  
      // Ambil konfigurasi course
      const [courseRows] = await pool.query(
        "SELECT maxPercobaan, useToken FROM courses WHERE id = ?",
        [courseId]
      );
  
      if (courseRows.length === 0) {
        return res.status(404).json({ message: "Course tidak ditemukan" });
      }
  
      const course = courseRows[0];
  
      // Cek jumlah percobaan tertinggi user
      const [jawabanRows] = await pool.query(
        "SELECT MAX(attemp) AS total FROM jawaban_siswa WHERE course_id = ? AND user_id = ?",
        [courseId, userId]
      );
  
      const totalPercobaan = jawabanRows[0].total || 0;
  
      res.json({
        sudahMaksimal: totalPercobaan >= course.maxPercobaan,
        useToken: !!course.useToken
      });
    } catch (err) {
      console.error("❌ Gagal cek status course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  // ✅ [2] Validasi token siswa
  exports.validateCourseToken = async (req, res) => {
    const courseId = req.params.id;
    const { token, user } = req.body;
  
    try {
      const pool = await dbPromise;
  
      const [rows] = await pool.query(
        "SELECT tokenValue, tokenCreatedAt FROM courses WHERE id = ?",
        [courseId]
      );
  
      if (rows.length === 0) return res.status(404).json({ message: "Course tidak ditemukan" });
  
      const { tokenValue, tokenCreatedAt } = rows[0];
  
      if (!tokenValue || !tokenCreatedAt) {
        return res.json({ valid: false, reason: "Token tidak tersedia" });
      }
  
      const expired = Date.now() - new Date(tokenCreatedAt).getTime() > 15 * 60 * 1000;
      const tokenValid = tokenValue.toUpperCase() === token.toUpperCase();
  
      if (tokenValid && !expired) {
        res.json({ valid: true });
      } else {
        res.json({ valid: false, reason: expired ? "Token expired" : "Token salah" });
      }
    } catch (err) {
      console.error("❌ Gagal validasi token:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };

  exports.submitUjian = async (req, res) => {
    const { user_id, jawaban } = req.body;
    const course_id = parseInt(req.params.id);
    const parsedUserId = parseInt(user_id);
  
    if (isNaN(parsedUserId) || !Array.isArray(jawaban)) {
      console.log("❌ Data tidak valid:", { user_id, jawaban });
      return res.status(400).json({ message: "Data tidak valid." });
    }
  
    try {
      const pool = await poolPromise;
  
      // 🔢 Ambil attempt terakhir dari DB
      const [result] = await pool.query(
        `SELECT MAX(attemp) as last_attempt FROM jawaban_siswa WHERE user_id = ? AND course_id = ?`,
        [parsedUserId, course_id]
      );
  
      const lastAttempt = result?.[0]?.last_attempt || 0;
      const nextAttempt = lastAttempt + 1;
  
      // 💾 Simpan jawaban (overwrite jawaban sebelumnya, tapi attempt tetap naik)
      for (const j of jawaban) {
        const soalId = parseInt(j.soal_id);
        const ans = String(j.jawaban || "").toUpperCase().trim();
  
        if (isNaN(soalId) || ans === "") continue;
  
        await pool.query(`
          INSERT INTO jawaban_siswa (user_id, course_id, soal_id, jawaban, attemp)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE jawaban = VALUES(jawaban), attemp = VALUES(attemp)
        `, [parsedUserId, course_id, soalId, ans, nextAttempt]);
      }
  
      res.json({ message: "✅ Jawaban berhasil disimpan.", attemp: nextAttempt });
    } catch (err) {
      console.error("❌ Gagal simpan jawaban:", err.message);
      res.status(500).json({ message: "Gagal simpan jawaban" });
    }
  };
  
  exports.saveOrUpdateQuestions = async (req, res) => {
    const course_id = req.params.id;
    const { soal, acakSoal, acakJawaban } = req.body;
  
    if (!Array.isArray(soal)) {
      return res.status(400).json({ error: "Format soal tidak valid" });
    }
  
    try {
      const db = await dbPromise;
  
      await db.query("DELETE FROM questions WHERE course_id = ?", [course_id]);
  
      for (const item of soal) {
        await db.query(
          "INSERT INTO questions (course_id, soal, opsi, jawaban) VALUES (?, ?, ?, ?)",
          [
            course_id,
            item.soal,
            JSON.stringify(item.opsi),
            item.jawaban
          ]
        );
      }
  
      res.json({ success: true });
    } catch (err) {
      console.error("❌ Gagal simpan soal:", err);
      res.status(500).json({ error: "Gagal simpan soal" });
    }
  };  
  
  exports.getQuestions = async (req, res) => {
    const course_id = req.params.id;
  
    try {
      const db = await dbPromise;
      const [rows] = await db.query(
        "SELECT id, soal, opsi, jawaban FROM questions WHERE course_id = ?",
        [course_id]
      );
  
      const soalList = rows.map((row) => {
        let opsiParsed = [];
  
        try {
          opsiParsed = JSON.parse(row.opsi);
        } catch (err) {
          console.warn("⚠️ Gagal parse opsi:", row.opsi);
        }
  
        const jawaban = row.jawaban
          ? row.jawaban.trim().charAt(0).toUpperCase()
          : null;
  
        return {
          id: row.id,
          soal: row.soal,
          opsi: opsiParsed,
          jawaban: jawaban,
        };
      });
  
      res.json(soalList);
    } catch (err) {
      console.error("❌ Gagal ambil soal:", err);
      res.status(500).json({ error: "Gagal ambil soal" });
    }
  };
  
  
  function parseSoalFromText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const soalList = [];
  
    let currentQuestion = null;
    let currentOptions = [];
    let currentAnswer = null;
  
    lines.forEach((line) => {
      if (/^\d+\./.test(line)) {
        if (currentQuestion && currentAnswer && currentOptions.length >= 2) {
          soalList.push({
            soal: currentQuestion,
            opsi: currentOptions,
            jawaban: currentAnswer,
          });
        }
        currentQuestion = line.replace(/^\d+\.\s*/, '');
        currentOptions = [];
        currentAnswer = null;
      } else if (/^[A-Da-d]\./.test(line)) {
        currentOptions.push(line);
      } else if (/^ANS:\s*/i.test(line)) {
        const match = line.match(/^ANS:\s*([A-Da-d])/);
        if (match) currentAnswer = match[1].toUpperCase();
      } else if (currentQuestion) {
        currentQuestion += " " + line;
      }
    });
  
    // Simpan soal terakhir
    if (currentQuestion && currentAnswer && currentOptions.length >= 2) {
      soalList.push({
        soal: currentQuestion,
        opsi: currentOptions,
        jawaban: currentAnswer,
      });
    }
  
    return soalList;
  }
  