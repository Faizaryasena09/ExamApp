const db = require("../models/database");

// ✅ Ambil semua siswa + status online/offline
exports.getSiswaWithStatus = async (req, res) => {
  try {
    const conn = await db;

    const [siswa] = await conn.query("SELECT id, name, username, kelas FROM users WHERE role = 'siswa'");
    const [statusRows] = await conn.query("SELECT * FROM session_status");

    const siswaWithStatus = siswa.map((s) => {
      const status = statusRows.find((stat) => stat.name === s.username);
      return {
        ...s,
        status: status ? status.status : "offline",
        last_update: status ? status.last_update : null,
      };
    });

    res.json(siswaWithStatus);
  } catch (err) {
    console.error("❌ Gagal mengambil data siswa:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Reset jawaban siswa untuk course tertentu
exports.clearJawaban = async (req, res) => {
  const course_id = req.params.course_id;

  try {
    const conn = await db;
    await conn.query("DELETE FROM jawaban_trail WHERE course_id = ?", [course_id]);
    res.json({ message: "Jawaban sementara berhasil dihapus." });
  } catch (err) {
    console.error("❌ Gagal hapus jawaban:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Hapus timer (untuk reset waktu)
exports.deleteTimer = async (req, res) => {
  const { user_id, course_id } = req.body;

  try {
    const conn = await db;
    if (user_id && course_id) {
      await conn.query("DELETE FROM answertrail_timer WHERE user_id = ? AND course_id = ?", [user_id, course_id]);
    } else {
      await conn.query("DELETE FROM answertrail_timer");
    }
    res.json({ message: "Timer berhasil dihapus." });
  } catch (err) {
    console.error("❌ Gagal hapus timer:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔒 Lock login siswa (belum dipakai)
exports.lockLogin = async (req, res) => {
  const { user_id } = req.body;
  // Belum ada kolom 'locked' → nanti bisa tambahkan jika perlu
  res.status(501).json({ message: "Fitur ini belum tersedia" });
};

// 🔓 Unlock login siswa
exports.unlockLogin = async (req, res) => {
  const { user_id } = req.body;
  res.status(501).json({ message: "Fitur ini belum tersedia" });
};

// ⏱️ Tambah waktu ke siswa, kelas, atau semua
exports.addTimer = async (req, res) => {
  const { user_id, course_id, detik, kelas } = req.body;

  if (!course_id || !detik) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  try {
    const conn = await db;

    if (user_id) {
      await conn.query(`
        INSERT INTO answertrail_timer (user_id, course_id, waktu_tersisa)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE waktu_tersisa = waktu_tersisa + ?
      `, [user_id, course_id, detik, detik]);

    } else if (kelas) {
      const [siswa] = await conn.query("SELECT id FROM users WHERE role = 'siswa' AND kelas = ?", [kelas]);

      for (const s of siswa) {
        await conn.query(`
          INSERT INTO answertrail_timer (user_id, course_id, waktu_tersisa)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE waktu_tersisa = waktu_tersisa + ?
        `, [s.id, course_id, detik, detik]);
      }

    } else {
      const [semua] = await conn.query("SELECT id FROM users WHERE role = 'siswa'");
      for (const s of semua) {
        await conn.query(`
          INSERT INTO answertrail_timer (user_id, course_id, waktu_tersisa)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE waktu_tersisa = waktu_tersisa + ?
        `, [s.id, course_id, detik, detik]);
      }
    }

    res.json({ message: "Waktu berhasil ditambahkan." });
  } catch (err) {
    console.error("❌ Gagal menambah waktu:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
