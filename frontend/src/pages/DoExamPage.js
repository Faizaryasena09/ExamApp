import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import Cookies from "js-cookie";
import { ImSpinner2 } from 'react-icons/im';

import { FiFlag, FiClock, FiChevronLeft, FiChevronRight, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

function DoExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const waktuRef = useRef(0);

  const userId = Cookies.get("user_id");

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
  const { id: courseId } = useParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [sudahInputToken, setSudahInputToken] = useState(true);
  const [attemptNow, setAttemptNow] = useState(1);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [maxInfo, setMaxInfo] = useState(null);
  const [acakSoal, setAcakSoal] = useState(false);
  const [acakJawaban, setAcakJawaban] = useState(false);
  const [minWaktuSubmit, setMinWaktuSubmit] = useState(0);
  const [configWaktu, setConfigWaktu] = useState(30);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [submitCountdown, setSubmitCountdown] = useState(null);
  const [totalWaktu, setTotalWaktu] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");

  useEffect(() => {
    const checkTokenRequirement = async () => {
      try {
        const courseRes = await api.get(`/courses/${courseId}`);
        const useToken = courseRes.data.useToken;
        const title = courseRes.data.title || "Tanpa Judul";
    
        setCourseTitle(title); // ✅ Simpan title di state
    
        if (!useToken) {
          setSudahInputToken(true);
          setAuthChecked(true);
          return;
        }
    
        const tokenRes = await api.get(`/courses/${courseId}/tokenAuth?user=${userId}`);
        if (tokenRes.data.isAuthorized) {
          setSudahInputToken(true);
        } else {
          setSudahInputToken(false);
        }
      } catch (err) {
        console.error("❌ Gagal cek useToken atau tokenAuth:", err.message);
        setSudahInputToken(false);
      } finally {
        setAuthChecked(true);
      }
    };    
  
    checkTokenRequirement();
  }, [courseId, userId]);  

  useEffect(() => {
    const userName = Cookies.get('user_id');
  
    if (!userName) {
      navigate('/login');
      return;
    }
  
    const checkAttempt = async () => {
      try {
        const res = await api.get(`/courses/${courseId}/status?user=${userName}`);
        const { sudahMaksimal, maxPercobaan, currentAttempt, useToken } = res.data;
  
        setMaxInfo({ max: maxPercobaan, current: currentAttempt });
  
        if (sudahMaksimal) {
          setBlocked(true);
        } else {
          setBlocked(false);
        }
      } catch (err) {
        console.error('❌ Gagal cek attempt:', err);
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };
  
    checkAttempt();
  }, [courseId, navigate]);  

  useEffect(() => {
    if (!showStartModal) {
      fetchSoal();
      fetchJawabanSiswa();
    }
  }, [showStartModal]);

  useEffect(() => {
    const cekWaktuUjian = async () => {
      if (!userId || !courseId) {
        console.warn("⛔ userId atau courseId belum tersedia. Abort cekWaktuUjian.");
        return;
      }
  
      try {
        const now = new Date();
  
        const res = await api.get(`/courses/${id}`);
        const mulai = new Date(res.data.tanggal_mulai);
        const selesai = res.data.tanggal_selesai ? new Date(res.data.tanggal_selesai) : null;
  
        if (now < mulai) {
          alert("Ujian belum dimulai. Silakan kembali nanti.");
          navigate("/courses");
          return;
        }
  
        if (selesai && now > selesai) {
          alert("Ujian telah berakhir.");
          navigate("/courses");
          return;
        }
  
        let waktuDetik = null;
        console.log("🔍 before fetchTimer:", { userId, courseId });
  
        try {
          const waktuRes = await api.get(`/answertrail/timer-get`, {
            params: {
              user_id: userId,
              course_id: courseId
            }
          });
          console.log("🔍 after fetchTimer:", waktuRes.data)
  
          waktuDetik = waktuRes.data.waktu_tersisa;
          console.log("🕒 Waktu tersisa dari DB:", waktuDetik);
        } catch (err) {
          console.warn("❗ Timer belum tersedia, pakai waktu default:", err.message);
        }
  
        if (waktuDetik == null) {
          waktuDetik = (res.data.waktu == null ? 0 : res.data.waktu * 60);
        }        
  
        setWaktuSisa(waktuDetik);
      } catch (err) {
        console.error("❌ Gagal cek waktu ujian:", err);
      }
    };
  
    if (!showStartModal) {
      cekWaktuUjian();
    }
  }, [showStartModal, courseId, userId, id, navigate, attemptNow]);

  useEffect(() => {
    if (!minWaktuSubmit || minWaktuSubmit <= 0) return;
  
    const interval = setInterval(() => {
      const secondsLeft = waktuSisa - minWaktuSubmit * 60;
      if (secondsLeft > 0) {
        setSubmitCountdown(secondsLeft);
      } else {
        setSubmitCountdown(0);
        clearInterval(interval);
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, [waktuSisa, minWaktuSubmit]);

  const formatMenitDetik = (totalDetik) => {
    const menit = Math.floor(totalDetik / 60);
    const detik = totalDetik % 60;
    return `${menit.toString().padStart(2, "0")}:${detik.toString().padStart(2, "0")}`;
  };  

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        const res = await api.get(`/jawaban/last-attempt`, {
          params: { user_id: userId, course_id: courseId },
        });
        setAttemptNow((res.data.lastAttempt || 0) + 1);
      } catch (err) {
        console.error("❌ Gagal ambil attempt:", err.message);
      }
    };
  
    fetchAttempt();
  }, [userId, courseId]);  

  useEffect(() => {
    if (showStartModal || soalList.length === 0 || waktuSisa <= 0) return;
  
    const timer = setInterval(() => {
      waktuRef.current -= 1;
      if (waktuRef.current <= 0) {
        clearInterval(timer);
        handleSelesaiUjian();
      } else {
        setWaktuSisa(waktuRef.current);
      }
    }, 1000);
  
    return () => clearInterval(timer);
  }, [showStartModal, soalList.length]);  

  const shuffleArray = (array) => {
    return array
      .map((a) => ({ sort: Math.random(), value: a }))
      .sort((a, b) => a.sort - b.sort)
      .map((a) => a.value);
  };

  useEffect(() => {
    waktuRef.current = waktuSisa;
  }, [waktuSisa]);  
  
  const fetchSoal = async () => {
    setIsLoading(true);
    try {
      const saved = localStorage.getItem(`timer-${userId}-${id}`);
      if (saved && !isNaN(saved)) {
        console.log("📦 Timer dari localStorage:", saved);
        setWaktuSisa(parseInt(saved));
        waktuRef.current = parseInt(saved);
      }
  
      const config = await api.get(`/courses/${id}`);
      setExamTitle(config.data.title || "Ujian Kompetensi");
  
      const waktuDefault = (config.data.waktu == null ? 0 : config.data.waktu * 60);
      setTotalWaktu(waktuDefault);
      setMinWaktuSubmit(config.data.minWaktuSubmit || 0);
      setConfigWaktu(config.data.waktu || 30);
  
      let waktuAktif = waktuDefault;
  
      try {
        const timerRes = await api.get(`/answertrail/timer-get`, {
          params: { user_id: userId, course_id: id }
        });
  
        const waktuDB = timerRes.data?.waktu_tersisa;
  
        if (waktuDB !== null && !isNaN(parseInt(waktuDB))) {
          waktuAktif = parseInt(waktuDB);
          console.log("🕒 Ambil waktu dari DB:", waktuAktif);
        } else {
          await api.post(`/answertrail/timer-save`, {
            user_id: userId,
            course_id: id,
            waktu_tersisa: waktuAktif,
          });
          console.log("🆕 Buat record timer pertama:", waktuAktif);
        }
      } catch (err) {
        console.warn("❗ Timer belum tersedia, pakai waktu default:", err.message);
      }
  
      setWaktuSisa(waktuAktif);
  
      const acakSoalFromServer = config.data.acakSoal;
      const acakJawabanFromServer = config.data.acakJawaban;
      setAcakSoal(acakSoalFromServer);
      setAcakJawaban(acakJawabanFromServer);
  
      const soalRes = await api.get(`/courses/${id}/questions`);
      const rawSoal = soalRes.data;
  
      console.log("📥 Soal Mentah dari Server:", rawSoal);
  
      const soalFinal = (acakSoalFromServer ? shuffleArray(rawSoal) : rawSoal).map((soal, index) => {
        const opsiOriginal = typeof soal.opsi === "string" ? JSON.parse(soal.opsi) : soal.opsi;
        const opsiFinal = acakJawabanFromServer ? shuffleArray([...opsiOriginal]) : [...opsiOriginal];
  
        const opsiCleaned = opsiFinal.map((opsiHTML) => {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(opsiHTML, "text/html");
            const firstNode = doc.body.firstChild;
  
            if (
              firstNode &&
              firstNode.nodeType === 1 &&
              firstNode.childNodes.length === 1 &&
              firstNode.firstChild.nodeType === 3 // TEXT_NODE
            ) {
              const rawText = firstNode.textContent;
              if (/^[A-Da-d]\.\s*/.test(rawText)) {
                firstNode.textContent = rawText.replace(/^[A-Da-d]\.\s*/, '');
                return firstNode.outerHTML;
              }
            }
  
            return opsiHTML;
          } catch {
            return opsiHTML;
          }
        });
  
        const opsiMapping = opsiFinal.map((opsi) => {
          const idxAsli = opsiOriginal.findIndex(o => o === opsi);
          return String.fromCharCode(65 + idxAsli);
        });
  
        console.log(`🔍 Soal #${index + 1}:`, soal.soal);
        console.log(`📦 Opsi Original:`, opsiOriginal);
        console.log(`🔀 Opsi Final:`, opsiFinal);
        console.log(`🧼 Opsi Cleaned:`, opsiCleaned);
        console.log(`🧭 Mapping ke huruf asli:`, opsiMapping);
  
        return {
          ...soal,
          opsi: opsiCleaned,
          opsiMapping,
        };
      });
  
      setSoalList(soalFinal);
    } catch (err) {
      console.error("❌ Gagal ambil soal:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIndex]);  
  
  useEffect(() => {
    if (userId && courseId && waktuSisa > 0) {
      localStorage.setItem(`timer-${userId}-${courseId}`, waktuSisa.toString());
    }
  }, [waktuSisa, userId, courseId]);  

  const fetchJawabanSiswa = async () => {
    try {
      const res = await api.get(`/answertrail/${id}`, {
        params: {
          user_id: userId,
          attemp: attemptNow,
        },
      });
  
      const hasil = {};
      let sisaWaktuFromDB = null;
  
      res.data.forEach(item => {
        hasil[item.question_id] = item.answer;
        if (item.waktu_tersisa !== null) {
          sisaWaktuFromDB = item.waktu_tersisa;
        }
      });
  
      setJawabanSiswa(hasil);
    } catch (err) {
      console.error("Gagal ambil jawaban sebelumnya:", err);
    }
  };  

  const simpanJawabanKeServer = async (soalId, jawaban) => {
    try {
      await api.post("/answertrail", {
        user_id: userId,
        course_id: id,
        soal_id: soalId,
        jawaban,
        attemp: attemptNow,
      });
  
      const waktu = totalWaktu - waktuSisa;
  
      await api.post("/studentworklog", {
        user_id: userId,
        course_id: id,
        soal_id: soalId,
        jawaban,
        attemp: attemptNow,
        waktu,
      });
    } catch (err) {
      console.error("❌ Gagal simpan jawaban/log:", err.response?.data || err.message || err);
    }
  };
  
  const submitJawabanUjian = async () => {
    try {
      const user_id = Cookies.get("user_id");
  
      const dataJawaban = Object.entries(jawabanSiswa).map(([soal_id, jawaban]) => ({
        soal_id: parseInt(soal_id),
        jawaban
      }));
  
      const timerKey = `timer-${userId}-${courseId}`;
      const timerData = localStorage.getItem(timerKey);
      let waktu_tersisa = null;
  
      if (timerData && !isNaN(timerData)) {
        waktu_tersisa = parseInt(timerData, 10);
        console.log("⏱️ waktu_tersisa yang dikirim ke backend:", waktu_tersisa);
      } else {
        console.warn("⚠️ Timer tidak ditemukan atau tidak valid");
      }
  
      await api.delete(`/answertrail/${id}`, {
        params: { user_id }
      });
  
      const res = await api.post(`/courses/${id}/submit`, {
        user_id,
        jawaban: dataJawaban,
        waktu_tersisa
      });
  
      const attemptId = res.data?.attempt;
      if (attemptId != null) {
        return attemptId;
      } else {
        console.warn("❗ Attempt tidak dikembalikan oleh server.");
        return null;
      }
    } catch (err) {
      console.error("❌ Gagal submit ujian:", err);
      return null;
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

  const simpanTimerKeServer = async (detikSisa) => {
    try {
      await api.post("/answertrail/timer-save", {
        user_id: userId,
        course_id: courseId,
        waktu_tersisa: detikSisa
      });
      console.log("🟢 Timer tersimpan:", detikSisa);
    } catch (err) {
      console.error("❌ Gagal simpan waktu:", err.message);
    }
  };  

  useEffect(() => {
    if (!userId || !courseId || soalList.length === 0 || showStartModal) return;
  
    const interval = setInterval(() => {
      simpanTimerKeServer(waktuRef.current);
    }, 5000);
  
    return () => clearInterval(interval);
  }, [userId, courseId, soalList.length, showStartModal]);   

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
    setLoadingSubmit(true);
  
    const attemptId = await submitJawabanUjian();
  
    if (attemptId != null) {
      localStorage.removeItem(`timer-${userId}-${courseId}`);
  
      try {
        await api.delete("/answertrail/timer-delete", {
          params: { user_id: userId, course_id: courseId }
        });
      } catch (err) {
        console.warn("❌ Gagal hapus timer:", err.message);
      }
  
      // ✅ Kirim status selesai ke backend
      try {
        await api.post("/exam/status", {
          user_id: userId,
          course_id: courseId,
          status: `Tidak Sedang mengerjakan`
        });
      } catch (err) {
        console.error("❌ Gagal update status selesai ujian:", err.message);
      }
  
      try {
        const res = await api.get(`/jawaban/show-result`, {
          params: { course_id: courseId }
        });
  
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage("UNLOCK");
        }
  
        const tampilkanHasil = res.data?.tampilkan_hasil;
        const analisisJawaban = res.data?.analisis_jawaban;
  
        if (tampilkanHasil) {
          navigate(`/courses/${courseId}/${userId}/${attemptId}/summary`);
        } else if (analisisJawaban) {
          navigate(`/courses/${courseId}/${userId}/${attemptId}/hasil`);
        } else {
          navigate(`/`);
        }
  
      } catch (err) {
        console.error("❌ Gagal cek hasil:", err.message);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage("UNLOCK");
        }
  
        navigate(`/`);
      }
  
    } else {
      alert("❌ Gagal simpan jawaban.");
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage("UNLOCK");
      }
    }
  
    setLoadingSubmit(false);
  };  
  
  const currentSoal = soalList[currentIndex];
  
  const opsiArray = currentSoal ? (
    typeof currentSoal.opsi === "string" 
    ? JSON.parse(currentSoal.opsi) 
    : currentSoal.opsi || []
  ) : [];

  const formatWaktu = (detik) => {
    if (typeof detik !== 'number' || isNaN(detik) || detik < 0) detik = 0;
    const jam = Math.floor(detik / 3600).toString().padStart(2, '0');
    const menit = Math.floor((detik % 3600) / 60).toString().padStart(2, '0');
    const dtk = (detik % 60).toString().padStart(2, '0');
    return `${jam}:${menit}:${dtk}`;
  };  

  const renderSidebarContent = () => (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 gap-2 mb-4">
          {soalList.map((soal, index) => {
            const isCurrent = index === currentIndex;
            const isAnswered = jawabanSiswa[soal.id];
            const isMarked = raguRagu[soal.id];
            let btnClass = 'bg-gray-200 text-gray-700 hover:bg-gray-300';
            if (isAnswered) btnClass = 'bg-green-500 text-white hover:bg-green-600';
            if (isMarked) btnClass = 'bg-yellow-400 text-white hover:bg-yellow-500';
            if (isCurrent) btnClass = 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1';
            return (
              <button
                key={soal.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setShowSidebar(false);
                }}
                className={`w-10 h-10 rounded-md font-bold text-sm transition-all duration-200 flex items-center justify-center ${btnClass}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 border-t pt-3">
        <h4 className="text-sm font-semibold text-gray-600 mb-3">Legenda:</h4>
        <ul className="space-y-2 text-xs text-gray-600">
          <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-green-500"></div><span>Sudah Dijawab</span></li>
          <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-yellow-400"></div><span>Ragu-ragu</span></li>
          <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-gray-200"></div><span>Belum Dijawab</span></li>
          <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-blue-600"></div><span>Soal Aktif</span></li>
        </ul>
      </div>
    </>
  );  

  const isSubmitAllowed = () => {
    if (!minWaktuSubmit || isNaN(minWaktuSubmit) || minWaktuSubmit <= 0) {
      return true;
    }
  
    return waktuSisa <= minWaktuSubmit * 60;
  };   

  if (blocked) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Kesempatan Habis</h1>
        <p className="text-gray-600">
          Anda sudah mencapai maksimal percobaan ({maxInfo?.max}x). Silakan hubungi guru.
        </p>
        <button
          onClick={() => navigate("/courses")}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Kembali
        </button>
      </div>
    );
  }

  if (showStartModal) {
    if (authChecked && !sudahInputToken) {
      return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm text-center">
            <h2 className="text-xl font-bold mb-2 text-red-600">Token Belum Divalidasi</h2>
            <p className="text-gray-600 mb-4">Anda belum memasukkan token ujian. Silakan kembali dan masukkan token terlebih dahulu.</p>
            <button
              onClick={() => navigate(-1)}
              className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 font-semibold"
            >
              Kembali
            </button>
          </div>
        </div>
      );
    }
  
    if (!authChecked) {
      return (
        <div className="flex justify-center items-center h-screen">
          <p className="text-gray-600 text-lg">Memverifikasi token ujian...</p>
        </div>
      );
    }
  
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
  onClick={async () => {
    try {
      // Kirim status Mengerjakan ke backend
      await api.post("/exam/status", {
        user_id: Cookies.get("user_id"),
        course_id: courseId,
        status: `Mengerjakan - ${courseTitle}`
      });

      // LOCK perangkat jika dari React Native WebView
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage("LOCK");
      }

      // Tutup modal mulai
      setShowStartModal(false);
    } catch (err) {
      console.error("❌ Gagal memulai ujian:", err);
      alert("Gagal memulai ujian. Coba lagi.");
    }
  }}
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
          <h1 className="text-xl font-bold text-gray-800">Ujian {examTitle}</h1>
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
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto min-w-0">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="prose max-w-none mb-6 text-gray-800" dangerouslySetInnerHTML={{ __html: currentSoal.soal }} />
  
            <div className="space-y-3">
              {opsiArray.map((opsi, idx) => {
                const huruf = String.fromCharCode(65 + idx);
                const opsiAsli = currentSoal.opsiMapping[idx].slice(0, 1);
                const isSelected = jawabanSiswa[currentSoal.id] === opsiAsli;
  
                return (
                  <label
                    key={idx}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      isSelected ? "bg-blue-50 border-blue-500 shadow-sm" : "bg-white border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`soal-${currentSoal.id}`}
                      value={opsiAsli}
                      checked={isSelected}
                      onChange={() => handleJawab(currentSoal.id, opsiAsli)}
                      className="hidden"
                    />
                    <span
                      className={`flex items-center justify-center w-6 h-6 mr-4 border rounded-full text-sm font-bold ${
                        isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-400 text-gray-600"
                      }`}
                    >
                      {huruf}
                    </span>
                    <span
                      className="text-gray-700 prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: opsi.replace(/^<span[^>]*>[A-D]\.\s*<br\/?>/i, '') }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
  
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => toggleRagu(currentSoal.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  raguRagu[currentSoal.id]
                    ? "bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <FiFlag />
                {raguRagu[currentSoal.id] ? "Hapus Tanda" : "Tandai Ragu-Ragu"}
              </button>
  
              <button
                onClick={() => {
                  const updated = { ...jawabanSiswa };
                  delete updated[currentSoal.id];
                  setJawabanSiswa(updated);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-red-600 border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
              >
                🗑️ Hapus Pilihan
              </button>
            </div>
  
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronLeft />
                Sebelumnya
              </button>
  
              {currentIndex === soalList.length - 1 ? (
                isSubmitAllowed() ? (
                  <button
                    onClick={() => setShowSelesaiModal(true)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Selesai Ujian
                  </button>
                ) : (
                  <div className="text-center">
                    <button
                      disabled
                      className="bg-gray-300 text-gray-500 cursor-not-allowed px-6 py-2 rounded-lg font-semibold mb-2"
                      title={`Jawaban hanya bisa dikirim jika sisa waktu ≤ ${minWaktuSubmit} menit.`}
                    >
                      Tidak Bisa Submit
                    </button>
                    {minWaktuSubmit > 0 && waktuSisa > minWaktuSubmit * 60 && (
                      <p className="text-sm text-gray-500">
                        Bisa submit dalam{" "}
                        <span className="font-semibold text-blue-600">
                          {formatMenitDetik(waktuSisa - minWaktuSubmit * 60)}
                        </span>
                      </p>
                    )}
                  </div>
                )
              ) : (
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(soalList.length - 1, i + 1))}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Selanjutnya <FiChevronRight />
                </button>
              )}
            </div>
          </div>
        </main>
  
        <aside className="hidden md:block w-72 bg-white border-l border-gray-200 p-4 flex flex-col overflow-y-auto">
          {renderSidebarContent()}
        </aside>
  
        {showSidebar && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-end md:hidden">
            <div className="w-11/12 max-w-xs bg-white p-4 shadow-xl h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold text-gray-800">Navigasi Soal</h3>
                <button onClick={() => setShowSidebar(false)} className="text-gray-500 hover:text-gray-800">✖</button>
              </div>
              {renderSidebarContent()}
            </div>
          </div>
        )}
      </div>
  
      <button
        className="md:hidden fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-40"
        onClick={() => setShowSidebar(true)}
      >
        🧭
      </button>
  
      {showSelesaiModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center transform transition-all">
            <FiAlertTriangle className="text-yellow-500 mx-auto text-5xl mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Akhiri Ujian?</h2>
            <p className="mb-6 text-gray-600">
              Apakah Anda yakin ingin menyelesaikan dan mengirim semua jawaban Anda sekarang?
            </p>
  
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowSelesaiModal(false)}
                disabled={loadingSubmit}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  loadingSubmit ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Batal
              </button>
  
              <button
                onClick={async () => {
                  setLoadingSubmit(true);
                  await handleSelesaiUjian();
                  setLoadingSubmit(false);
                }}
                disabled={loadingSubmit}
                className={`px-6 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                  loadingSubmit ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                } text-white transition`}
              >
                {loadingSubmit ? (
                  <>
                    <ImSpinner2 className="animate-spin text-xl" />
                    Menyimpan...
                  </>
                ) : (
                  'Ya, Kirim Jawaban'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );  
}

export default DoExamPage;