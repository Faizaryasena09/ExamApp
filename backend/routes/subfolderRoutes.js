const express = require("express");
const router = express.Router();
const subfolderController = require("../controllers/subfolderController");

router.get("/", subfolderController.getSubfolders);
router.post("/", subfolderController.createSubfolder);
router.put("/:oldName/rename", subfolderController.renameSubfolder);
router.put("/:name/toggle-visibility", subfolderController.toggleVisibility);
router.put("/move-course", subfolderController.moveCourse);

module.exports = router;
