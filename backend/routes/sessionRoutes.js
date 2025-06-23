const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");

router.post("/", sessionController.updateSessionStatus);

module.exports = router;
