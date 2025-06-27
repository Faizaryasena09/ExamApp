const express = require("express");
const router = express.Router();
const controller = require("../controllers/answerTrailController");

router.get("/timer-get", controller.getTimer);
router.delete("/timer-delete", controller.deleteTimer);
router.post("/", controller.save);
router.get("/:course_id", controller.get);
router.delete("/:course_id", controller.clear);
router.post("/save-timer", controller.saveWaktuSisa);
router.post("/timer-save", controller.updateTimer);

module.exports = router;
