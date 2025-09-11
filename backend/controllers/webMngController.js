const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const dbPromise = require("../models/database");

const apacheConfPath = "/etc/apache2/sites-available/000-default.conf";
const apachePortsPath = "/etc/apache2/ports.conf";
const envPath = path.resolve(__dirname, "../.env")

const ensureUploadDir = () => {
  const dir = path.join(__dirname, "../public/uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 🔹 Generator file Apache
function generateApacheConf(webIp, webPort) {
  return `
ServerName ${webIp}

LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so

<VirtualHost *:${webPort}>
    DocumentRoot "/var/www/html"

    <Directory "/var/www/html">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        LimitRequestBody 104857600
        RewriteEngine On
        RewriteCond %{REQUEST_URI} !^/api
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
  `;
}

// Fungsi generate ports.conf
function generatePortsConf(webPort) {
  return `
Listen ${webPort}
<IfModule ssl_module>
    Listen 443
</IfModule>
<IfModule mod_gnutls.c>
    Listen 443
</IfModule>
  `;
}

// 🔹 Update Dockerfile EXPOSE
function updateDockerExpose(webPort) {
  if (!fs.existsSync(dockerfilePath)) return;

  let dockerfileContent = fs.readFileSync(dockerfilePath, "utf8");

  if (dockerfileContent.match(/^EXPOSE\s+\d+/m)) {
    dockerfileContent = dockerfileContent.replace(/^EXPOSE\s+\d+/m, `EXPOSE ${webPort}`);
  } else {
    dockerfileContent += `\nEXPOSE ${webPort}\n`;
  }

  fs.writeFileSync(dockerfilePath, dockerfileContent);
}

exports.getAppConfig = (req, res) => {
  try {
    const envPath = path.resolve(__dirname, "../.env");
    const envFileContent = fs.readFileSync(envPath, { encoding: "utf8" });
    const webIp = envFileContent.match(/^WEB_IP=(.*)$/m);
    const webPort = envFileContent.match(/^WEB_PORT=(.*)$/m);

    res.json({
      webIp: webIp ? webIp[1] : "localhost",
      webPort: webPort ? webPort[1] : "3000",
    });
  } catch (err) {
    console.error("❌ getAppConfig:", err);
    res.status(500).json({ message: "Gagal mengambil konfigurasi aplikasi", error: err.message });
  }
};

exports.updateAppConfig = async (req, res) => {
  try {
    const { webIp, webPort } = req.body;
    const envPath = path.resolve(__dirname, "../.env");
    const db = await dbPromise;

    // 🔹 Simpan ke DB
    const [rows] = await db.query("SELECT * FROM app_config LIMIT 1");
    if (rows.length > 0) {
      await db.query("UPDATE app_config SET web_ip = ?, web_port = ? WHERE id = ?", [
        webIp, webPort, rows[0].id
      ]);
    } else {
      await db.query("INSERT INTO app_config (web_ip, web_port) VALUES (?, ?)", [
        webIp, webPort
      ]);
    }

    // 🔹 Simpan ke .env
    let envFileContent = fs.readFileSync(envPath, "utf8");
    envFileContent = envFileContent
      .replace(/^WEB_IP=.*$/m, `WEB_IP=${webIp}`)
      .replace(/^WEB_PORT=.*$/m, `WEB_PORT=${webPort}`);

    // Jika tidak ada, tambahkan
    if (!envFileContent.includes("WEB_IP=")) {
      envFileContent += `\nWEB_IP=${webIp}`;
    }
    if (!envFileContent.includes("WEB_PORT=")) {
      envFileContent += `\nWEB_PORT=${webPort}`;
    }

    fs.writeFileSync(envPath, envFileContent);

    // 🔹 Restart Apache2 dan PM2 (cocok untuk Docker container)
    // Pastikan proses apache dan pm2 berjalan di container yang sama
    const restartApache = () => {
      return new Promise((resolve, reject) => {
        exec('apachectl -k graceful', (error, stdout, stderr) => {
          if (error) {
            console.error("❌ Apache restart failed:", error);
            reject({ error, stderr });
          } else {
            console.log("✅ Apache restarted successfully");
            resolve(stdout);
          }
        });
      });
    };

    const restartPM2 = () => {
      return new Promise((resolve, reject) => {
        exec('pm2 restart backend', (error, stdout, stderr) => {
          if (error) {
            console.warn("⚠️ PM2 restart failed, trying to start...");
            exec('pm2 start /app/backend/server.js --name backend', (error2, stdout2, stderr2) => {
              if (error2) {
                console.error("❌ PM2 start failed:", error2);
                reject({ error: error2, stderr: stderr2 });
              } else {
                console.log("✅ PM2 started successfully");
                resolve(stdout2);
              }
            });
          } else {
            console.log("✅ PM2 restarted successfully");
            resolve(stdout);
          }
        });
      });
    };

    // Jalankan restart secara berurutan
    await restartApache();
    await restartPM2();

    res.json({
      message: `✅ Config tersimpan & Rushlesserver jalan di ${webIp}:${webPort}`,
      restarted: ["apache2", "pm2-backend"]
    });

  } catch (err) {
    console.error("❌ updateAppConfig:", err);
    res.status(500).json({ 
      message: "Gagal update config atau restart service", 
      error: err.message 
    });
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

    if (!['assessment', 'lesson', 'multi'].includes(mode)) {
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
