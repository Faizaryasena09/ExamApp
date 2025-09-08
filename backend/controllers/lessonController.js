const dbPromise = require('../models/database');

// Membuat lesson baru dalam sebuah course
exports.createLesson = async (req, res) => {
  const { course_id, title, content, section_order } = req.body;

  if (!course_id || !title || !content) {
    return res.status(400).json({ message: 'Course ID, title, dan content wajib diisi.' });
  }

  try {
    const db = await dbPromise;
    const [result] = await db.query(
      'INSERT INTO lessons (course_id, title, content, section_order) VALUES (?, ?, ?, ?)',
      [course_id, title, content, section_order || 0]
    );
    res.status(201).json({ message: 'Lesson berhasil dibuat', lessonId: result.insertId });
  } catch (err) {
    console.error('❌ Gagal membuat lesson:', err);
    res.status(500).json({ message: 'Gagal membuat lesson', error: err.message });
  }
};

// Mendapatkan semua lesson dari sebuah course
exports.getLessonsByCourse = async (req, res) => {
  const { courseId } = req.params;
  const { role, name } = req.cookies; // Get role and name from cookies

  try {
    const db = await dbPromise;

    // Permission check for students
    if (role === "siswa") {
      const [courseRows] = await db.query("SELECT kelas, hidden, tanggal_mulai, tanggal_selesai, waktu FROM courses WHERE id = ?", [courseId]);
      if (courseRows.length === 0) return res.status(404).json({ message: "Course tidak ditemukan." });

      const course = courseRows[0];
      if (course.hidden) return res.status(403).json({ message: "Course tersembunyi." });

      const [userRows] = await db.query("SELECT kelas FROM users WHERE name = ?", [name]);
      if (userRows.length === 0) return res.status(404).json({ message: "User siswa tidak ditemukan." });
      const studentKelas = String(userRows[0].kelas).toLowerCase().trim();

      let courseKelasParsed = [];
      try {
        courseKelasParsed = JSON.parse(course.kelas);
        if (!Array.isArray(courseKelasParsed)) {
          courseKelasParsed = [String(courseKelasParsed)];
        }
      } catch {
        courseKelasParsed = [String(course.kelas)];
      }

      const isStudentInCourseClass = courseKelasParsed.map(k => String(k).toLowerCase().trim()).includes(studentKelas);
      if (!isStudentInCourseClass) return res.status(403).json({ message: "Siswa tidak terdaftar di kelas ini." });

      // For exam courses, check dates (assuming 'waktu' implies an exam)
      if (course.waktu !== null && course.waktu !== undefined) {
        const now = new Date();
        const mulai = new Date(course.tanggal_mulai);
        const selesai = course.tanggal_selesai ? new Date(course.tanggal_selesai) : null;

        if (now < mulai) return res.status(403).json({ message: "Ujian belum dimulai." });
        if (selesai && now > selesai) return res.status(403).json({ message: "Ujian sudah berakhir." });
      }
    }

    // If authorized (admin, guru, or student passed checks), fetch lessons
    const [lessons] = await db.query(
      'SELECT * FROM lessons WHERE course_id = ? ORDER BY section_order ASC, created_at ASC',
      [courseId]
    );
    res.json(lessons);
  } catch (err) {
    console.error('❌ Gagal mengambil lessons:', err);
    res.status(500).json({ message: 'Gagal mengambil data lessons', error: err.message });
  }
};

// Mendapatkan satu lesson berdasarkan ID
exports.getLesson = async (req, res) => {
  const { lessonId } = req.params;

  try {
    const db = await dbPromise;
    const [lesson] = await db.query('SELECT * FROM lessons WHERE id = ?', [lessonId]);

    if (lesson.length === 0) {
      return res.status(404).json({ message: 'Lesson tidak ditemukan' });
    }
    res.json(lesson[0]);
  } catch (err) {
    console.error('❌ Gagal mengambil lesson:', err);
    res.status(500).json({ message: 'Gagal mengambil data lesson', error: err.message });
  }
};

// Memperbarui lesson
exports.updateLesson = async (req, res) => {
  const { lessonId } = req.params;
  const { title, content, section_order } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title dan content wajib diisi.' });
  }

  try {
    const db = await dbPromise;
    const [result] = await db.query(
      'UPDATE lessons SET title = ?, content = ?, section_order = ? WHERE id = ?',
      [title, content, section_order || 0, lessonId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lesson tidak ditemukan' });
    }
    res.json({ message: 'Lesson berhasil diperbarui' });
  } catch (err) {
    console.error('❌ Gagal memperbarui lesson:', err);
    res.status(500).json({ message: 'Gagal memperbarui lesson', error: err.message });
  }
};

// Menghapus lesson
exports.deleteLesson = async (req, res) => {
  const { lessonId } = req.params;

  try {
    const db = await dbPromise;
    const [result] = await db.query('DELETE FROM lessons WHERE id = ?', [lessonId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lesson tidak ditemukan' });
    }
    res.json({ message: 'Lesson berhasil dihapus' });
  } catch (err) {
    console.error('❌ Gagal menghapus lesson:', err);
    res.status(500).json({ message: 'Gagal menghapus lesson', error: err.message });
  }
};
