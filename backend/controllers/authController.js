const db = require("../models/database");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "rahasia_super_aman";

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const connection = await db;

    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE username = ? AND password = SHA2(?, 256)",
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    const user = rows[0];

    // ✅ Cek apakah akun dikunci
    if (user.login_locked === 1) {
      return res.status(403).json({ message: "Akun dikunci oleh admin" });
    }

    const token = jwt.sign(
      {
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      user_id: user.id,
      name: user.name,
      role: user.role,
      token: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.isLogin = async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Parameter 'name' wajib diisi." });
  }

  try {
    const connection = await db; // ✅ tunggu koneksi
    const [rows] = await connection.execute(
      "SELECT * FROM session_status WHERE name = ?",
      [name]
    );

    if (rows.length === 0) {
      return res.status(200).json({ status: "offline" });
    }

    return res.status(200).json({
      status: rows[0].status,
      lastUpdate: rows[0].updated_at,
    });
  } catch (err) {
    console.error("❌ Gagal cek isLogin:", err);
    res.status(500).json({ error: "Terjadi kesalahan di server." });
  }
};
