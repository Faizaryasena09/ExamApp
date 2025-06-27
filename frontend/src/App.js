import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import api from "./api"; // Harus sudah ada api.js (axios instance)

// Pages
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import CoursesPage from "./pages/Courses";
import DoExamPage from "./pages/DoExamPage";
import ExamResultPage from "./pages/ExamResultPage";
import CreateCoursesPage from "./pages/CreateCourses";
import UserManage from "./pages/UserManagementPage";
import KelasManagement from "./pages/KelasManagement";
import ManageCourse from "./pages/ManageCoursePage";
import AnalyticsCourse from "./pages/CourseAnalytics";

// Layout
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

// Utils
function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// Route Wrappers
function PublicRoute({ element }) {
  return getCookie("name") ? <Navigate to="/home" /> : element;
}

function PrivateRoute({ element }) {
  return getCookie("name") ? element : <Navigate to="/" />;
}

function RoleRoute({ element, allowedRoles }) {
  const role = getCookie("role");
  return role && allowedRoles.includes(role) ? element : <Navigate to="/home" />;
}

function ExamResultAccessRoute({ element }) {
  const { courseId, userId } = useParams();
  const [allowed, setAllowed] = useState(null);

  const currentUserId = getCookie("user_id");
  const role = getCookie("role");

  useEffect(() => {
    const check = async () => {
      if (role === "admin") {
        setAllowed(true);
        return;
      }

      if (role === "siswa" && userId !== currentUserId) {
        setAllowed(false);
        return;
      }

      try {
        const res = await api.get("/check/hasil", {
          params: {
            course_id: courseId,
            user_id: currentUserId,
          },
        });

        setAllowed(res.data?.allowed === true);
      } catch (err) {
        console.error("❌ Gagal validasi hasil:", err.message);
        setAllowed(false);
      }
    };

    check();
  }, [courseId, userId, currentUserId, role]);

  if (allowed === null) return <div>Memeriksa akses hasil...</div>;
  return allowed ? element : <Navigate to="/" />;
}

function CourseAccessRoute({ element, type = "general" }) {
  const { id } = useParams();
  const [allowed, setAllowed] = useState(null);
  const role = getCookie("role");
  const user_id = getCookie("user_id");

  useEffect(() => {
    const check = async () => {
      if (role === "admin") {
        setAllowed(true);
        return;
      }

      try {
        const res = await api.get("/check/course-access", {
          params: {
            user_id,
            course_id: id,
            type,
          },
        });

        setAllowed(res.data?.allowed === true);
      } catch (err) {
        console.error("❌ Gagal validasi akses course:", err.message);
        setAllowed(false);
      }
    };

    check();
  }, [id, user_id, role, type]);

  if (allowed === null) return <div>Memeriksa akses course...</div>;
  return allowed ? element : <Navigate to="/home" />;
}

// Layout Component
function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const noHeaderPaths = ["/"];
  const showHeader = !noHeaderPaths.includes(location.pathname);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen">
      {showHeader && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          showHeader && !isMobile && sidebarOpen ? "ml-64" : ""
        }`}
      >
        {showHeader && (
          <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        )}

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<PublicRoute element={<LoginPage />} />} />
            <Route path="/home" element={<PrivateRoute element={<HomePage />} />} />
            <Route path="/courses" element={<PrivateRoute element={<CoursesPage />} />} />
            <Route path="/courses/:id/do" element={<PrivateRoute element={<DoExamPage />} />} />

            {/* 🧠 Hasil ujian (siswa hanya hasil sendiri & kalau tampilkanHasil = true) */}
            <Route
              path="/courses/:courseId/:userId/:attemp/hasil"
              element={<ExamResultAccessRoute element={<ExamResultPage />} />}
            />

            {/* 🔐 Guru & Admin - akses ke course (manage/analytics) hanya jika pemilik */}
            <Route
              path="/courses/:id/manage"
              element={
                <RoleRoute
                  allowedRoles={["guru", "admin"]}
                  element={<CourseAccessRoute element={<ManageCourse />} type="manage" />}
                />
              }
            />
            <Route
              path="/courses/:id/analytics"
              element={
                <RoleRoute
                  allowedRoles={["guru", "admin"]}
                  element={<CourseAccessRoute element={<AnalyticsCourse />} type="analytics" />}
                />
              }
            />

            {/* ✏️ Create hanya guru/admin */}
            <Route
              path="/createcourses"
              element={<RoleRoute allowedRoles={["guru", "admin"]} element={<CreateCoursesPage />} />}
            />

            {/* 🔒 Admin only */}
            <Route
              path="/usrmng"
              element={<RoleRoute allowedRoles={["admin"]} element={<UserManage />} />}
            />
            <Route
              path="/classmanage"
              element={<RoleRoute allowedRoles={["admin"]} element={<KelasManagement />} />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// Wrapper
function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
