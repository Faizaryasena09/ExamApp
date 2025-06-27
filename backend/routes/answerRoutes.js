const express = require("express");
const router = express.Router();
const answerController = require("../controllers/answerController");

router.get("/show-result", answerController.cekTampilkanHasil);
router.post("/", answerController.simpanJawaban);
router.get("/:course_id", answerController.getJawabanUser);
router.get("/last-attempt", answerController.getLastAttempt);


module.exports = router;
