const dbPromise = require("../models/database");

exports.checkHasil = async (req, res) => {
  const db = await dbPromise;
  const { course_id, user_id } = req.query;

  if (!course_id || !user_id) {
    return res.status(400).json({ allowed: false, msg: "Param kurang" });
  }

  try {
    const [user] = await db.query("SELECT role FROM users WHERE id = ?", [user_id]);
    if (user[0]?.role === "admin") {
      return res.json({ allowed: true });
    }

    const [course] = await db.query("SELECT tampilkanHasil FROM courses WHERE id = ?", [course_id]);
    if (!course[0]) return res.json({ allowed: false });

    if (course[0].tampilkanHasil) {
      return res.json({ allowed: true });
    }

    return res.json({ allowed: false });
  } catch (err) {
    console.error("❌ Error check hasil:", err.message);
    res.status(500).json({ allowed: false });
  }
};

exports.checkCourseAccess = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id, type } = req.query;

  if (!user_id || !course_id || !type) {
    return res.status(400).json({ allowed: false, msg: "Param kurang" });
  }

  try {
    const [user] = await db.query("SELECT role FROM users WHERE id = ?", [user_id]);
    const role = user[0]?.role;

    if (role === "admin") return res.json({ allowed: true });

    if (role === "guru") {
      const [rows] = await db.query("SELECT pengajar_id FROM courses WHERE id = ?", [course_id]);
      if (rows[0]?.pengajar_id === user_id) return res.json({ allowed: true });
    }

    return res.json({ allowed: false });
  } catch (err) {
    console.error("❌ Error check course access:", err.message);
    res.status(500).json({ allowed: false });
  }
};
