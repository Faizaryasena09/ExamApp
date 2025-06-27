const mysql = require("mysql2/promise");

const DB_NAME = "senexamapp";

const serverPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1234",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDatabase() {
  try {
    await serverPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    console.log("✅ Database dicek/dibuat");

    const pool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "1234",
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'siswa', 'guru') DEFAULT 'siswa',
        kelas VARCHAR(50)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        status ENUM('online', 'offline') DEFAULT 'offline',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subfolders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        position INT NOT NULL DEFAULT 0,
        hidden BOOLEAN DEFAULT FALSE
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        pengajar_id VARCHAR(100) NOT NULL,
        pengajar VARCHAR(100) NOT NULL,
        kelas TEXT NOT NULL,
        tanggal_mulai VARCHAR(100) NOT NULL,
        tanggal_selesai VARCHAR(100) DEFAULT NULL,
        waktu INT DEFAULT NULL,
        deskripsi TEXT,
    
        maxPercobaan INT DEFAULT 1,
        tampilkanHasil BOOLEAN DEFAULT FALSE,
        useToken BOOLEAN DEFAULT FALSE,
        tokenValue VARCHAR(6),
        tokenCreatedAt DATETIME,
    
        acakSoal BOOLEAN DEFAULT FALSE,
        acakJawaban BOOLEAN DEFAULT FALSE,
        minWaktuSubmit INT DEFAULT 0,  -- ✅ tambahan baru
    
        subfolder_id INT DEFAULT NULL,
        hidden BOOLEAN DEFAULT FALSE,
    
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subfolder_id)
          REFERENCES subfolders(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    `);    
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kelas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_kelas VARCHAR(100) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jawaban_siswa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        soal_id INT NOT NULL,
        jawaban VARCHAR(5),
        attemp INT NOT NULL,
        durasi_pengerjaan INT DEFAULT NULL, -- dalam detik, opsional
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_jawaban (user_id, course_id, soal_id, attemp)
      )
    `);       

    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        soal TEXT NOT NULL,
        opsi JSON NOT NULL,
        jawaban CHAR(1) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokenAuth (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        user_id INT NOT NULL,
        UNIQUE KEY unique_auth (course_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jawaban_trail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        course_id INT,
        soal_id INT,
        jawaban VARCHAR(5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        attemp INT DEFAULT 1,
        UNIQUE KEY (user_id, course_id, soal_id, attemp)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS answertrail_timer (
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        waktu_tersisa INT DEFAULT NULL, -- dalam detik
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, course_id)
      )
    `);

    const [rows] = await pool.query("SELECT * FROM users WHERE username = 'admin'");
    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO users (username, password, role, name)
        VALUES ('admin', SHA2('admin', 256), 'admin', 'Administrator')
      `);
      console.log("✅ User admin default dibuat");
    } else {
      console.log("ℹ️ User admin sudah ada");
    }

    return pool;
  } catch (err) {
    console.error("❌ Gagal inisialisasi database:", err.message);
    process.exit(1);
  }
}

module.exports = (async () => await initDatabase())();
