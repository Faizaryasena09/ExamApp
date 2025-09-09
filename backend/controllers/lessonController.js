const path = require('path');
const fs = require('fs');
const dbPromise = require('../models/database');
function saveBase64Image(base64String) {
  // Contoh: data:image/png;base64,iVBORw0...
  const matches = base64String.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) return null;

  const ext = matches[1].split('/')[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const filePath = path.join(__dirname, '../public/uploads/images', filename);

  fs.writeFileSync(filePath, buffer);

  return `/uploads/images/${filename}`;
}

// Ganti semua base64 image di HTML jadi link file
function processContentImages(content) {
  if (!content) return content;
  return content.replace(/<img[^>]+src="([^">]+)"/g, (match, src) => {
    if (src.startsWith('data:image')) {
      const newPath = saveBase64Image(src);
      return match.replace(src, newPath);
    }
    return match;
  });
}

// Membuat lesson baru dalam sebuah course
exports.createLesson = async (req, res) => {
  const { course_id, title, content, display_mode } = req.body;

  if (!course_id || !title) {
    return res.status(400).json({ message: 'Course ID dan title wajib diisi.' });
  }

  let connection;
  try {
    const db = await dbPromise;
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [maxOrderRow] = await connection.query(
      'SELECT MAX(section_order) as max_order FROM lessons WHERE course_id = ?',
      [course_id]
    );
    const newOrder = (maxOrderRow[0].max_order === null ? -1 : maxOrderRow[0].max_order) + 1;

    const [lessonResult] = await connection.query(
      'INSERT INTO lessons (course_id, title, section_order, display_mode) VALUES (?, ?, ?, ?)',
      [course_id, title, newOrder, display_mode || 'accordion']
    );
    const newLessonId = lessonResult.insertId;

    if (content && content.trim() !== '') {
      const processedContent = processContentImages(content);
      await connection.query(
        'INSERT INTO lesson_pages (lesson_id, title, content, page_order) VALUES (?, ?, ?, ?)',
        [newLessonId, title, processedContent, 0]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Lesson berhasil dibuat', lessonId: newLessonId });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Gagal membuat lesson:', err);
    res.status(500).json({ message: 'Gagal membuat lesson', error: err.message });
  } finally {
    if (connection) connection.release();
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

  if (!title) {
    return res.status(400).json({ message: 'Title wajib diisi.' });
  }

  let connection;
  try {
    const db = await dbPromise;
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      'UPDATE lessons SET title = ?, display_mode = ? WHERE id = ?',
      [title, display_mode || 'accordion', lessonId]
    );

    if (content !== undefined) {
      const processedContent = processContentImages(content);

      const [pageRows] = await connection.query(
        'SELECT id FROM lesson_pages WHERE lesson_id = ? AND page_order = 0',
        [lessonId]
      );

      if (pageRows.length > 0) {
        await connection.query(
          'UPDATE lesson_pages SET title = ?, content = ? WHERE lesson_id = ? AND page_order = 0',
          [title, processedContent, lessonId]
        );
      } else {
        await connection.query(
          'INSERT INTO lesson_pages (lesson_id, title, content, page_order) VALUES (?, ?, ?, 0)',
          [lessonId, title, processedContent]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Lesson berhasil diperbarui' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Gagal memperbarui lesson:', err);
    res.status(500).json({ message: 'Gagal memperbarui lesson', error: err.message });
  } finally {
    if (connection) connection.release();
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
  
    let connection;
    try {
      const db = await dbPromise;
      connection = await db.getConnection();
      await connection.beginTransaction();
  
      // Use Promise.all to run all updates in parallel for efficiency
      const updatePromises = orderedIds.map((lessonId, index) => {
        const newOrder = index;
        return connection.query(
          'UPDATE lessons SET section_order = ? WHERE id = ? AND course_id = ?',
          [newOrder, lessonId, course_id]
        );
      });
      
      await Promise.all(updatePromises);
  
      await connection.commit();
      res.json({ message: 'Urutan lesson berhasil diperbarui.' });
    } catch (err) {
      if (connection) await connection.rollback();
      console.error('❌ Gagal mengurutkan lesson:', err);
      res.status(500).json({ message: 'Gagal mengurutkan lesson', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  };
