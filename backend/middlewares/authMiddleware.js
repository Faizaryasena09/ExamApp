const jwt = require("jsonwebtoken");

const JWT_SECRET = "rahasia_jangan_dibocorin";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token tidak valid atau sudah kedaluwarsa" });
  }
}

module.exports = authMiddleware;
