import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import Cookies from "js-cookie";

import { FiFlag, FiClock, FiChevronLeft, FiChevronRight, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

function DoExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [examTitle, setExamTitle] = useState("Memuat Ujian...");
  const [soalList, setSoalList] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawabanSiswa, setJawabanSiswa] = useState({});
  const [raguRagu, setRaguRagu] = useState({});
  const [showStartModal, setShowStartModal] = useState(true);
  const [showSelesaiModal, setShowSelesaiModal] = useState(false);
  const [waktuSisa, setWaktuSisa] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!showStartModal) {
      fetchSoal();
      fetchJawabanSiswa();
    }
  }, [showStartModal]);

  useEffect(() => {
    if (showStartModal || soalList.length === 0 || waktuSisa <= 0) return;
  
    const timer = setInterval(() => {
      setWaktuSisa((s) => {
        if (s <= 1) {
          clearInterval(timer);
          handleSelesaiUjian();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  
    return () => clearInterval(timer);
  }, [showStartModal, soalList.length, waktuSisa]);  

  const fetchSoal = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/courses/${id}/questions`);
      setSoalList(res.data);

      const config = await api.get(`/courses/${id}`);
      setExamTitle(config.data.title || "Ujian Kompetensi");
      const waktu = config.data.waktu || 30;
      setWaktuSisa(waktu * 60);
    } catch (err) {
      console.error("Gagal ambil soal:", err);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchJawabanSiswa = async () => {
    try {
      const res = await api.get(`/jawaban/${id}`, {
        params: { user_id: Cookies.get("user_id") },
      });
      const hasil = {};
      res.data.forEach(item => {
        hasil[item.question_id] = item.answer;
      });
      setJawabanSiswa(hasil);
    } catch (err) {
      console.error("Gagal ambil jawaban sebelumnya:", err);
    }
  };

  const simpanJawabanKeServer = async (soalId, jawaban) => {
    try {
      await api.post("/jawaban", {
        user_id: Cookies.get("user_id"),
        course_id: id,
        soal_id: soalId,
        jawaban,
      });
    } catch (err) {
      console.error("❌ Gagal simpan jawaban:", err);
    }
  };

  const submitJawabanUjian = async () => {
    try {
      const user_id = Cookies.get("user_id");
      const dataJawaban = Object.entries(jawabanSiswa).map(([soal_id, jawaban]) => ({
        soal_id: parseInt(soal_id),
        jawaban
      }));
  
      await api.post(`/courses/${id}/submit`, {
        user_id,
        jawaban: dataJawaban,
        attemp: 1
      });
  
      return true;
    } catch (err) {
      console.error("❌ Gagal submit ujian:", err);
      return false;
    }
  };  

  const handleJawab = (soalId, jawaban) => {
    setJawabanSiswa((prev) => ({ ...prev, [soalId]: jawaban }));
    simpanJawabanKeServer(soalId, jawaban);
  };

  const toggleRagu = (soalId) => {
    setRaguRagu((prev) => ({
      ...prev,
      [soalId]: !prev[soalId],
    }));
  };

  useEffect(() => {
    const fetchCourseConfig = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setShowResult(res.data.showResultToStudent === 1);
      } catch (err) {
        console.error("Gagal ambil config course:", err);
      }
    };
  
    fetchCourseConfig();
  }, [id]);  

  const handleSelesaiUjian = async () => {
    const sukses = await submitJawabanUjian();
    if (sukses) {
      alert("Ujian selesai dan jawaban telah disimpan.");
      if (showResult) {
        navigate(`/courses/${id}/result`);
      } else {
        navigate(`/`);
      }
    } else {
      alert("Terjadi kesalahan saat menyimpan jawaban. Coba lagi.");
    }
  };  

  const currentSoal = soalList[currentIndex];
  
  const opsiArray = currentSoal ? (
    typeof currentSoal.opsi === "string" 
    ? JSON.parse(currentSoal.opsi) 
    : currentSoal.opsi || []
  ) : [];

  const formatWaktu = (detik) => {
    if (detik < 0) detik = 0;
    const jam = Math.floor(detik / 3600).toString().padStart(2, '0');
    const menit = Math.floor((detik % 3600) / 60).toString().padStart(2, '0');
    const dtk = (detik % 60).toString().padStart(2, '0');
    return `${jam}:${menit}:${dtk}`;
  };

  if (showStartModal) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center transform transition-all">
          <FiCheckCircle className="text-green-500 mx-auto text-5xl mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Anda Akan Memulai Ujian</h2>
          <p className="mb-6 text-gray-600">Pastikan koneksi internet Anda stabil. Setelah dimulai, waktu akan berjalan. Apakah Anda siap?</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={() => setShowStartModal(false)}
              className="px-6 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Mulai Kerjakan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !currentSoal) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-50 text-gray-600">
            Memuat soal, mohon tunggu...
        </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{examTitle}</h1>
          <p className="text-sm text-gray-500">Soal {currentIndex + 1} dari {soalList.length}</p>
        </div>
        <div className="flex items-center gap-4 bg-gray-100 border border-gray-200 p-2 rounded-lg">
          <FiClock className="text-blue-600" size={20} />
          <span className="text-xl font-semibold text-gray-800 font-mono" aria-label="Sisa Waktu">
            {formatWaktu(waktuSisa)}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="prose max-w-none mb-6 text-gray-800" dangerouslySetInnerHTML={{ __html: currentSoal.soal }} />

            <div className="space-y-3">
              {opsiArray.map((opsi, idx) => {
                const huruf = opsi.slice(0, 2);
                const isSelected = jawabanSiswa[currentSoal.id] === huruf;
                return (
                  <label key={idx} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${ isSelected ? "bg-blue-50 border-blue-500 shadow-sm" : "bg-white border-gray-300 hover:border-blue-400"}`}>
                    <input type="radio" name={`soal-${currentSoal.id}`} value={huruf} checked={isSelected} onChange={() => handleJawab(currentSoal.id, huruf)} className="hidden"/>
                    <span className={`flex items-center justify-center w-6 h-6 mr-4 border rounded-full text-sm font-bold ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-400 text-gray-600'}`}>
                        {huruf.charAt(0)}
                    </span>
                    <span className="text-gray-700">{opsi.substring(3)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <button onClick={() => toggleRagu(currentSoal.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${raguRagu[currentSoal.id] ? "bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
              <FiFlag />
              {raguRagu[currentSoal.id] ? "Hapus Tanda" : "Tandai Ragu-Ragu"}
            </button>
            <div className="flex gap-4">
              <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronLeft />
                Sebelumnya
              </button>
              {currentIndex === soalList.length - 1 ? (
                <button onClick={() => setShowSelesaiModal(true)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm">
                  Selesai Ujian
                </button>
              ) : (
                <button onClick={() => setCurrentIndex((i) => Math.min(soalList.length - 1, i + 1))} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                  Selanjutnya <FiChevronRight />
                </button>
              )}
            </div>
          </div>
        </main>

        <aside className="w-72 bg-white border-l border-gray-200 p-4 flex flex-col overflow-y-auto">
          <div className="flex-1">
            <h3 className="text-md font-bold text-gray-800 mb-4">Navigasi Soal</h3>
            <div className="grid grid-cols-5 gap-2">
              {soalList.map((soal, index) => {
                const isCurrent = index === currentIndex;
                const isAnswered = jawabanSiswa[soal.id];
                const isMarked = raguRagu[soal.id];
                let btnClass = 'bg-gray-200 text-gray-700 hover:bg-gray-300';
                if (isAnswered) btnClass = 'bg-green-500 text-white hover:bg-green-600';
                if (isMarked) btnClass = 'bg-yellow-400 text-white hover:bg-yellow-500';
                if (isCurrent) btnClass = 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1';
                return (
                  <button key={soal.id} onClick={() => setCurrentIndex(index)} className={`w-10 h-10 rounded-md font-bold text-sm transition-all duration-200 flex items-center justify-center ${btnClass}`}>
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-6 border-t pt-4">
             <h4 className="text-sm font-semibold text-gray-600 mb-3">Legenda:</h4>
             <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-green-500"></div><span>Sudah Dijawab</span></li>
                <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-yellow-400"></div><span>Ragu-ragu</span></li>
                <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-gray-200"></div><span>Belum Dijawab</span></li>
                <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-blue-600"></div><span>Soal Aktif</span></li>
             </ul>
          </div>
        </aside>
      </div>

      {showSelesaiModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex justify-center items-center z-50">
           <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center transform transition-all">
            <FiAlertTriangle className="text-yellow-500 mx-auto text-5xl mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Akhiri Ujian?</h2>
            <p className="mb-6 text-gray-600">Apakah Anda yakin ingin menyelesaikan dan mengirim semua jawaban Anda sekarang?</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowSelesaiModal(false)} className="px-6 py-2 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
                Batal
              </button>
              <button onClick={handleSelesaiUjian} className="px-6 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
                Ya, Kirim Jawaban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoExamPage;