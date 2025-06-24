import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiSearch, FiBookOpen, FiSettings, FiTrash2, FiChevronRight, FiAlertCircle, FiLoader } from "react-icons/fi";

function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState("all");
  const [search, setSearch] = useState("");
  const [siswaKelas, setSiswaKelas] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMap, setStatusMap] = useState({});

  const navigate = useNavigate();
  const role = Cookies.get("role");
  const name = Cookies.get("name");
  const userId = Cookies.get("user_id");

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        await fetchKelasList();
        if (role === "siswa") {
          const userRes = await api.get(`/users?name=${encodeURIComponent(name)}`);
          if (userRes.data && userRes.data.kelas) {
            setSiswaKelas(userRes.data.kelas);
            await fetchCourses(userRes.data.kelas);
            const courseRes = await api.get(`/courses?kelas=${userRes.data.kelas}`);
            await fetchStatusMap(courseRes.data);
          }
        } else {
          await fetchCourses();
          const res = await api.get("/courses");
          await fetchStatusMap(res.data);
        }
      } catch (err) {
        console.error("❌ Gagal memuat data awal:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [role, name]);

  const fetchCourses = async (kelasSiswa = null) => {
    try {
      const url = kelasSiswa ? `/courses?kelas=${kelasSiswa}` : "/courses";
      const res = await api.get(url);
      setCourses(res.data);
    } catch (err) {
      console.error("❌ Gagal ambil courses:", err);
    }
  };

  const fetchKelasList = async () => {
    try {
      const res = await api.get("/data/kelas");
      setKelasList(res.data);
    } catch (err) {
      console.error("Gagal ambil data kelas:", err);
    }
  };

  const fetchStatusMap = async (courseList) => {
    const map = {};
    for (const course of courseList) {
      try {
        const res = await api.get(`/courses/${course.id}/status?user=${userId}`);
        map[course.id] = res.data;
      } catch (err) {
        console.error(`Gagal ambil status course ${course.id}:`, err);
      }
    }
    setStatusMap(map);
  };

  const filteredCourses = courses.filter((course) => {
    const matchKelas =
      selectedKelas === "all" ||
      (Array.isArray(course.kelas)
        ? course.kelas.includes(selectedKelas)
        : course.kelas === selectedKelas);

    const matchSearch = course.nama
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchKelas && matchSearch;
  });

  const handleManageClick = (id) => {
    navigate(`/courses/${id}/manage`);
  };

  const handleDeleteCourse = async (id) => {
    const konfirmasi = window.confirm("Anda yakin ingin menghapus course ini secara permanen?");
    if (!konfirmasi) return;

    try {
      await api.delete(`/courses/${id}`);
      alert("✅ Course berhasil dihapus");
      setCourses(courses.filter(c => c.id !== id));
    } catch (err) {
      console.error("Gagal hapus course:", err);
      alert("❌ Gagal menghapus course");
    }
  };

  const handleDoClick = async (courseId) => {
    try {
      const res = await api.get(`/courses/${courseId}/status?user=${userId}`);
      const { sudahMaksimal, useToken } = res.data;

      if (sudahMaksimal) {
        return alert("❌ Kesempatan Anda untuk mengerjakan course ini sudah habis.");
      }

      if (useToken) {
        setSelectedCourseId(courseId);
        setTokenInput("");
        setShowTokenModal(true);
      } else {
        navigate(`/courses/${courseId}/do`);
      }
    } catch (err) {
      console.error("Gagal cek status course:", err);
      alert("❌ Terjadi kesalahan saat memeriksa status course.");
    }
  };

  const handleSubmitToken = async (e) => {
    e.preventDefault();
    if (!tokenInput) return;
  
    try {
      const res = await api.post(`/courses/${selectedCourseId}/validate-token`, {
        token: tokenInput,
        user: userId,
      });
  
      if (res.data.valid) {
        await api.post("/courses/tokenAuth", {
          course_id: selectedCourseId,
          user_id: userId,
        });
  
        setShowTokenModal(false);
        navigate(`/courses/${selectedCourseId}/do`);
      } else {
        alert("❌ Token salah atau sudah kedaluwarsa.");
      }
    } catch (err) {
      console.error("❌ Gagal validasi token:", err);
      alert("Gagal memvalidasi token.");
    }
  };  

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <FiLoader className="animate-spin text-4xl text-indigo-600" />
        <p className="ml-3 text-lg text-slate-700">Memuat Courses...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Courses</h1>
            <p className="text-slate-500 mt-1">Selamat datang kembali, {name}. Pilih course untuk dimulai.</p>
          </div>
          {role !== "siswa" && (
            <button
              onClick={() => navigate("/createcourses")}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <FiPlus />
              Buat Course Baru
            </button>
          )}
        </header>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-slate-300 pl-10 pr-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="border border-slate-300 px-4 py-2 rounded-lg w-full sm:w-52 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            <option value="all">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.nama_kelas}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <FiAlertCircle className="mx-auto text-5xl text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">Tidak Ada Course Ditemukan</h3>
            <p className="text-slate-500 mt-2">Coba ubah kata kunci pencarian atau filter kelas Anda.</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
              >
                <div className="h-40 bg-indigo-200 flex items-center justify-center">
                  <FiBookOpen className="text-5xl text-indigo-400" />
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <p className="text-sm font-semibold text-indigo-600">
                    Kelas: {Array.isArray(course.kelas) ? course.kelas.join(", ") : course.kelas}
                  </p>
                  <h3 className="text-xl font-bold text-slate-800 mt-1 truncate">{course.nama}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Oleh: {course.pengajar}
                  </p>
                  <p className="text-slate-600 mt-3 text-sm flex-grow line-clamp-2">{course.deskripsi}</p>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 mt-auto">
                  {role === "siswa" ? (
                    statusMap[course.id]?.sudahMaksimal ? (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Anda telah mengerjakan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDoClick(course.id)}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                      >
                        Mulai Kerjakan <FiChevronRight />
                      </button>
                    )
                  ) : (
                    <div className="flex justify-between items-center gap-2">
                      <button
                        onClick={() => handleManageClick(course.id)}
                        className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <FiSettings /> Manage
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                      >
                        <FiTrash2 /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300"
          onClick={() => setShowTokenModal(false)}>
          <div className="bg-white p-7 rounded-xl shadow-2xl w-full max-w-sm mx-4 transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Masukkan Token</h3>
            <p className="text-slate-500 mb-6">Course ini memerlukan token untuk memulai.</p>
            <form onSubmit={handleSubmitToken}>
              <input
                type="text"
                maxLength={6}
                className="border border-slate-300 px-4 py-3 rounded-lg w-full mb-4 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                placeholder="A B C 1 2 3"
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="px-5 py-2 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursesPage;
