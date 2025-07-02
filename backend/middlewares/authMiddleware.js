const jwt = require("jsonwebtoken");

const JWT_SECRET = "rahasia_jangan_dibocorin";

/**
 * Middleware autentikasi opsional
 * Akan lanjut kalau token tidak ada DAN route tidak membutuhkan autentikasi
 * Tapi akan tolak (401/403) kalau route pakai auth dan token tidak valid
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Tidak ada token? → lanjut aja (anggap public route)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // ✅ tidak wajib token
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // inject user ke req
    next();
  } catch (err) {
    console.error("❌ Gagal verifikasi token:", err.message);
    return res.status(403).json({ message: "Token tidak valid atau sudah kedaluwarsa" });
  }
}

module.exports = authMiddleware;
