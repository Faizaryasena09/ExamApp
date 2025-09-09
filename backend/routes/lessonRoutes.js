const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const authMiddleware = require('../middlewares/authMiddleware');
const onlyRole = require('../middlewares/onlyRole');

// Semua pengguna yang terautentikasi (siswa, guru, admin) bisa melihat lesson
router.get('/course/:courseId', authMiddleware, lessonController.getLessonsByCourse);
router.get('/:lessonId', authMiddleware, lessonController.getLesson);
router.post('/', authMiddleware, onlyRole(["admin", "guru"]), lessonController.createLesson);
router.put('/:lessonId', authMiddleware, onlyRole(["admin", "guru"]), lessonController.updateLesson);
router.delete('/:lessonId', authMiddleware, onlyRole(["admin", "guru"]), lessonController.deleteLesson);

// Rute baru untuk reordering
router.post('/reorder', authMiddleware, onlyRole(["admin", "guru"]), lessonController.reorderLessons);

module.exports = router;
