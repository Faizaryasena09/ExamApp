require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// === ROUTES ===
const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const userRoutes = require("./routes/userRoutes");
const kelasRoutes = require("./routes/kelasRoutes");
const courseRoutes = require('./routes/courseRoutes');
const answerRoutes = require('./routes/answerRoutes');
const dashboardRoutes = require("./routes/dashboardRoutes");
const resultRoutes = require('./routes/resultRoutes');
const answerTrailRoutes = require("./routes/answerTrailRoutes");
const subfolderRoutes = require("./routes/subfolderRoutes");
const checkRoutes = require("./routes/checkRoutes");
const studentworklog = require("./routes/studentWorkLogRoutes");
const examRoutes = require("./routes/examRoutes");
const guruRoutes = require("./routes/guruRoutes");
const uploadRoutes = require('./routes/uploadRoutes');
const webMngRoutes = require("./routes/webMngRoutes");

app.use("/api/exam", examRoutes);
app.use("/api/studentworklog", studentworklog);
app.use("/api/check", checkRoutes);
app.use("/api/answertrail", answerTrailRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jawaban", answerRoutes);
app.use("/api", guruRoutes);
app.use("/api", userRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/data/kelas", kelasRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", resultRoutes);
app.use("/api", webMngRoutes);
app.use("/api/subfolders", subfolderRoutes);
app.use('/api', uploadRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const sessionController = require("./controllers/sessionController");
sessionController.startAutoSessionChecker();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
