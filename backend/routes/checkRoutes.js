const express = require("express");
const router = express.Router();
const checkController = require("../controllers/checkController");

router.get("/hasil", checkController.checkHasil);
router.get("/course-access", checkController.checkCourseAccess);

module.exports = router;
