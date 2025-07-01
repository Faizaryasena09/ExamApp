const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { streamSession } = require("../controllers/examSSE");

router.get("/siswa", examController.getSiswaWithStatus);
router.delete("/reset/:course_id", examController.resetUjian);
router.post("/logout-user", examController.logoutUser);
router.post("/lock-user", examController.lockLogin);
router.post("/unlock-user", examController.unlockLogin);
router.post("/add-timer", examController.addTimer);
router.post("/reset-kelas", examController.resetUjianByKelas);
router.post("/reset-semua", examController.resetSemuaMengerjakan);
router.post("/unlock-all", examController.unlockAllUsers);
router.post("/status", examController.setStatusUjian);
router.get("/session/stream", streamSession);

module.exports = router;
