const express = require("express");
const router = express.Router();
const controller = require("../controllers/answerTrailController");

router.post("/", controller.save);
router.get("/:course_id", controller.get);
router.delete("/:course_id", controller.clear);

module.exports = router;
