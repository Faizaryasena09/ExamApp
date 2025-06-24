const dbPromise = require("../models/database");

exports.save = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id, soal_id, jawaban } = req.body;

  if (!user_id || !course_id || !soal_id || !jawaban) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  try {
    await db.query(`
      INSERT INTO jawaban_trail (user_id, course_id, soal_id, jawaban)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE jawaban = ?
    `, [user_id, course_id, soal_id, jawaban, jawaban]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error simpan trail:", err.message);
    res.status(500).json({ error: "Gagal simpan jawaban trail" });
  }
};

exports.get = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.query;
  const { course_id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT soal_id AS question_id, jawaban AS answer
      FROM jawaban_trail
      WHERE user_id = ? AND course_id = ?
    `, [user_id, course_id]);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error ambil trail:", err.message);
    res.status(500).json({ error: "Gagal ambil jawaban trail" });
  }
};

exports.clear = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.query;
  const { course_id } = req.params;

  try {
    await db.query(`
      DELETE FROM jawaban_trail
      WHERE user_id = ? AND course_id = ?
    `, [user_id, course_id]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error hapus trail:", err.message);
    res.status(500).json({ error: "Gagal hapus trail" });
  }
};
