require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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

app.use("/api/auth", authRoutes);
app.use("/api/jawaban", answerRoutes);
app.use("/api", userRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/data/kelas", kelasRoutes);
app.use('/api/courses', courseRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/answertrail", answerTrailRoutes);
app.use('/api/', resultRoutes);
app.use("/api/subfolders", subfolderRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
