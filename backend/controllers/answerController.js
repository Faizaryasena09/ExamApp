const init = require("../models/database");

exports.simpanJawaban = async (req, res) => {
  const db = await init;
  const { user_id, course_id, soal_id, jawaban } = req.body;

  if (!user_id || !course_id || !soal_id || !jawaban) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  try {
    await db.query(`
      INSERT INTO jawaban_siswa (user_id, course_id, soal_id, jawaban)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE jawaban = ?
    `, [user_id, course_id, soal_id, jawaban, jawaban]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Gagal simpan jawaban:", err);
    res.status(500).json({ error: "Gagal menyimpan jawaban" });
  }
};

exports.getJawabanUser = async (req, res) => {
    const course_id = req.params.course_id;
    const user_id = req.query.user_id;
  
    try {
      const db = await init;
  
      const [rows] = await db.query(
        "SELECT soal_id AS question_id, jawaban AS answer FROM jawaban_siswa WHERE course_id = ? AND user_id = ?",
        [course_id, user_id]
      );
  
      res.json(rows);
    } catch (err) {
      console.error("❌ Gagal ambil jawaban user:", err.message);
      res.status(500).json({ error: "Gagal mengambil jawaban user" });
    }
  };