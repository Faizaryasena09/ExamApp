const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");

const multer = require("multer");
const upload = multer({ dest: "uploads/" })

router.post("/", courseController.createCourse);
router.get("/", courseController.getCourses);
router.get("/:id", courseController.getCourseById);
router.put("/:id", courseController.updateCourse);
router.delete("/:id", courseController.deleteCourse);
router.post("/:id/questions/import", courseController.simpanSoal);
router.get("/:id/questions/get", courseController.ambilSoal);
router.post("/:id/upload-soal", upload.single("file"), courseController.uploadSoalDocx);
router.get("/:id/status", courseController.getCourseStatus);
router.post("/:id/validate-token", courseController.validateCourseToken);
router.post("/:id/submit", courseController.submitUjian);
router.get("/:id/questions", courseController.getQuestions);
router.post("/:id/questions/save", courseController.saveOrUpdateQuestions);
router.get("/analytics/:courseId", courseController.getAnalyticsByCourse);
router.get('/:courseId/userid/:name', courseController.getUserIdByName);
router.post("/tokenAuth", courseController.saveTokenAuth);
router.get("/:id/tokenAuth", courseController.checkTokenAuth);

module.exports = router;
