const express = require("express");
const router = express.Router();
const { login, isLogin } = require("../controllers/authController");

router.post("/login", login);
router.get("/islogin", isLogin);

module.exports = router;
