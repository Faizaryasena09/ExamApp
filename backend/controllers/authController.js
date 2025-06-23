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
