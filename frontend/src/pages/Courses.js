import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import api from "../api";
import { useNavigate } from "react-router-dom";
import {
  FiPlus, FiSearch, FiBookOpen, FiSettings,
  FiTrash2, FiChevronRight, FiAlertCircle, FiLoader
} from "react-icons/fi";

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
  const [openFolders, setOpenFolders] = useState({});
  const [subfolders, setSubfolders] = useState([]);
  const [movingCourse, setMovingCourse] = useState(false);

  const navigate = useNavigate();
  const role = Cookies.get("role");
  const name = Cookies.get("name");
  const userId = Cookies.get("user_id");

  const now = new Date();

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await fetchKelasList();
      await fetchSubfolders();

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

  useEffect(() => {
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

  const fetchSubfolders = async () => {
    try {
      const res = await api.get("/subfolders");
      setSubfolders(res.data);
    } catch (err) {
      console.error("Gagal ambil subfolders:", err);
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

    const matchSearch = course.nama.toLowerCase().includes(search.toLowerCase());

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
      // Ambil detail course
      const detailRes = await api.get(`/courses/${courseId}`);
      const course = detailRes.data;
  
      const now = new Date();
      const mulai = new Date(course.tanggal_mulai);
      const selesai = course.tanggal_selesai ? new Date(course.tanggal_selesai) : null;
  
      if (now < mulai) {
        return alert("⏳ Ujian belum dimulai. Silakan cek lagi nanti.");
      }
  
      if (selesai && now > selesai) {
        return alert("🕔 Waktu ujian sudah berakhir.");
      }
  
      // Cek status pengerjaan
      const statusRes = await api.get(`/courses/${courseId}/status?user=${userId}`);
      const { sudahMaksimal, useToken } = statusRes.data;
  
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
      console.error("❌ Gagal cek waktu/status course:", err);
      alert("Terjadi kesalahan saat memeriksa status course.");
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

  const grouped = {};

  subfolders.forEach((folder) => {
    grouped[folder.name] = [];
  });

  let tanpaFolderCourses = [];

  filteredCourses.forEach((course) => {
    const folder = course.subfolder;
    if (folder) {
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(course);
    } else {
      tanpaFolderCourses.push(course);
    }
  });

  if (tanpaFolderCourses.length > 0) {
    grouped["Tanpa Folder"] = tanpaFolderCourses;
  }

  const toggleVisibility = async (id, currentHidden) => {
    try {
      await api.put(`/courses/${id}/toggle-visibility`, {
        hidden: !currentHidden,
      });
      fetchCourses();
    } catch (err) {
      console.error("🚫 Gagal toggle visibility:", err);
      alert("Gagal mengubah visibilitas course");
    }
  };

  const toggleFolder = (folderName) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const renameFolder = async (oldName, newName) => {
    try {
      await api.put(`/subfolders/${encodeURIComponent(oldName)}/rename`, { newName });
      await fetchSubfolders();
      await fetchCourses();
    } catch (err) {
      console.error("❌ Gagal rename folder:", err);
      alert("Gagal rename folder.");
    }
  };  

  const toggleSubfolderVisibility = async (folderName) => {
    try {
      const hidden = !grouped[folderName].every(c => c.hidden);
      await api.put(`/subfolders/${encodeURIComponent(folderName)}/toggle-visibility`, { hidden });
      await fetchCourses();
    } catch (err) {
      alert("Gagal mengubah visibilitas folder");
      console.error(err);
    }
  };

  const moveCourse = async (courseId, toSubfolderName) => {
    setMovingCourse(true);
    try {
      await api.put("/subfolders/move-course", {
        courseId,
        toSubfolderId: toSubfolderName === "Tanpa Folder" ? null : toSubfolderName
      });
      await fetchInitialData();
    } catch (err) {
      console.error("Gagal memindahkan course:", err);
      alert("❌ Gagal memindahkan course.");
    } finally {
      setMovingCourse(false);
    }
  }; 

  const createSubfolder = async () => {
    const name = prompt("Masukkan nama folder baru:");
    if (name) {
      try {
        await api.post("/subfolders", { name });
        await fetchInitialData();
      } catch (err) {
        alert("❌ Gagal membuat folder");
        console.error(err);
      }
    }
  };  

  const handleDeleteSubfolder = async (folderName) => {
    const konfirmasi = window.confirm(`Yakin ingin menghapus folder "${folderName}" beserta seluruh pengelompokannya?`);
    if (!konfirmasi) return;
  
    try {
      await api.delete(`/subfolders/${encodeURIComponent(folderName)}`);
      await fetchInitialData(); // refresh data
      alert("✅ Folder berhasil dihapus");
    } catch (err) {
      console.error("❌ Gagal hapus folder:", err);
      alert("Gagal menghapus folder.");
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
            <p className="text-slate-500 mt-1">
              Selamat datang kembali, {name}. Pilih course untuk dimulai.
            </p>
          </div>
          {role == "admin" && (
            <div className="flex gap-3">
              <button
                onClick={createSubfolder}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                <FiPlus /> Folder Baru
              </button>
            </div>
          )}
          {role !== "siswa" && (
          <div>
              <button
                onClick={() => navigate("/createcourses")}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700"
              >
                <FiPlus /> Buat Course
              </button>
            </div>
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
              className="border border-slate-300 pl-10 pr-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="border border-slate-300 px-4 py-2 rounded-lg w-full sm:w-52 bg-white"
          >
            <option value="all">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.nama_kelas}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
        </div>
  
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <FiAlertCircle className="mx-auto text-5xl text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">Tidak Ada Course Ditemukan</h3>
            <p className="text-slate-500 mt-2">Coba ubah kata kunci pencarian atau filter kelas Anda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([folderName, coursesInFolder]) => {
              const isHiddenForSiswa = role === "siswa" && coursesInFolder.every((c) => c.hidden);
              if (isHiddenForSiswa) return null;
  
              const visibleCourses = coursesInFolder.filter((course) => {
                if (role === "siswa" && course.hidden) return false;
                const matchKelas =
                  selectedKelas === "all" ||
                  (Array.isArray(course.kelas)
                    ? course.kelas.includes(selectedKelas)
                    : course.kelas === selectedKelas);
                const matchSearch = course.nama.toLowerCase().includes(search.toLowerCase());
                return matchKelas && matchSearch;
              });
  
              return (
                <div key={folderName} className="bg-white rounded-lg shadow-md mb-4 border border-slate-200">
                  {/* Folder Header */}
                  <div
                    className="flex justify-between items-center px-5 py-3 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    onClick={() => toggleFolder(folderName)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-semibold text-slate-800">{folderName}</span>
                      <span className="text-sm text-slate-500">({visibleCourses.length} course)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {role === "admin" && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt(`Ganti nama subfolder:`, folderName);
                            if (newName && newName !== folderName) renameFolder(folderName, newName);
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubfolder(folderName);
                          }}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Hapus Folder
                        </button>
                      </>
                    )}
                      <span className="text-indigo-600 text-lg">
                        {openFolders[folderName] ? "🔽" : "▶️"}
                      </span>
                    </div>
                  </div>
  
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      openFolders[folderName] ? "max-h-[3000px]" : "max-h-0 overflow-hidden"
                    }`}
                  >
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-6 pt-4">
                      {visibleCourses.map((course) => (
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
                            <p className="text-sm text-slate-500">Waktu: {new Date(course.tanggal_mulai).toLocaleString()}</p>
                            <p className="text-sm text-slate-500 mt-1">Oleh: {course.pengajar}</p>
                            <p className="text-slate-600 mt-3 text-sm flex-grow line-clamp-2">
                              {course.deskripsi}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 border-t border-slate-200 mt-auto">
                            {role === "siswa" ? (
                              (() => {
                                const mulai = new Date(course.tanggal_mulai);
                                const selesai = course.tanggal_selesai ? new Date(course.tanggal_selesai) : null;
                                const now = new Date();
                                const sudahMaksimal = statusMap[course.id]?.sudahMaksimal;
                                const belumMulai = now < mulai;

                                return (
                                  <>

                                    {sudahMaksimal ? (
                                      <button
                                        disabled
                                        className="w-full flex items-center justify-center gap-2 bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
                                      >
                                        Anda telah mengerjakan
                                      </button>
                                    ) : belumMulai ? (
                                      <button
                                        disabled
                                        className="w-full flex items-center justify-center gap-2 bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
                                      >
                                        Belum Waktunya
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleDoClick(course.id)}
                                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
                                      >
                                        Mulai Kerjakan <FiChevronRight />
                                      </button>
                                    )}
                                  </>
                                );
                              })()
                            ) : (
                              <div className="flex flex-col gap-2 mt-2">
                                <div className="flex justify-between items-center gap-2">
                                  <button
                                    onClick={() => handleManageClick(course.id)}
                                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                  >
                                    <FiSettings /> Manage
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCourse(course.id)}
                                    className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700"
                                  >
                                    <FiTrash2 /> Hapus
                                  </button>
                                </div>

                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={!course.hidden}
                                    onChange={() => toggleVisibility(course.id, course.hidden)}
                                    className="w-4 h-4"
                                  />
                                  Tampilkan untuk siswa
                                </label>

                                <div className="mt-1">
                                  <label className="text-xs text-slate-500 block mb-1">Pindah ke folder:</label>
                                  <select
                                    value={subfolders.find(f => f.id === course.subfolder_id)?.name || "Tanpa Folder"}
                                    onChange={async (e) => await moveCourse(course.id, e.target.value)}
                                    className="w-full border border-slate-300 px-2 py-1 rounded text-sm bg-white"
                                  >
                                    <option value="Tanpa Folder">Tanpa Folder</option>
                                    {subfolders.map((f) => (
                                      <option key={f.name} value={f.name}>
                                        {f.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CoursesPage;
