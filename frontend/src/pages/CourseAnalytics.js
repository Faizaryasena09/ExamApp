import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from 'react';
import MngNavbar from "../components/ManageNavbar";
import api from '../api';

import {
  FiUsers,
  FiTarget,
  FiAlertCircle,
  FiTrendingUp,
  FiChevronDown
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

const StudentRow = ({ student, courseId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const summary = useMemo(() => {
    if (!student.attempts || student.attempts.length === 0) {
      return { bestScore: 0, totalAttempts: 0, progress: 0 };
    }
    const bestAttempt = student.attempts.reduce((prev, current) => (prev.benar > current.benar) ? prev : current);
    return {
      bestScore: bestAttempt.benar,
      totalAttempts: student.attempts.length,
      progress: (bestAttempt.benar / bestAttempt.total_dikerjakan) * 100
    };
  }, [student.attempts]);

  return (
    <div className="border-b border-gray-200">
      <div
        className="flex flex-col md:flex-row items-start md:items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-full md:w-1/3 font-medium text-gray-800 mb-2 md:mb-0">
          {student.name}
          <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
            {summary.totalAttempts} percobaan
          </span>
        </div>

        <div className="w-full md:w-1/6 text-left md:text-center text-gray-600 mb-2 md:mb-0">
            <span className="md:hidden font-semibold mr-2">Skor Terbaik: </span>
            <span className="font-bold text-lg text-gray-800">{summary.bestScore}</span>
        </div>

        <div className="w-full md:flex-1 flex items-center gap-4">
            <div className="flex-grow">
                <ProgressBar value={summary.progress} />
            </div>
            <FiChevronDown
            size={20}
            className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            />
        </div>
      </div>

      {isOpen && (
        <div className="bg-gray-50 px-4 md:px-8 py-4">
          <div className="border-l-2 border-blue-200 pl-4">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Riwayat Percobaan:</h4>
            {student.attempts
              .sort((a, b) => a.attemp - b.attemp)
              .map(attempt => (
                <div key={attempt.attemp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                  <div>
                    <span className="font-semibold">Percobaan Ke-{attempt.attemp}</span>
                    <div className="text-xs text-gray-500 flex gap-4 mt-1">
                        <span>Benar: <span className="text-green-600 font-medium">{attempt.benar}</span></span>
                        <span>Salah: <span className="text-red-600 font-medium">{attempt.salah}</span></span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/courses/${courseId}/${attempt.user_id}/${attempt.attemp}/hasil`);
                    }}
                    className="mt-2 sm:mt-0 px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all"
                  >
                    Lihat Hasil
                  </button>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


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

  const groupedAndSortedData = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];

    const studentsById = analytics.reduce((acc, attempt) => {
      acc[attempt.user_id] = acc[attempt.user_id] || {
        ...attempt,
        attempts: []
      };
      acc[attempt.user_id].attempts.push(attempt);
      return acc;
    }, {});

    const studentsByClass = Object.values(studentsById).reduce((acc, student) => {
      acc[student.kelas] = acc[student.kelas] || [];
      acc[student.kelas].push(student);
      return acc;
    }, {});

    return Object.keys(studentsByClass)
      .sort()
      .map(className => ({
        className,
        students: studentsByClass[className].sort((a, b) => a.name.localeCompare(b.name))
      }));
  }, [analytics]);

  const summaryStats = useMemo(() => {
    if (analytics.length === 0) {
      return { totalUsers: 0, avgScore: 0, highestScore: 0, totalAttempts: 0 };
    }
    const totalUsers = Object.keys(analytics.reduce((acc, item) => ({...acc, [item.user_id]: true }), {})).length;
    const totalAttempts = analytics.length;
    const totalScore = analytics.reduce((sum, u) => sum + u.benar, 0);
    const avgScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;
    const highestScore = Math.max(0, ...analytics.map(u => u.benar));
    return {
      totalUsers,
      avgScore: avgScore.toFixed(1),
      highestScore,
      totalAttempts
    };
  }, [analytics]);


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
                <StatCard icon={<FiTarget size={22} />} title="Rata-rata Skor per Percobaan" value={summaryStats.avgScore} color="yellow" />
                <StatCard icon={<FiTrendingUp size={22} />} title="Skor Tertinggi" value={summaryStats.highestScore} color="green" />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <h3 className="text-xl font-semibold text-gray-700 p-6 border-b border-gray-200">
                  Detail Performa Peserta
                </h3>
                
                {groupedAndSortedData.length > 0 ? (
                    <div>
                    <div className="hidden md:flex bg-gray-100 text-gray-600 uppercase text-xs font-semibold px-4 py-2">
                        <div className="md:w-1/3">Nama Peserta</div>
                        <div className="md:w-1/6 text-center">Skor Terbaik</div>
                        <div className="flex-1">Progress</div>
                    </div>

                    {groupedAndSortedData.map(classGroup => (
                        <div key={classGroup.className}>
                        <h4 className="bg-gray-200 text-gray-800 font-bold p-3 text-sm">
                            Kelas: {classGroup.className}
                        </h4>
                        {classGroup.students.map(student => (
                            <StudentRow key={student.user_id} student={student} courseId={courseId} />
                        ))}
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                    Belum ada data analytics untuk ditampilkan.
                    </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;