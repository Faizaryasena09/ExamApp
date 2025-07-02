const express = require("express");
const router = express.Router();
const webMngController = require("../controllers/webMngController");
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

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

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Format file tidak didukung"), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

router.get("/web-settings", webMngController.getSettings);
router.put("/web-settings", onlyRole("admin"), upload.single("logo"), authMiddleware, webMngController.updateSettings);
router.get("/db/tables", onlyRole("admin"), authMiddleware, webMngController.getAllTables);
router.delete("/db/:tableName", onlyRole("admin"), authMiddleware, webMngController.deleteTable);
router.post("/db/reset", onlyRole("admin"), authMiddleware, webMngController.resetDatabase);
router.post("/restart-server", onlyRole("admin"), authMiddleware, webMngController.restartServer);

module.exports = router;
