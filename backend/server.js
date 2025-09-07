require("dotenv").config({ path: require('path').resolve(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://192.168.0.8:89",
  "http://10.221.102.192:89"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origin tidak diizinkan"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Sajikan file statis dari folder public/uploads
app.use("/api/uploads", express.static(path.join(__dirname, "public", "uploads")));

const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const userRoutes = require("./routes/userRoutes");
const kelasRoutes = require("./routes/kelasRoutes");
const courseRoutes = require("./routes/courseRoutes");
const answerRoutes = require("./routes/answerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const resultRoutes = require("./routes/resultRoutes");
const answerTrailRoutes = require("./routes/answerTrailRoutes");
const subfolderRoutes = require("./routes/subfolderRoutes");
const checkRoutes = require("./routes/checkRoutes");
const studentworklog = require("./routes/studentWorkLogRoutes");
const examRoutes = require("./routes/examRoutes");
const guruRoutes = require("./routes/guruRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const webMngRoutes = require("./routes/webMngRoutes");
const ocrRoutes = require("./routes/ocrRoutes");

app.use("/api/exam", examRoutes);
app.use("/api/studentworklog", studentworklog);
app.use("/api/check", checkRoutes);
app.use("/api/answertrail", answerTrailRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", webMngRoutes);
app.use("/api/jawaban", answerRoutes);
app.use("/api", guruRoutes);
app.use("/api", userRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/data/kelas", kelasRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", resultRoutes);
app.use("/api/subfolders", subfolderRoutes);
app.use("/api", uploadRoutes);
app.use("/api", ocrRoutes);

const sessionController = require("./controllers/sessionController");
sessionController.startAutoSessionChecker();

const cleanUploads = require("./utils/cleanUploads");
cleanUploads();
setInterval(cleanUploads, 24 * 60 * 60 * 1000);

app.listen(PORT, () => console.log(`Server berjalan pada port ${PORT}`));
