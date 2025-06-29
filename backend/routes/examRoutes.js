const express = require("express");
const router = express.Router();
const controller = require("../controllers/examController");

router.get("/siswa", controller.getSiswaWithStatus);
router.delete("/reset/:course_id", controller.clearJawaban);
router.delete("/timer-delete", controller.deleteTimer);
router.post("/lock", controller.lockLogin);
router.post("/unlock", controller.unlockLogin);
router.post("/add-timer", controller.addTimer);

module.exports = router;
