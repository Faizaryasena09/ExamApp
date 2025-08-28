import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import api from "./api"; 
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
import AnswerSummaryPage from "./pages/AnswerSummaryPage";
import StudentLogDetailPage from "./pages/StudentLogDetailPage";
import ManageExamPage from "./pages/ManageExamPage";
import ManageGuruPage from "./pages/ManageGuruPage";
import PreviewPage from "./pages/PreviewPage";
import WebSettingsPage from "./pages/WebSettingsPage";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Footer from "./components/Footer";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function PublicRoute({ element }) {
  return getCookie("name") ? <Navigate to="/home" /> : element;
}

function PrivateRoute({ element }) {
  const location = useLocation();

  if (!getCookie("name")) {
    // Simpan URL tujuan sebelum login
    localStorage.setItem("redirectAfterLogin", location.pathname + location.search);
    return <Navigate to="/" replace />;
  }

  return element;
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
      if (role === "admin" || role === "guru") {
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
      if (role === "admin" || role === "guru") {
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

function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const noHeaderPaths = ["/"];
  const isDoExamPage = /^\/courses\/[^/]+\/do$/.test(location.pathname);
  const showHeader = !noHeaderPaths.includes(location.pathname) && !isDoExamPage;



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
            <Route path="/courses/:id/preview" element={<PrivateRoute element={<PreviewPage />} />} />
            <Route path="/courses/:courseId/log/:userId/:attemp" element={<StudentLogDetailPage />} />

            <Route
              path="/courses/:courseId/:userId/:attemp/hasil"
              element={<ExamResultAccessRoute element={<ExamResultPage />} />}
            />

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
              path="/examcontrol"
              element={
                <RoleRoute
                  allowedRoles={["admin"]}
                  element={<CourseAccessRoute element={<ManageExamPage />} type="control" />}
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

            <Route
              path="/createcourses"
              element={<RoleRoute allowedRoles={["guru", "admin"]} element={<CreateCoursesPage />} />}
            />

            <Route
              path="/usrmng"
              element={<RoleRoute allowedRoles={["admin"]} element={<UserManage />} />}
            />
            <Route
              path="/tchmng"
              element={<RoleRoute allowedRoles={["admin"]} element={<ManageGuruPage />} />}
            />
            <Route
              path="/classmanage"
              element={<RoleRoute allowedRoles={["admin"]} element={<KelasManagement />} />}
            />
            <Route
              path="/webmng"
              element={<RoleRoute allowedRoles={["admin"]} element={<WebSettingsPage />} />}
            />
            <Route path="/courses/:courseId/:userId/:attemp/summary" element={<AnswerSummaryPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;
