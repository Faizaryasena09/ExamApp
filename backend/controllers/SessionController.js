const db = require("../models/database");

exports.updateSessionStatus = async (req, res) => {
  const { name, status } = req.body;

  if (!name || !["online", "offline"].includes(status)) {
    return res.status(400).json({ message: "Data tidak valid" });
  }

  try {
    const connection = await db;

    const [rows] = await connection.query("SELECT * FROM session_status WHERE name = ?", [name]);

    if (rows.length > 0) {
      await connection.query("UPDATE session_status SET status = ? WHERE name = ?", [status, name]);
    } else {
      await connection.query("INSERT INTO session_status (name, status) VALUES (?, ?)", [name, status]);
    }

    res.json({ message: `Status ${name} diubah ke ${status}` });
  } catch (err) {
    console.error("❌ Gagal update status:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
