import React, { useEffect, useState } from "react";
import api from "../api";
import Cookies from "js-cookie";

function HomePage() {
  const [user, setUser] = useState({});
  const [recentExam, setRecentExam] = useState(null);
  const [stats, setStats] = useState({ completed: 0, averageScore: 0 });
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = Cookies.get("user_id");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, recentRes, statsRes, upcomingRes] = await Promise.all([
          api.get("/user", { params: { id: userId } }),
          api.get("/dashboard/recent", { params: { user_id: userId } }),
          api.get("/dashboard/summary", { params: { user_id: userId } }),
          api.get("/dashboard/upcoming", { params: { user_id: userId } }),
        ]);

        setUser(userRes.data);
        setRecentExam(recentRes.data);
        setStats(statsRes.data);
        setUpcomingExams(upcomingRes.data);
      } catch (error) {
        console.error("❌ Gagal load data dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-600">
        Memuat dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800">Selamat Datang, {user.name}!</h2>
        <p className="mt-1 text-lg text-gray-600">Berikut adalah ringkasan aktivitas ujian Anda.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold text-gray-900">Mulai Ujian Baru</h3>
            <p className="text-gray-600 mt-2">Pilih ujian yang tersedia dan mulai sekarang juga.</p>
            <a href="/courses" className="mt-4 block w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-center hover:bg-green-700 transition-colors">
              Lihat Daftar Ujian
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">Aktivitas Terkini</h3>
            {recentExam ? (
              <div className="mt-3 bg-gray-50 p-4 rounded-md">
                <p className="font-semibold text-gray-800">{recentExam.title}</p>
                <p className="text-gray-600">Skor Anda: <span className="font-bold text-2xl text-green-600">{recentExam.score}</span></p>
              </div>
            ) : (
              <p className="text-gray-500 mt-3">Belum ada aktivitas ujian.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">Statistik Anda</h3>
            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Total Ujian Diikuti</p>
                <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Rata-rata Skor</p>
                <p className="text-2xl font-bold text-gray-800">{stats.averageScore}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">Jadwal Ujian Mendatang</h3>
            {upcomingExams.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {upcomingExams.map(exam => (
                  <li key={exam.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100">
                    <span className="text-gray-700">{exam.title}</span>
                    <span className="font-semibold text-gray-500">{exam.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-gray-500">Belum ada jadwal ujian dalam waktu dekat.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default HomePage;
