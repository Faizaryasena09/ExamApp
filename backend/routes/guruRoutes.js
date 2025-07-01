const express = require("express");
const router = express.Router();
const guruController = require("../controllers/guruController");

router.get("/gurus", guruController.getAllGuru);
router.get("/kelas", guruController.getAllKelas);
router.get("/guru-kelas", guruController.getGuruKelas);
router.post("/guru-kelas", guruController.setGuruKelas);
router.get("/guru-kelas/nama/:nama", guruController.getKelasByNamaGuru);

module.exports = router;
