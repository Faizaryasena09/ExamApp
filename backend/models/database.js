require('dotenv').config();

const mysql = require("mysql2/promise");

const DB_NAME = process.env.DB_NAME;

const serverPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDatabase() {
  try {
    await serverPool.query(`CREATE DATABASE IF NOT EXISTS 
${DB_NAME}
`);
    console.log("✅ Database dicek/dibuat");

    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
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
        kelas VARCHAR(50),
        login_locked BOOLEAN DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_status (
        user_id INT(11) NOT NULL,
        status ENUM('online', 'offline') NOT NULL,
        last_update DATETIME NOT NULL,
        PRIMARY KEY (user_id)
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
        minWaktuSubmit INT DEFAULT 0,
    
        logPengerjaan BOOLEAN DEFAULT FALSE,       -- ✅ Tambahan baru
        analisisJawaban BOOLEAN DEFAULT FALSE,     -- ✅ Tambahan baru
    
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
      CREATE TABLE IF NOT EXISTS student_work_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100),
        course_id INT,
        soal_id INT,
        jawaban VARCHAR(255),
        attemp INT DEFAULT 1,
        waktu INT, -- ⬅️ waktu dari awal ujian, dalam detik
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        jawaban VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
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
        total_penambahan_waktu INT DEFAULT 0,
        PRIMARY KEY (user_id, course_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS guru_kelas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guru_id INT NOT NULL,
        kelas VARCHAR(50) NOT NULL,
        UNIQUE KEY (guru_id, kelas)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        judul VARCHAR(255),
        logo VARCHAR(255)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        section_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS status_ujian (
        user_id INT,
        course_id INT,
        status VARCHAR(30) DEFAULT 'belum mengerjakan',
        PRIMARY KEY (user_id, course_id)
      )
    `);

    // MIGRASI: Tambah kolom app_mode ke tabel web_settings
    const [webSettingsColumns] = await pool.query("SHOW COLUMNS FROM web_settings LIKE 'app_mode'");
    if (webSettingsColumns.length === 0) {
      await pool.query("ALTER TABLE web_settings ADD COLUMN app_mode VARCHAR(50) DEFAULT NULL");
      console.log("✅ Migrasi: Kolom 'app_mode' ditambahkan ke tabel 'web_settings'.");
    }

    // MIGRASI: Tambah kolom tipe_soal ke tabel questions
    const [questionsColumns] = await pool.query("SHOW COLUMNS FROM questions LIKE 'tipe_soal'");
    if (questionsColumns.length === 0) {
      await pool.query("ALTER TABLE questions ADD COLUMN tipe_soal VARCHAR(20) DEFAULT 'pilihan_ganda'");
      console.log("✅ Migrasi: Kolom 'tipe_soal' ditambahkan ke tabel 'questions'.");
    }

    // MIGRASI: Ubah tipe kolom jawaban di jawaban_siswa menjadi TEXT
    const [jawabanSiswaColumns] = await pool.query("SHOW COLUMNS FROM jawaban_siswa WHERE Field = 'jawaban' AND Type LIKE 'varchar(5)'");
    if (jawabanSiswaColumns.length > 0) {
      await pool.query("ALTER TABLE jawaban_siswa MODIFY COLUMN jawaban TEXT");
      console.log("✅ Migrasi: Tipe kolom 'jawaban' di 'jawaban_siswa' diubah menjadi TEXT.");
    }

    // MIGRASI: Ubah tipe kolom jawaban di jawaban_trail menjadi TEXT
    const [jawabanTrailColumns] = await pool.query("SHOW COLUMNS FROM jawaban_trail WHERE Field = 'jawaban' AND Type LIKE 'varchar(5)'");
    if (jawabanTrailColumns.length > 0) {
      await pool.query("ALTER TABLE jawaban_trail MODIFY COLUMN jawaban TEXT");
      console.log("✅ Migrasi: Tipe kolom 'jawaban' di 'jawaban_trail' diubah menjadi TEXT.");
    }

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
