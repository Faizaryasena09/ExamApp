const init = require('../models/database');

exports.getUserExamResult = async (req, res) => {
  try {
    const db = await init;
    const { courseId, userId } = req.params;

    const [rows] = await db.query(`
      SELECT 
        q.id AS soal_id,
        q.soal,
        q.opsi,
        q.jawaban AS jawaban_benar,
        js.jawaban AS jawaban_siswa,
        u.name AS siswa_name
      FROM questions q
      LEFT JOIN jawaban_siswa js
        ON js.soal_id = q.id AND js.course_id = q.course_id AND js.user_id = ?
      LEFT JOIN users u
        ON u.id = ?
      WHERE q.course_id = ?
      ORDER BY q.id ASC
    `, [userId, userId, courseId]);

    res.json(rows);
  } catch (error) {
    console.error("❌ Error getUserExamResult:", error);
    res.status(500).json({ error: "Gagal mengambil hasil ujian." });
  }
};
