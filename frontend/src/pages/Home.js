import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import Cookies from "js-cookie";
import { Link } from "react-router-dom";
import { FiBookOpen, FiCheckSquare, FiTrendingUp, FiClock, FiArrowRight, FiActivity } from 'react-icons/fi';

const StatCard = ({ icon, title, value, color, loading }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-5">
      <div className={`rounded-full p-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 animate-pulse">
    <div className="max-w-7xl mx-auto">
      <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-2"></div>
      <div className="h-5 bg-gray-200 rounded-md w-1/2"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="h-24 bg-gray-200 rounded-xl"></div>
        <div className="h-24 bg-gray-200 rounded-xl"></div>
        <div className="h-24 bg-gray-200 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 h-48 bg-gray-200 rounded-xl"></div>
        <div className="h-48 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  </div>
);

function HomePage() {
  const [user, setUser] = useState({});
  const [recentExam, setRecentExam] = useState(null);
  const [stats, setStats] = useState({ completed: 0, averageScore: 0 });
  const [totalCourses, setTotalCourses] = useState(0);
  const [loading, setLoading] = useState(true);

  const userId = Cookies.get("user_id");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, recentRes, statsRes, allCourseRes] = await Promise.all([
          api.get("/user", { params: { id: userId } }),
          api.get("/dashboard/recent", { params: { user_id: userId } }),
          api.get("/dashboard/summary", { params: { user_id: userId } }),
          api.get("/courses")
        ]);

        setUser(userRes.data);
        setRecentExam(recentRes.data);
        setStats(statsRes.data);
        setTotalCourses(allCourseRes.data.length || 0);
      } catch (error) {
        console.error("❌ Gagal load data dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const formattedRecentDate = useMemo(() => {
    if (!recentExam?.date) return null;
    try {
      const date = new Date(recentExam.date);
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(date);
    } catch (e) {
      return recentExam.date;
    }
  }, [recentExam]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold text-gray-800">
            Selamat Datang, {user.name}!
          </h1>
          <p className="mt-1 text-md text-gray-600">
            Berikut adalah ringkasan aktivitas dan progres belajar Anda.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <StatCard
            icon={<FiBookOpen size={22} />}
            title="Course Tersedia"
            value={totalCourses}
            color="blue"
          />
          <StatCard
            icon={<FiCheckSquare size={22} />}
            title="Ujian Selesai"
            value={stats.completed}
            color="green"
          />
          <StatCard
            icon={<FiTrendingUp size={22} />}
            title="Rata-rata Skor"
            value={parseFloat(stats.averageScore).toFixed(1)}
            color="yellow"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-3">
              <FiClock className="text-gray-500" />
              Aktivitas Terakhir Anda
            </h3>
            {recentExam ? (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-800">{recentExam.title}</p>
                <div className="text-sm text-gray-500 mt-2 flex items-center gap-4">
                  <span>Skor: <span className="font-medium text-gray-700">{recentExam.score}</span></span>
                  <span>|</span>
                  <span>Dikerjakan pada: <span className="font-medium text-gray-700">{formattedRecentDate || recentExam.date}</span></span>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center py-10 bg-gray-50 rounded-lg">
                <FiActivity size={32} className="mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">Belum ada aktivitas ujian yang tercatat.</p>
              </div>
            )}
          </div>

          <Link to="/courses" className="block bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-white flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold">
                Mulai Ujian Baru
              </h3>
              <p className="mt-1 text-blue-100 text-sm">
                Tantang diri Anda dan tingkatkan pengetahuan Anda sekarang.
              </p>
            </div>
            <div className="mt-4 text-md font-semibold flex items-center gap-2">
              Lihat Daftar Ujian
              <FiArrowRight />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;