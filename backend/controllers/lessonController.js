const dbPromise = require('../models/database');

// Membuat lesson baru dalam sebuah course
exports.createLesson = async (req, res) => {
  const { course_id, title, content, display_mode } = req.body;

  if (!course_id || !title) {
    return res.status(400).json({ message: 'Course ID dan title wajib diisi.' });
  }

  let db;
  try {
    db = await dbPromise;
    await db.beginTransaction();

    // Get the new section order
    const [maxOrderRow] = await db.query(
      'SELECT MAX(section_order) as max_order FROM lessons WHERE course_id = ?',
      [course_id]
    );
    const newOrder = (maxOrderRow[0].max_order === null ? -1 : maxOrderRow[0].max_order) + 1;

    // Insert into lessons table (without content)
    const [lessonResult] = await db.query(
      'INSERT INTO lessons (course_id, title, section_order, display_mode) VALUES (?, ?, ?, ?)',
      [course_id, title, newOrder, display_mode || 'accordion']
    );
    const newLessonId = lessonResult.insertId;

    // Insert into lesson_pages table with the content, if content is provided
    if (content && content.trim() !== '') {
      await db.query(
        'INSERT INTO lesson_pages (lesson_id, title, content, page_order) VALUES (?, ?, ?, ?)',
        [newLessonId, title, content, 0] // Use lesson title as page title, page_order 0
      );
    }

    await db.commit();
    res.status(201).json({ message: 'Lesson berhasil dibuat', lessonId: newLessonId });
  } catch (err) {
    if (db) await db.rollback();
    console.error('❌ Gagal membuat lesson:', err);
    res.status(500).json({ message: 'Gagal membuat lesson', error: err.message });
  }
};

// Mendapatkan semua lesson dari sebuah course
exports.getLessonsByCourse = async (req, res) => {
  const { courseId } = req.params;
  const { role, name } = req.cookies;

  try {
    const db = await dbPromise;

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
        if (!Array.isArray(courseKelasParsed)) courseKelasParsed = [String(courseKelasParsed)];
      } catch {
        courseKelasParsed = [String(course.kelas)];
      }

      const isStudentInCourseClass = courseKelasParsed.map(k => String(k).toLowerCase().trim()).includes(studentKelas);
      if (!isStudentInCourseClass) return res.status(403).json({ message: "Siswa tidak terdaftar di kelas ini." });

      if (course.waktu !== null && course.waktu !== undefined) {
        const now = new Date();
        const mulai = new Date(course.tanggal_mulai);
        const selesai = course.tanggal_selesai ? new Date(course.tanggal_selesai) : null;
        if (now < mulai) return res.status(403).json({ message: "Ujian belum dimulai." });
        if (selesai && now > selesai) return res.status(403).json({ message: "Ujian sudah berakhir." });
      }
    }

    const query = `
      SELECT 
        l.id,
        l.course_id,
        l.title,
        l.section_order,
        l.display_mode,
        l.created_at,
        l.updated_at,
        (SELECT lp.content FROM lesson_pages lp WHERE lp.lesson_id = l.id ORDER BY lp.page_order ASC LIMIT 1) as content
      FROM lessons l
      WHERE l.course_id = ?
      ORDER BY l.section_order ASC, l.created_at ASC
    `;

    const [lessons] = await db.query(query, [courseId]);
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
  const { title, content, display_mode } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title dan content wajib diisi.' });
  }

  try {
    const db = await dbPromise;
    const [result] = await db.query(
      'UPDATE lessons SET title = ?, content = ?, display_mode = ? WHERE id = ?',
      [title, content, display_mode || 'accordion', lessonId]
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

// Mengurutkan ulang lesson
exports.reorderLessons = async (req, res) => {
    const { course_id, orderedIds } = req.body;
  
    if (!course_id || !Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'Course ID dan array orderedIds wajib diisi.' });
    }
  
    let db;
    try {
      db = await dbPromise;
      await db.beginTransaction();
  
      for (let i = 0; i < orderedIds.length; i++) {
        const lessonId = orderedIds[i];
        const newOrder = i;
        await db.query(
          'UPDATE lessons SET section_order = ? WHERE id = ? AND course_id = ?',
          [newOrder, lessonId, course_id]
        );
      }
  
      await db.commit();
      res.json({ message: 'Urutan lesson berhasil diperbarui.' });
    } catch (err) {
      if (db) await db.rollback();
      console.error('❌ Gagal mengurutkan lesson:', err);
      res.status(500).json({ message: 'Gagal mengurutkan lesson', error: err.message });
    }
  };
