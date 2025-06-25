const poolPromise = require('../models/database');
const dbPromise = require('../models/database');
const mammoth = require("mammoth");
const fs = require("fs");
const db = require('../models/database');

function shuffleArray(array) {
    return array
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
  }

  exports.createCourse = async (req, res) => {
    const {
      nama, pengajarId, kelas, tanggalMulai, tanggalSelesai,
      waktu, deskripsi, maxPercobaan, tampilkanHasil,
      useToken, tokenValue, acakSoal, acakJawaban
    } = req.body;
  
    const { name, role } = req.cookies;
    if (!name || !role) return res.status(401).send("Unauthorized");
  
    try {
      const pool = await poolPromise;
      await pool.query(
        `INSERT INTO courses 
        (nama, pengajar_id, pengajar, kelas, tanggal_mulai, tanggal_selesai, waktu, deskripsi,
          maxPercobaan, tampilkanHasil, useToken, tokenValue, tokenCreatedAt, acakSoal, acakJawaban)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          useToken ? new Date() : null,
          !!acakSoal,
          !!acakJawaban
        ]
      );
      res.status(201).json({ message: "Course berhasil dibuat!" });
    } catch (err) {
      console.error("Gagal membuat course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };
  
exports.getCourses = async (req, res) => {
    const { role, name } = req.cookies;
    if (!name || !role) return res.status(401).send("Unauthorized");
  
    try {
      const pool = await poolPromise;
  
      let query = "SELECT * FROM courses";
      const params = [];
  
      if (role === "guru") {
        query += " WHERE pengajar = ?";
        params.push(name);
      }
  
      let siswaKelas = null;
      if (role === "siswa") {
        const [userRows] = await pool.query("SELECT kelas FROM users WHERE name = ?", [name]);
        if (userRows.length === 0) {
          return res.status(404).json({ message: "User siswa tidak ditemukan" });
        }
  
        siswaKelas = String(userRows[0].kelas).toLowerCase().trim();
      }
  
      const [rows] = await pool.query(query, params);
  
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
  
          return true;
        });
  
      res.json(result);
    } catch (err) {
      console.error("❌ Gagal ambil data course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };
  
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

  exports.updateCourse = async (req, res) => {
    const courseId = req.params.id;
    const {
      nama, kelas, tanggal_mulai, tanggal_selesai, waktu, deskripsi,
      maxPercobaan, tampilkanHasil, useToken, tokenValue,
      acakSoal, acakJawaban
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
          tokenCreatedAt = ?,
          acakSoal = ?, 
          acakJawaban = ?
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
          !!acakSoal,
          !!acakJawaban,
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
  const db = await dbPromise;
  const course_id = req.params.id;
  const { soal: soalList, acakSoal, acakJawaban } = req.body;

  if (!soalList || !Array.isArray(soalList)) {
    return res.status(400).json({ error: "Format soal tidak valid" });
  }

  try {
    for (const item of soalList) {
      const opsi = acakJawaban ? shuffleArray(item.opsi) : item.opsi;
      const soalId = parseInt(item.id);

      console.log("🧾 Soal ID FE:", item.id, "| Soal:", item.soal);

      if (!isNaN(soalId)) {
        const [existing] = await db.query(
          "SELECT id FROM questions WHERE id = ? AND course_id = ?",
          [soalId, course_id]
        );

        if (existing.length > 0) {
          console.log("🔁 UPDATE soal:", soalId);
          await db.query(
            "UPDATE questions SET soal = ?, opsi = ?, jawaban = ? WHERE id = ? AND course_id = ?",
            [item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase(), soalId, course_id]
          );
        } else {
          console.log("➕ INSERT soal dengan ID:", soalId);
          await db.query(
            "INSERT INTO questions (id, course_id, soal, opsi, jawaban) VALUES (?, ?, ?, ?, ?)",
            [soalId, course_id, item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase()]
          );
        }
      } else {
        console.log("✨ INSERT soal baru (auto id)");
        await db.query(
          "INSERT INTO questions (course_id, soal, opsi, jawaban) VALUES (?, ?, ?, ?)",
          [course_id, item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase()]
        );
      }
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
      "SELECT id, soal, opsi, jawaban FROM questions WHERE course_id = ?",
      [course_id]
    );

    const hasil = rows.map(item => ({
      ...item,
      opsi: typeof item.opsi === "string" ? JSON.parse(item.opsi) : item.opsi
    }));

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
      fs.unlinkSync(filePath);
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
  
      const [courseRows] = await pool.query(
        "SELECT maxPercobaan, useToken FROM courses WHERE id = ?",
        [courseId]
      );
  
      if (courseRows.length === 0) {
        return res.status(404).json({ message: "Course tidak ditemukan" });
      }
  
      const course = courseRows[0];
  
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
  
  exports.getUserIdByName = async (req, res) => {
    const name = req.params.name;
  
    try {
      const conn = await db;
      const [rows] = await conn.query(`SELECT id FROM users WHERE name = ?`, [name]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }
  
      res.json({ user_id: rows[0].id });
    } catch (err) {
      console.error("❌ Error getUserIdByName:", err);
      res.status(500).json({ error: 'Gagal mengambil user_id.' });
    }
  };

  exports.validateCourseToken = async (req, res) => {
    const courseId = req.params.id;
    const { token, user } = req.body;
  
    try {
      const pool = await dbPromise;
  
      const [rows] = await pool.query(
        "SELECT tokenValue FROM courses WHERE id = ?",
        [courseId]
      );
  
      if (rows.length === 0) return res.status(404).json({ message: "Course tidak ditemukan" });
  
      const { tokenValue } = rows[0];
  
      if (!tokenValue) {
        return res.json({ valid: false, reason: "Token tidak tersedia" });
      }
  
      const tokenValid = tokenValue.toUpperCase() === token.toUpperCase();
  
      if (tokenValid) {
        res.json({ valid: true });
      } else {
        res.json({ valid: false, reason: "Token salah" });
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
  
      const [result] = await pool.query(
        `SELECT MAX(attemp) as last_attempt FROM jawaban_siswa WHERE user_id = ? AND course_id = ?`,
        [parsedUserId, course_id]
      );
  
      const lastAttempt = result?.[0]?.last_attempt || 0;
      const nextAttempt = lastAttempt + 1;
  
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
  
      for (const item of soal) {
        const opsi = acakJawaban ? shuffleArray(item.opsi) : item.opsi;
        const soalId = parseInt(item.id);
  
        if (!isNaN(soalId)) {
          const [existing] = await db.query(
            "SELECT id FROM questions WHERE id = ? AND course_id = ?",
            [soalId, course_id]
          );
  
          if (existing.length > 0) {
            await db.query(
              "UPDATE questions SET soal = ?, opsi = ?, jawaban = ? WHERE id = ? AND course_id = ?",
              [item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase(), soalId, course_id]
            );
          } else {
            await db.query(
              "INSERT INTO questions (id, course_id, soal, opsi, jawaban) VALUES (?, ?, ?, ?, ?)",
              [soalId, course_id, item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase()]
            );
          }
        } else {
          await db.query(
            "INSERT INTO questions (course_id, soal, opsi, jawaban) VALUES (?, ?, ?, ?)",
            [course_id, item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase()]
          );
        }
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

  exports.getAnalyticsByCourse = async (req, res) => {
    try {
      const connection = await db;
      const courseId = req.params.courseId;
  
      const [jawabanRows] = await connection.query(`
        SELECT 
          u.name AS user_name,
          u.kelas AS kelas,
          u.id AS user_id,
          js.soal_id,
          LEFT(TRIM(UPPER(js.jawaban)), 1) AS jawaban_siswa,
          js.attemp,
          TRIM(UPPER(q.jawaban)) AS kunci
        FROM jawaban_siswa js
        JOIN questions q ON js.soal_id = q.id
        JOIN users u ON js.user_id = u.id
        WHERE js.course_id = ?
      `, [courseId]);
  
      const hasil = {};
  
      for (const row of jawabanRows) {
        const key = `${row.user_id}-${row.attemp}`;
  
        if (!hasil[key]) {
          hasil[key] = {
            name: row.user_name,
            user_id: row.user_id,
            kelas: row.kelas,
            attemp: row.attemp,
            total_dikerjakan: 0,
            benar: 0,
            salah: 0,
          };
        }        
  
        hasil[key].total_dikerjakan += 1;
        if (row.jawaban_siswa === row.kunci) {
          hasil[key].benar += 1;
        } else {
          hasil[key].salah += 1;
        }
      }
  
      res.json(Object.values(hasil));
    } catch (err) {
      console.error("❌ Gagal ambil analytics:", err);
      res.status(500).json({ message: "Gagal ambil analytics" });
    }
  };  

  exports.saveTokenAuth = async (req, res) => {
    const { course_id, user_id } = req.body;
  
    if (!course_id || !user_id) {
      return res.status(400).json({ error: "course_id dan user_id wajib diisi" });
    }
  
    try {
      const pool = await dbPromise;
  
      await pool.query(
        `INSERT IGNORE INTO tokenAuth (course_id, user_id) VALUES (?, ?)`,
        [course_id, user_id]
      );
  
      res.json({ success: true, message: "Token auth disimpan." });
    } catch (err) {
      console.error("❌ Gagal simpan tokenAuth:", err.message);
      res.status(500).json({ error: "Gagal menyimpan token auth" });
    }
  };  

exports.checkTokenAuth = async (req, res) => { 
  const courseId = req.params.id;
  const userId = req.query.user;

  try {
    const pool = await dbPromise;

    const [rows] = await pool.query(
      "SELECT * FROM tokenAuth WHERE course_id = ? AND user_id = ?",
      [courseId, userId]
    );

    if (rows.length > 0) {
      res.json({ isAuthorized: true });
    } else {
      res.json({ isAuthorized: false });
    }
  } catch (err) {
    console.error("❌ Gagal cek tokenAuth:", err.message);
    res.status(500).json({ message: "Server error saat cek token auth" });
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
  
    if (currentQuestion && currentAnswer && currentOptions.length >= 2) {
      soalList.push({
        soal: currentQuestion,
        opsi: currentOptions,
        jawaban: currentAnswer,
      });
    }
  
    return soalList;
  }
  