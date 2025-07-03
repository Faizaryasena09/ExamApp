const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

// --- Course Umum
router.post("/", onlyRole(["admin", "guru"]), courseController.createCourse);
router.get("/", courseController.getCourses);
router.get("/:id", courseController.getCourseById);
router.put("/:id", onlyRole(["admin", "guru"]), courseController.updateCourse);
router.delete("/:id", onlyRole(["admin", "guru"]), courseController.deleteCourse);

// --- Soal
router.post("/:id/questions/import", onlyRole(["admin", "guru"]), courseController.simpanSoal);
router.get("/:id/questions/get", courseController.ambilSoal);
router.get("/:id/questions", courseController.getQuestions);
router.post("/:id/questions/save", onlyRole(["admin", "guru"]), courseController.saveOrUpdateQuestions);

// ✅ GANTI: Upload PDF untuk parsing soal
router.post(
  "/:id/upload-soal",
  upload.single("file"),
  onlyRole(["admin", "guru"]),
  courseController.uploadSoalZip // ✅ Ganti dari uploadSoalDocx ke uploadSoalPdf
);

// --- Ujian & Token
router.post("/:id/validate-token", courseController.validateCourseToken);
router.post("/:id/submit", courseController.submitUjian);

// --- Analytics
router.get("/analytics/:courseId", courseController.getAnalyticsByCourse);

// --- Lainnya
router.get("/:id/status", courseController.getCourseStatus);
router.get('/:courseId/userid/:name', courseController.getUserIdByName);
router.post("/tokenAuth", courseController.saveTokenAuth);
router.get("/:id/tokenAuth", courseController.checkTokenAuth);
router.put("/:id/toggle-visibility", courseController.toggleVisibility);
router.post("/:id/duplicate", onlyRole(["admin", "guru"]), courseController.duplicateCourse);

module.exports = router;
