require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const dbPromise = require("./models/database"); // koneksi DB

const app = express();
const PORT = process.env.PORT || 5000;

const apacheConfPath = "/etc/apache2/sites-available/000-default.conf";
const apachePortsPath = "/etc/apache2/ports.conf";

// 🔹 Generate Apache config dari DB
// 🔹 Generate Apache config dari DB
async function generateApacheConfigs() {
  try {
    const db = await dbPromise;
    const [rows] = await db.query("SELECT web_ip, web_port FROM app_config LIMIT 1");
    const webIp = rows.length > 0 ? rows[0].web_ip : "localhost";
    const webPort = rows.length > 0 ? rows[0].web_port : 3000;

    const apacheConf = `
ServerName ${webIp}
<VirtualHost *:${webPort}>
    DocumentRoot "/var/www/html"
    <Directory "/var/www/html">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
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

    const portsConf = `
Listen ${webPort}
<IfModule ssl_module>
    Listen 443
</IfModule>
<IfModule mod_gnutls.c>
    Listen 443
</IfModule>
`;

    fs.writeFileSync(apacheConfPath, apacheConf);
    fs.writeFileSync(apachePortsPath, portsConf);

    // 🔹 Restart Apache agar config baru terbaca
    exec("apachectl -k restart", (err) => {
      if (err) console.error("❌ Gagal restart Apache:", err.message);
      else console.log(`🔄 Apache restart di port ${webPort}`);
    });

    return { webIp, webPort };
  } catch (err) {
    console.error("❌ generateApacheConfigs:", err);
    return { webIp: "localhost", webPort: 3000 };
  }
}


// 🔹 Setup CORS dinamis dari DB
async function setupCors() {
  const { webIp, webPort } = await generateApacheConfigs();
  const allowedOrigins = [
    `http://${webIp}:${webPort}`,
    "http://192.168.0.8:89",
    "http://10.221.102.192:89"
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Origin tidak diizinkan: " + origin));
    },
    credentials: true
  }));
}

// 🔹 Inisialisasi aplikasi
(async () => {
  await setupCors();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cookieParser());
  app.use("/api/uploads", express.static(path.join(__dirname, "public", "uploads")));

  // === ROUTES ===
  const authRoutes = require("./routes/authRoutes");
  const sessionRoutes = require("./routes/sessionRoutes");
  const userRoutes = require("./routes/userRoutes");
  const kelasRoutes = require("./routes/kelasRoutes");
  const courseRoutes = require("./routes/courseRoutes");
  const answerRoutes = require("./routes/answerRoutes");
  const dashboardRoutes = require("./routes/dashboardRoutes");
  const resultRoutes = require("./routes/resultRoutes");
  const answerTrailRoutes = require("./routes/answerTrailRoutes");
  const subfolderRoutes = require("./routes/subfolderRoutes");
  const checkRoutes = require("./routes/checkRoutes");
  const studentworklog = require("./routes/studentWorkLogRoutes");
  const examRoutes = require("./routes/examRoutes");
  const guruRoutes = require("./routes/guruRoutes");
  const uploadRoutes = require("./routes/uploadRoutes");
  const webMngRoutes = require("./routes/webMngRoutes");
  const ocrRoutes = require("./routes/ocrRoutes");
  const lessonRoutes = require("./routes/lessonRoutes");

  app.use("/api/exam", examRoutes);
  app.use("/api/studentworklog", studentworklog);
  app.use("/api/check", checkRoutes);
  app.use("/api/answertrail", answerTrailRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api", webMngRoutes);
  app.use("/api/jawaban", answerRoutes);
  app.use("/api", guruRoutes);
  app.use("/api", userRoutes);
  app.use("/api/session", sessionRoutes);
  app.use("/api/data/kelas", kelasRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api", dashboardRoutes);
  app.use("/api", resultRoutes);
  app.use("/api/subfolders", subfolderRoutes);
  app.use("/api", uploadRoutes);
  app.use("/api", ocrRoutes);
  app.use("/api/lessons", lessonRoutes);

  // === SERVICES ===
  const sessionController = require("./controllers/sessionController");
  sessionController.startAutoSessionChecker();

  const cleanUploads = require("./utils/cleanUploads");
  cleanUploads();
  setInterval(cleanUploads, 24 * 60 * 60 * 1000);

  app.listen(PORT, () => console.log(`🚀 Server berjalan pada port ${PORT}`));
})();
