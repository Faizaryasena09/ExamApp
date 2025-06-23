const db = require("../models/database");

exports.getAllUsers = async (req, res) => {
  const connection = await db;

  const { name } = req.query;

  try {
    if (name) {
      const [rows] = await connection.query("SELECT * FROM users WHERE name = ?", [name]);

      if (rows.length === 0) {
        return res.status(404).json({ error: "User tidak ditemukan" });
      }

      return res.json(rows[0]);
    } else {
      const [rows] = await connection.query("SELECT * FROM users");
      res.json(rows);
    }
  } catch (err) {
    console.error("❌ Gagal ambil data user:", err.message);
    res.status(500).json({ error: "Gagal ambil data user" });
  }
};

exports.createUser = async (req, res) => {
  const { name, username, password, role, kelas } = req.body;
  const connection = await db;
  await connection.query(`
    INSERT INTO users (name, username, password, role, kelas)
    VALUES (?, ?, SHA2(?, 256), ?, ?)
  `, [name, username, password || "1234", role, kelas]);
  res.json({ message: "User ditambahkan" });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, username, password, role, kelas } = req.body;
  const connection = await db;

  if (password) {
    await connection.query(`
      UPDATE users SET name=?, username=?, password=SHA2(?, 256), role=?, kelas=? WHERE id=?
    `, [name, username, password, role, kelas, id]);
  } else {
    await connection.query(`
      UPDATE users SET name=?, username=?, role=?, kelas=? WHERE id=?
    `, [name, username, role, kelas, id]);
  }

  res.json({ message: "User diperbarui" });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const connection = await db;

  try {
    await connection.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User dihapus" });
  } catch (err) {
    console.error("Gagal hapus user:", err.message);
    res.status(500).json({ error: "Gagal hapus user" });
  }
};

