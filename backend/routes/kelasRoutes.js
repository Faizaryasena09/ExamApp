const express = require("express");
const router = express.Router();
const kelasController = require("../controllers/kelasController");

router.post("/", kelasController.tambahKelas);
router.get("/", kelasController.getSemuaKelas);
router.delete("/:id", kelasController.hapusKelas);
router.put("/:id", kelasController.ubahKelas);

module.exports = router;
