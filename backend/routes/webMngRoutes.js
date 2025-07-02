const express = require("express");
const router = express.Router();
const webMngController = require("../controllers/webMngController");
const multer = require("multer");
const path = require("path");

// ✅ Simpan file ke folder /uploads (bukan public/uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.random().toString(36).substring(2, 8);
    cb(null, unique + ext);
  },
});

// ✅ Filter hanya gambar
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Format file tidak didukung"), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

// === ROUTE ===

// Web Settings
router.get("/web-settings", webMngController.getSettings);
router.put("/web-settings", upload.single("logo"), webMngController.updateSettings);

// Database actions
router.get("/db/tables", webMngController.getAllTables);
router.delete("/db/:tableName", webMngController.deleteTable);
router.post("/db/reset", webMngController.resetDatabase);

// Restart server
router.post("/restart-server", webMngController.restartServer);

module.exports = router;
