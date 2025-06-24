import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from 'react';
import MngNavbar from "../components/ManageNavbar";
import api from '../api';

import {
  FiUsers,
  FiCheckCircle,
  FiTarget,
  FiAlertCircle,
  FiTrendingUp
} from 'react-icons/fi';

const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
    <div className={`rounded-full p-3 bg-${color}-100 text-${color}-600`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const ProgressBar = ({ value }) => {
  const normalizedValue = Math.max(0, Math.min(100, value));
  let barColor = 'bg-blue-500';
  if (normalizedValue < 40) barColor = 'bg-red-500';
  else if (normalizedValue < 70) barColor = 'bg-yellow-500';
  else barColor = 'bg-green-500';

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`${barColor} h-2.5 rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${normalizedValue}%` }}
      ></div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center gap-4">
    <FiAlertCircle size={24} />
    <div>
      <p className="font-bold">Gagal Memuat Data</p>
      <p>{message}</p>
    </div>
  </div>
);

const AnalyticsPage = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/courses/analytics/${courseId}`);
      setAnalytics(res.data);
      setError(null);
    } catch (err) {
      console.error("❌ Gagal ambil analytics:", err);
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, [courseId]);

  const summaryStats = useMemo(() => {
    if (analytics.length === 0) {
      return { totalUsers: 0, avgScore: 0, highestScore: 0, totalAttempts: 0 };
    }
    const totalUsers = analytics.length;
    const totalAttempts = analytics.reduce((sum, u) => sum + u.attemp, 0);
    const avgScore = analytics.reduce((sum, u) => sum + u.benar, 0) / totalUsers;
    const highestScore = Math.max(...analytics.map(u => u.benar));
    return {
      totalUsers,
      avgScore: avgScore.toFixed(1),
      highestScore,
      totalAttempts
    };
  }, [analytics]);

  const handleLihatHasil = async (name) => {
    try {
      const res = await api.get(`/courses/${courseId}/userid/${name}`);
      const userId = res.data.user_id;
      if (userId) {
        navigate(`/courses/${courseId}/${userId}/hasil`);
      } else {
        alert("User ID tidak ditemukan.");
      }
    } catch (err) {
      console.error("❌ Gagal ambil user_id:", err);
      alert("Gagal mengambil user ID.");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Course Analytics</h1>
        </div>

        <MngNavbar />

        <div className="mt-6">
          {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<FiUsers size={22} />} title="Total Peserta" value={summaryStats.totalUsers} color="blue" />
                <StatCard icon={<FiTarget size={22} />} title="Skor Rata-rata" value={summaryStats.avgScore} color="yellow" />
                <StatCard icon={<FiTrendingUp size={22} />} title="Skor Tertinggi" value={summaryStats.highestScore} color="green" />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <h3 className="text-xl font-semibold text-gray-700 p-6">Detail Performa Peserta</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600 uppercase">
                      <tr>
                        <th className="py-3 px-6 text-left">Nama Peserta</th>
                        <th className="py-3 px-6 text-center">Percobaan</th>
                        <th className="py-3 px-6 text-center hidden md:table-cell">Benar</th>
                        <th className="py-3 px-6 text-center hidden md:table-cell">Salah</th>
                        <th className="py-3 px-6 text-center">Skor</th>
                        <th className="py-3 px-6 text-left min-w-[200px]">Progress Skor</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {analytics.length > 0 ? analytics.map((attempt, index) => (
                            <tr key={`${attempt.user_id}-${attempt.attemp}`} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-4 px-6 font-medium">{attempt.name}</td>
                            <td className="py-4 px-6 text-center">Ke-{attempt.attemp}</td>
                            <td className="py-4 px-6 text-center text-green-600 hidden md:table-cell">{attempt.benar}</td>
                            <td className="py-4 px-6 text-center text-red-600 hidden md:table-cell">{attempt.salah}</td>
                            <td className="py-4 px-6 text-center font-bold text-lg">{attempt.benar}</td>
                            <td className="py-4 px-6 flex flex-col lg:flex-row gap-2 items-start lg:items-center">
                                <div className="flex-1 w-full">
                                <ProgressBar value={(attempt.benar / attempt.total_dikerjakan) * 100} />
                                </div>
                                <button
                                onClick={() => navigate(`/courses/${courseId}/${attempt.user_id}/${attempt.attemp}/hasil`)}
                                className="mt-2 lg:mt-0 px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all"
                                >
                                Lihat Hasil
                                </button>
                            </td>
                            </tr>
                        )) : (
                            <tr>
                            <td colSpan="6" className="text-center py-12 text-gray-500">
                                Belum ada data analytics untuk ditampilkan.
                            </td>
                            </tr>
                        )}
                        </tbody>

                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
