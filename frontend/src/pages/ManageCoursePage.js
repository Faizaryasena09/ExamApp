import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import Cookies from "js-cookie";
import MngNavbar from "../components/ManageNavbar";
import { toast } from "../utils/toast";
import { uploadImageToServer } from "../utils/uploadImageToServer";
import JoditEditor from "jodit-react";
import { FiEye } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import * as docx from 'docx';
import { saveAs } from 'file-saver';
import { convert } from 'html-to-text';

// KOMPONEN MODAL SUDAH TIDAK DIPERLUKAN
// import ParsingModal from "../components/ParsingModal";

window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

function ManageCoursePage() {
  const { id } = useParams();
  const role = Cookies.get("role");
  const navigate = useNavigate();
  const { id: courseId } = useParams();
  const [kelasList, setKelasList] = useState([]);

  const [form, setForm] = useState({
    nama: "",
    kelas: [],
    tanggalMulai: "",
    waktuMulai: "",
    enableTanggalSelesai: false,
    tanggalSelesai: "",
    waktuSelesai: "",
    waktuMode: "30",
    waktuCustom: "",
    deskripsi: "",
    maxPercobaan: 1,
    tampilkanHasil: false,
    useToken: false,
    tokenValue: "",
    minWaktuSubmit: false,
    minWaktuSubmitValue: "",
    logPengerjaan: false,
    analisisJawaban: false,
  });

  const [soalList, setSoalList] = useState([]);
  const [acakSoal, setAcakSoal] = useState(false);
  const [acakJawaban, setAcakJawaban] = useState(false);
  const [activeSoalIndex, setActiveSoalIndex] = useState(null);
  const [activeOpsiIndex, setActiveOpsiIndex] = useState({ soal: null, opsi: null });
  
  // --- STATE BARU UNTUK PARSING --- 
  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedSoal, setParsedSoal] = useState([]); // State untuk menampung hasil parse
  // --- END STATE BARU ---

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);

  useEffect(() => {
    fetchCourse();
    fetchKelas();
    fetchSoalFromDB();
  }, []);

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      const c = res.data;
  
      setForm({
        nama: c.nama || "",
        kelas: Array.isArray(c.kelas) ? c.kelas : [c.kelas],
        tanggalMulai: c.tanggal_mulai?.split("T")[0] || "",
        waktuMulai: c.tanggal_mulai?.split("T")[1]?.slice(0, 5) || "",
        enableTanggalSelesai: !!c.tanggal_selesai,
        tanggalSelesai: c.tanggal_selesai?.split("T")[0] || "",
        waktuSelesai: c.tanggal_selesai?.split("T")[1]?.slice(0, 5) || "",
        waktuMode: [30, 45, 60, 120].includes(c.waktu)
          ? String(c.waktu)
          : c.waktu === null
          ? "unlimited"
          : "custom",
        waktuCustom: ![30, 45, 60, 120].includes(c.waktu) ? c.waktu : "",
        deskripsi: c.deskripsi || "",
        maxPercobaan: parseInt(c.maxPercobaan) || 1,
        tampilkanHasil: Boolean(c.tampilkanHasil),
        useToken: Boolean(c.useToken),
        tokenValue: c.tokenValue || "",
        acakSoal: Boolean(c.acakSoal),
        acakJawaban: Boolean(c.acakJawaban),
        minWaktuSubmit: Boolean(c.minWaktuSubmit && c.minWaktuSubmit > 0),
        minWaktuSubmitValue: c.minWaktuSubmit ? String(c.minWaktuSubmit) : "",
        logPengerjaan: Boolean(c.logPengerjaan),
        analisisJawaban: Boolean(c.analisisJawaban),      
      });
    } catch (err) {
      console.error("❌ Gagal ambil course:", err);
    }
  };   

  const fetchKelas = async () => {
    try {
      if (role === "guru") {
        const namaGuru = Cookies.get("name");
        const res = await api.get(`/guru-kelas/nama/${encodeURIComponent(namaGuru)}`);
        const filtered = res.data.map((nama, idx) => ({
          id: idx + 1,
          nama_kelas: nama,
        }));
        setKelasList(filtered);
      } else {
        const res = await api.get("/data/kelas");
        setKelasList(res.data);
      }
    } catch (err) {
      console.error("Gagal ambil kelas:", err);
    }
  };  

  const handleSubmit = async (e) => {
    e.preventDefault();
    const waktu =
      form.waktuMode === "custom"
        ? parseInt(form.waktuCustom)
        : form.waktuMode === "unlimited"
        ? null
        : parseInt(form.waktuMode);
  
    const payload = {
      nama: form.nama,
      kelas: form.kelas,
      tanggal_mulai: `${form.tanggalMulai}T${form.waktuMulai}`,
      tanggal_selesai: form.enableTanggalSelesai
        ? `${form.tanggalSelesai}T${form.waktuSelesai}`
        : null,
      waktu,
      deskripsi: form.deskripsi,
  
      maxPercobaan: parseInt(form.maxPercobaan),
      tampilkanHasil: form.tampilkanHasil,
      useToken: form.useToken,
      tokenValue: form.useToken ? form.tokenValue.trim().slice(0, 6) : null,
      acakSoal: form.acakSoal,
      acakJawaban: form.acakJawaban,
      minWaktuSubmit: form.minWaktuSubmit ? parseInt(form.minWaktuSubmitValue) : 0,
      logPengerjaan: form.logPengerjaan,
      analisisJawaban: form.analisisJawaban,
    };
  
    try {
      await api.put(`/courses/${id}`, payload);
      toast.success("Konfigurasi berhasil disimpan!");
    } catch (err) {
      console.error("Gagal simpan konfigurasi:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const fetchSoalFromDB = async () => {
    try {
      const res = await api.get(`/courses/${id}/questions`);
  
      const soalFormatted = res.data.map((item) => ({
        id: item.id,
        soal: item.soal,
        opsi: Array.isArray(item.opsi)
          ? item.opsi
          : JSON.parse(item.opsi || "[]"),
        jawaban: item.jawaban ? item.jawaban.replace(/\./g, "").trim() : "", // hapus titik & spasi
        tipe_soal: item.tipe_soal || 'pilihan_ganda' // Tambahkan ini
      }));
  
      setSoalList(soalFormatted);
    } catch (err) {
      console.error("❌ Gagal ambil soal dari DB:", err);
    }
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith(".zip")) {
      setSelectedFile(file);
    } else {
      toast.error("Hanya file .zip yang didukung!");
      setSelectedFile(null);
    }
  };

  // --- FUNGSI PARSING BARU ---
  const handleProcessFile = async () => {
    if (!selectedFile) {
      return toast.error("Pilih file .zip terlebih dahulu!");
    }
    setIsParsing(true);
    setParsedSoal([]); // Kosongkan hasil sebelumnya

    try {
      const formData = new FormData();
      formData.append("file", selectedFile, selectedFile.name);

      const response = await api.post("/upload/parse-zip", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Tampilkan teks mentah dari backend untuk debugging
      console.log("--- RAW TEXT FROM BACKEND ---", response.data.text);
      toast.info("Proses selesai. Cek konsol browser (F12) untuk melihat teks mentah.");
      
      // Logika parsing dan preview untuk sementara dinonaktifkan
      // const structuredQuestions = response.data;
      // if (structuredQuestions && structuredQuestions.length > 0) { ... }
    } catch (err) {
      console.error("Zip parse error:", err);
      const errorMessage = err.response?.data?.message || "Gagal memproses file di server.";
      toast.error(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  // --- FUNGSI UNTUK MENERAPKAN & LANGSUNG SIMPAN SOAL HASIL PARSE ---
  const handleApplyParsedSoal = async () => {
    if (parsedSoal.length === 0) {
      return toast.error("Tidak ada soal hasil parsing untuk diterapkan.");
    }

    // Gabungkan soal yang ada dengan soal hasil parsing
    const combinedSoalList = [...soalList, ...parsedSoal];

    try {
      // Langsung kirim gabungan soal ke server untuk disimpan
      await api.post(`/courses/${id}/questions/save`, {
        soal: combinedSoalList,
        acakSoal, // Kirim juga konfigurasi acak
        acakJawaban,
      });

      toast.success("Soal berhasil diimpor dan langsung disimpan ke database!");
      
      // Kosongkan area preview dan input file
      setParsedSoal([]); 
      setSelectedFile(null);
      
      // Muat ulang (re-fetch) daftar soal dari database untuk menampilkan data terbaru
      fetchSoalFromDB(); 

    } catch (err) {
      console.error("Gagal simpan soal dari parse:", err);
      toast.error("Gagal menyimpan soal yang sudah diparsing ke database.");
    }
  };

  const handleSimpanSoal = async () => {
    try {
      soalList.forEach((s, i) => {
      });
  
      await api.post(`/courses/${id}/questions/save`, {
        soal: soalList,
        acakSoal,
        acakJawaban,
      });
  
      alert("✅ Soal berhasil disimpan!");
    } catch (err) {
      console.error("❌ Gagal simpan soal:", err);
      alert("Gagal menyimpan soal");
    }
  };  

  function isImageOnly(html) {
    return html.includes("<img");
  }

  function toAbsoluteImageSrc(html) {
    const rawBaseURL = api.defaults.baseURL || "http://localhost:5000/api";
    const baseURL = rawBaseURL.replace(/\/$/, "");
    return html.replace(/src="\/uploads/g, `src="${baseURL}/uploads`);
  }
  
  const handleSoalChange = (index, htmlContent) => {
    const updated = [...soalList];
    updated[index].soal = htmlContent;
    setSoalList(updated);
  };

  const handleOpsiChange = (index, opsiIdx, htmlContent) => {
    const updated = [...soalList];
    updated[index].opsi[opsiIdx] = htmlContent;
    setSoalList(updated);
  };

  const hapusLabelHuruf = (teks) => {
    if (!teks) return '';
    return teks.replace(/^[A-Z]\.\s*/, '');
  };

  const editorSoalRef = useRef(null);
  const labelHuruf = (i) => String.fromCharCode(65 + i) + '. ';
    const editorOpsiRef = useRef(null);

  const handleDownloadDocx = async () => {
    // ... (fungsi ini tetap sama)
  };

  const getImageBuffer = async (url) => {
    // ... (fungsi ini tetap sama)
  };

    const createDocxContent = async (soalList) => {
    // ... (fungsi ini tetap sama)
  };

  const processHtml = async (html) => {
    // ... (fungsi ini tetap sama)
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          🛠️ Manage Assesmen: {form.nama || "Memuat..."}
        </h1>
        </div>
        <MngNavbar />

        <div className="bg-white p-8 rounded-lg shadow-md mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-6 border-b pb-4">Konfigurasi Ujian</h2>
          {/* FORM KONFIGURASI TETAP SAMA */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... semua elemen form ... */}
          </form>
        </div>

        {/* MODAL DIHAPUS DARI SINI */}

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Manajemen Soal</h2>
          <p className="text-sm text-gray-500 mb-6">Upload soal dari file atau tambahkan soal secara manual.</p>
          
          {/* --- AREA PARSING BARU -- */}
          <div className="border rounded-lg p-4 mb-8 bg-gray-50">
             <h3 className="text-lg font-semibold text-gray-800 mb-4">Import Soal dari File</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                <label htmlFor="upload-soal" className="block text-sm font-medium text-gray-600 mb-2">
                    📤 Upload File (.zip dari "Save as Web Page, Filtered")
                </label>
                <div className="flex items-center gap-4">
                    <input
                    id="upload-soal"
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <button
                    onClick={handleProcessFile}
                    disabled={!selectedFile || isParsing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                    {isParsing ? 'Memproses...' : 'Parse Soal'}
                    </button>
                </div>
                </div>
            </div>

            {/* --- AREA PREVIEW HASIL PARSING --- */}
            {parsedSoal.length > 0 && (
                <div className="mt-6 border-t pt-6">
                    <h4 className="text-md font-semibold text-gray-700">Preview Hasil Parsing ({parsedSoal.length} soal)</h4>
                    <div className="mt-4 max-h-96 overflow-y-auto space-y-4 p-4 bg-white rounded-md border">
                        {parsedSoal.map((soal, index) => (
                        <div key={index} className="border-b pb-2">
                            <div className="font-semibold" dangerouslySetInnerHTML={{ __html: `${index + 1}. ${soal.soal}` }} />
                            <ul className="list-disc ml-8 mt-2">
                            {soal.opsi.map((opsi, i) => (
                                <li key={i} dangerouslySetInnerHTML={{ __html: opsi }} />
                            ))}
                            </ul>
                            <p className="text-sm text-green-600 mt-1">Jawaban: {soal.jawaban}</p>
                        </div>
                        ))}
                    </div>
                    <div className="mt-4 text-right">
                        <button 
                            onClick={handleApplyParsedSoal}
                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            Terapkan Soal Ini
                        </button>
                    </div>
                </div>
            )}
          </div>
          {/* --- END AREA PARSING BARU --- */}

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">📝 Daftar Soal ({soalList.length})</h3>
            <button
              onClick={() => {
                setSoalList((prev) => [...prev, { soal: "", opsi: ["", ""], jawaban: "", tipe_soal: 'pilihan_ganda' }]);
                setTimeout(() => {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                }, 100);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ➕ Tambah Soal
            </button>
          </div>

          {/* TAMPILAN DAFTAR SOAL UTAMA TETAP SAMA */}
          {soalList.length > 0 && (
            <div className="space-y-6">
              {soalList.map((item, index) => {
                // ... JSX untuk render setiap soal di soalList
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageCoursePage;