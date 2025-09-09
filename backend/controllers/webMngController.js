const dbPromise = require("../models/database");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ensureUploadDir = () => {
  const dir = path.join(__dirname, "../public/uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

exports.getSettings = async (req, res) => {
    try {
      const db = await dbPromise;
      const [rows] = await db.query("SELECT * FROM web_settings LIMIT 1");
      res.json(rows[0] || {});
    } catch (err) {
      console.error("❌ getSettings:", err);
      res.status(500).json({ message: "Gagal mengambil pengaturan", error: err.message });
    }
  };
  
  exports.updateSettings = async (req, res) => {
    try {
      const db = await dbPromise;
      const { judul } = req.body;
      let logoPath = null;
  
      ensureUploadDir();
  
      if (req.file && req.file.filename) {
        logoPath = `/uploads/${req.file.filename}`;
      }
  
      const [existing] = await db.query("SELECT * FROM web_settings LIMIT 1");
  
      if (existing.length > 0) {
        const current = existing[0];
  
        if (logoPath && current.logo && current.logo.startsWith("/uploads/")) {
          const oldPath = path.join(__dirname, "../public", current.logo);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
  
        await db.query("UPDATE web_settings SET judul = ?, logo = ? WHERE id = ?", [
          judul,
          logoPath || current.logo,
          current.id,
        ]);
      } else {
        await db.query("INSERT INTO web_settings (judul, logo) VALUES (?, ?)", [
          judul,
          logoPath,
        ]);
      }
  
      res.json({ message: "Pengaturan berhasil disimpan" });
    } catch (err) {
      console.error("❌ updateSettings:", err);
      res.status(500).json({ message: "Gagal menyimpan pengaturan", error: err.message });
    }
  };

exports.getAllTables = async (req, res) => {
  try {
    const db = await dbPromise;
    const [tables] = await db.query("SHOW TABLES");
    const tableNames = tables.map((row) => Object.values(row)[0]);
    res.json({ tables: tableNames });
  } catch (err) {
    console.error("❌ getAllTables:", err);
    res.status(500).json({ message: "Gagal mengambil tabel", error: err.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const db = await dbPromise;
    const { tableName } = req.params;
    await db.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    res.json({ message: `Tabel ${tableName} berhasil dihapus` });
  } catch (err) {
    console.error("❌ deleteTable:", err);
    res.status(500).json({ message: "Gagal menghapus tabel", error: err.message });
  }
};

exports.resetDatabase = async (req, res) => {
  try {
    const db = await dbPromise;
    const [tables] = await db.query("SHOW TABLES");
    let tableNames = tables.map((row) => Object.values(row)[0]);

    // Exclude web_settings from being truncated
    tableNames = tableNames.filter(table => table !== 'web_settings');

    await db.query("SET FOREIGN_KEY_CHECKS = 0;");

    for (const table of tableNames) {
      // Use TRUNCATE TABLE to empty the table
      await db.query(`TRUNCATE TABLE 
${table}
`);
    }

    await db.query("SET FOREIGN_KEY_CHECKS = 1;");

    // Re-insert the default admin user
    await db.query(`
      INSERT INTO users (username, password, role, name)
      VALUES ('admin', SHA2('admin', 256), 'admin', 'Administrator')
    `);

    res.json({ message: "Database berhasil direset (data dikosongkan)" });
  } catch (err) {
    console.error("❌ resetDatabase:", err);
    res.status(500).json({ message: "Gagal reset database", error: err.message });
  }
};

exports.restartServer = (req, res) => {
  exec("pm2 restart all", (error, stdout, stderr) => {
    if (error) {
      console.error("❌ restartServer:", error);
      return res.status(500).json({ message: "Restart gagal", error: error.message });
    }
    res.json({ message: "Server berhasil direstart", output: stdout });
  });
};

exports.getAppMode = async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.query("SELECT app_mode FROM web_settings LIMIT 1");

    if (rows.length === 0 || !rows[0].app_mode) {
      return res.json({ needsSetup: true });
    }

    res.json({ mode: rows[0].app_mode });
  } catch (err) {
    console.error("❌ getAppMode:", err);
    res.status(500).json({ message: "Gagal mengambil mode aplikasi", error: err.message });
  }
};

exports.setAppMode = async (req, res) => {
  try {
    const db = await dbPromise;
    const { mode } = req.body;

    if (!['assessment', 'lesson', 'hybrid'].includes(mode)) {
      return res.status(400).json({ message: "Mode tidak valid" });
    }

    const [existing] = await db.query("SELECT * FROM web_settings LIMIT 1");

    if (existing.length > 0) {
      await db.query("UPDATE web_settings SET app_mode = ? WHERE id = ?", [mode, existing[0].id]);
    } else {
      await db.query("INSERT INTO web_settings (app_mode) VALUES (?)", [mode]);
    }

    res.json({ message: `Mode aplikasi berhasil diatur ke ${mode}` });
  } catch (err) {
    console.error("❌ setAppMode:", err);
    res.status(500).json({ message: "Gagal mengatur mode aplikasi", error: err.message });
  }
};
