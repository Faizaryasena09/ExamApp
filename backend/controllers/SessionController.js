const db = require("../models/database");

exports.updateSessionStatus = async (req, res) => {
  const { name, status } = req.body;

  if (!name || !["online", "offline"].includes(status)) {
    return res.status(400).json({ message: "Data tidak valid" });
  }

  try {
    const connection = await db;
    const now = new Date();

    const [rows] = await connection.query(
      "SELECT * FROM session_status WHERE name = ?",
      [name]
    );

    if (rows.length > 0) {
      await connection.query(
        "UPDATE session_status SET status = ?, last_update = ? WHERE name = ?",
        [status, now, name]
      );
    } else {
      await connection.query(
        "INSERT INTO session_status (name, status, last_update) VALUES (?, ?, ?)",
        [name, status, now]
      );
    }

    res.json({ message: `Status ${name} diubah ke ${status}` });
  } catch (err) {
    console.error("❌ Gagal update status:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔁 Fungsi Auto-Update (jalankan saat app start)
exports.startAutoSessionChecker = () => {
  setInterval(async () => {
    try {
      const connection = await db;
      const [rows] = await connection.query(
        "SELECT name, last_update FROM session_status WHERE status = 'online'"
      );

      const now = new Date();
      for (let row of rows) {
        const lastUpdate = new Date(row.last_update);
        const diffMinutes = (now - lastUpdate) / (1000 * 60);

        if (diffMinutes > 20) {
          console.log(`⏳ Auto set offline: ${row.name}`);
          await connection.query(
            "UPDATE session_status SET status = 'offline' WHERE name = ?",
            [row.name]
          );
        }
      }
    } catch (err) {
      console.error("❌ Gagal auto update session:", err.message);
    }
  }, 5 * 60 * 1000); // setiap 5 menit
};
