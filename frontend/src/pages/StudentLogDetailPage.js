import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { FiClock, FiCheckCircle, FiEdit3, FiRepeat, FiBookOpen } from 'react-icons/fi';

const formatWaktu = (detik) => {
  const m = Math.floor(detik / 60).toString().padStart(2, '0');
  const s = (detik % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const StudentLogDetailPage = () => {
  const { courseId, userId, attemp } = useParams();
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [processedLogs, setProcessedLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/studentworklog/course/${courseId}/user/${userId}/attempt/${attemp}`);
        setLogs(res.data.logs);
        setUser(res.data.user);
      } catch (err) {
        console.error("❌ Gagal ambil log:", err);
      }
    };
    fetchLogs();
  }, [courseId, userId, attemp]);

  useEffect(() => {
    const answeredSoal = new Map();
    const newProcessedLogs = logs.map(log => {
      let actionText = "Siswa menjawab soal";
      let Icon = FiCheckCircle;

      if (answeredSoal.has(log.soal_id)) {
        actionText = "Siswa mengubah jawaban soal";
        Icon = FiEdit3;
      }

      answeredSoal.set(log.soal_id, log.jawaban);

      return {
        ...log,
        text: `${actionText} No. ${log.soal_id}, dengan jawaban "${log.jawaban || '-'}"`,
        icon: Icon,
      };
    });

    setProcessedLogs(newProcessedLogs);
  }, [logs]);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Detail Log Pengerjaan – <span className="text-blue-600">{user?.name || userId}</span>
          </h1>
          <div className="flex flex-wrap gap-4 text-gray-600 items-center text-base">
            <div className="flex items-center gap-2">
              <FiBookOpen className="text-blue-600" />
              <span className="font-semibold text-blue-800">{user?.course_name || courseId}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiRepeat className="text-purple-600" />
              <span>Attempt ke-<strong className="text-gray-800">{attemp}</strong></span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {processedLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-md">
              <p className="text-lg">Tidak ada log pengerjaan yang ditemukan.</p>
            </div>
          ) : (
            processedLogs.map((log, i) => (
              <div key={i} className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    log.icon === FiEdit3 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                  }`}>
                    <log.icon size={20} />
                  </div>
                  {i < processedLogs.length - 1 && <div className="w-px h-16 bg-gray-300 mt-2"></div>}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 w-full shadow-sm">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-800 text-base">{log.text}</p>
                    <div className="flex items-center text-sm text-gray-500 ml-4 flex-shrink-0">
                      <FiClock className="mr-1.5" />
                      <span>{formatWaktu(log.waktu)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentLogDetailPage;
