import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import CoursesPage from "./pages/Courses";
import DoExamPage from "./pages/DoExamPage";
import ExamResultPage from './pages/ExamResultPage';
import CreateCoursesPage from "./pages/CreateCourses";
import UserManage from "./pages/UserManagementPage";
import KelasManagement from "./pages/KelasManagement";
import ManageCourse from "./pages/ManageCoursePage";
import AnalyticsCourse from "./pages/CourseAnalytics";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function PublicRoute({ element }) {
  return getCookie("name") ? <Navigate to="/home" /> : element;
}

function PrivateRoute({ element }) {
  return getCookie("name") ? element : <Navigate to="/" />;
}

function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const noHeaderPaths = ["/"];
  const showHeader = !noHeaderPaths.includes(location.pathname);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
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

        <main className=" flex-grow">
          <Routes>
            <Route path="/" element={<PublicRoute element={<LoginPage />} />} />
            <Route path="/home" element={<PrivateRoute element={<HomePage />} />} />
            <Route path="/usrmng" element={<PrivateRoute element={<UserManage />} />} />
            <Route path="/courses/:courseId/:userId/hasil" element={<ExamResultPage />} />
            <Route path="/courses/:id/do" element={<DoExamPage />} />
            <Route path="/courses/:id/analytics" element={<AnalyticsCourse />} />
            <Route path="/courses" element={<PrivateRoute element={<CoursesPage />} />} />
            <Route path="/createcourses" element={<PrivateRoute element={<CreateCoursesPage />} />} />
            <Route path="/courses/:id/manage" element={<ManageCourse />} />
            <Route path="/classmanage" element={<PrivateRoute element={<KelasManagement />} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}


function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
