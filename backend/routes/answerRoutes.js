const express = require("express");
const router = express.Router();
const answerController = require("../controllers/answerController");

router.post("/", answerController.simpanJawaban);
router.get("/:course_id", answerController.getJawabanUser);

module.exports = router;
