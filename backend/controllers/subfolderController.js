const dbPromise = require("../models/database");

exports.getSubfolders = async (req, res) => {
  const db = await dbPromise;
  const [rows] = await db.query("SELECT * FROM subfolders ORDER BY position ASC");
  res.json(rows);
};

exports.createSubfolder = async (req, res) => {
  const db = await dbPromise;
  const { name } = req.body;
  try {
    await db.query("INSERT INTO subfolders (name) VALUES (?)", [name]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal membuat subfolder" });
  }
};

exports.renameSubfolder = async (req, res) => {
  const db = await dbPromise;
  const oldName = req.params.oldName;
  const { newName } = req.body;
  try {
    await db.query("UPDATE subfolders SET name = ? WHERE name = ?", [newName, oldName]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal rename subfolder" });
  }
};

exports.toggleVisibility = async (req, res) => {
  const db = await dbPromise;
  const name = req.params.name;
  const { hidden } = req.body;
  try {
    await db.query("UPDATE subfolders SET hidden = ? WHERE name = ?", [hidden ? 1 : 0, name]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal update visibilitas subfolder" });
  }
};

exports.moveCourse = async (req, res) => {
    const { courseId, toSubfolderId } = req.body;
  
    try {
      const db = await dbPromise;
  
      let folderId = null;
  
      if (toSubfolderId && toSubfolderId !== "Tanpa Folder") {
        const [folderRows] = await db.query(
          "SELECT id FROM subfolders WHERE name = ? LIMIT 1",
          [toSubfolderId]
        );
        
        if (!folderRows.length) {
          return res.status(404).json({ error: "Subfolder tidak ditemukan" });
        }
  
        folderId = folderRows[0].id;
      }
  
      await db.query(
        "UPDATE courses SET subfolder_id = ? WHERE id = ?",
        [folderId, courseId]
      );
  
      res.json({ success: true, subfolder_id: folderId });
    } catch (err) {
      console.error("❌ Gagal pindahkan course:", err);
      res.status(500).json({ error: "Gagal memindahkan course" });
    }
  };
  
    