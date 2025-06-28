import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { FiFileText, FiClock, FiCheckCircle, FiEdit3 } from 'react-icons/fi';

const formatWaktu = (detik) => {
  const m = Math.floor(detik / 60).toString().padStart(2, '0');
  const s = (detik % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const StudentLogDetailPage = () => {
  const { courseId, userId, attemp } = useParams();
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [questionMap, setQuestionMap] = useState({});
  const [processedLogs, setProcessedLogs] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await api.get(`/courses/${courseId}/questions`);
        const map = {};
        res.data.forEach((q, index) => {
          map[q.id] = index + 1; // soal_id → no soal
        });
        setQuestionMap(map);
      } catch (err) {
        console.error("❌ Gagal ambil soal:", err);
      }
    };

    fetchQuestions();
  }, [courseId]);

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
    const generateTextualLogs = () => {
      const answeredMap = new Map();
      const newLogs = logs.map(log => {
        const soalNomor = questionMap[log.soal_id] || '?';
        let actionText = '';
        let Icon = FiCheckCircle;

        if (answeredMap.has(log.soal_id)) {
          actionText = `Siswa mengubah jawaban soal No. ${soalNomor} menjadi "${log.jawaban || '-'}"`;
          Icon = FiEdit3;
        } else {
          actionText = `Siswa menjawab soal No. ${soalNomor} dengan jawaban "${log.jawaban || '-'}"`;
        }

        answeredMap.set(log.soal_id, log.jawaban);

        return {
          ...log,
          text: `${actionText} pada waktu ${formatWaktu(log.waktu)}`,
          icon: Icon,
        };
      });

      setProcessedLogs(newLogs);
    };

    if (logs.length > 0 && Object.keys(questionMap).length > 0) {
      generateTextualLogs();
    }
  }, [logs, questionMap]);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Detail Log Pengerjaan</h1>
          <p className="text-gray-600">
            📘 <strong>{user?.name || userId}</strong> | Attempt: <strong>{attemp}</strong>
          </p>
        </div>

        <div className="space-y-6">
          {processedLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-md">
              <FiFileText className="mx-auto mb-4" size={40} />
              <p className="text-lg">Tidak ada log pengerjaan yang ditemukan.</p>
            </div>
          ) : (
            processedLogs.map((log, i) => (
              <div key={i} className="flex items-start">
                {/* Icon Timeline */}
                <div className="flex flex-col items-center mr-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${log.icon === FiEdit3 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                    <log.icon size={20} />
                  </div>
                  {i < processedLogs.length - 1 && (
                    <div className="w-px h-16 bg-gray-300 mt-2"></div>
                  )}
                </div>

                {/* Isi Log */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 w-full shadow-sm hover:shadow-md transition-shadow duration-300">
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
