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
        jawaban: item.jawaban
      }));
  
      setSoalList(soalFormatted);
    } catch (err) {
      console.error("❌ Gagal ambil soal dari DB:", err);
    }
  };   

  const handleUploadSoal = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith(".zip")) {
      return alert("Hanya file .zip yang didukung!");
    }
  
    const form = new FormData();
    form.append("file", file);
  
    try {
      const res = await api.post(`/courses/${id}/upload-soal`, form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      if (res.data.success) {
        const soal = res.data.soal;
        setSoalList((prev) => [...prev, ...soal]);
        alert(`✅ Berhasil membaca ${soal.length} soal`);
      } else {
        alert("❌ Gagal membaca soal: " + (res.data.message || "Respons tidak valid"));
      }
    } catch (err) {
      console.error("❌ Gagal upload:", err);
      alert("Gagal membaca file soal dari server");
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
  
    // Pastikan baseURL tidak berakhiran /
    const baseURL = rawBaseURL.replace(/\/$/, "");
  
    // Ubah src="/uploads/... → src="http://localhost:5000/api/uploads/..."
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

  const editorSoalRef = useRef(null);
  const labelHuruf = (i) => String.fromCharCode(65 + i);
  const editorOpsiRef = useRef(null);

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
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nama-ujian" className="block text-sm font-medium text-gray-600 mb-1">Nama Ujian / Mapel</label>
                <input type="text" id="nama-ujian" name="nama" value={form.nama} onChange={handleChange} required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Kelas (boleh lebih dari 1)</label>
                <div className="w-full border border-gray-300 rounded-md p-3 h-40 overflow-y-auto bg-gray-50">
                  {kelasList.map((k) => (
                    <div key={k.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`kelas-${k.id}`}
                        value={k.nama_kelas}
                        checked={form.kelas.includes(k.nama_kelas)}
                        onChange={(e) => {
                          const { checked, value } = e.target;
                          setForm((prev) => ({
                            ...prev,
                            kelas: checked
                              ? [...prev.kelas, value]
                              : prev.kelas.filter((item) => item !== value),
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`kelas-${k.id}`} className="ml-3 text-sm text-gray-700">
                        {k.nama_kelas}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal & Waktu Mulai</label>
                <div className="flex gap-2">
                  <input type="date" name="tanggalMulai" value={form.tanggalMulai} onChange={handleChange} required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  <input type="time" name="waktuMulai" value={form.waktuMulai} onChange={handleChange} required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                  <input type="checkbox" name="enableTanggalSelesai" checked={form.enableTanggalSelesai} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                  Tanggal & Waktu Selesai
                </label>
                <div className="flex gap-2">
                  <input type="date" name="tanggalSelesai" value={form.tanggalSelesai} onChange={handleChange} disabled={!form.enableTanggalSelesai} className="w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                  <input type="time" name="waktuSelesai" value={form.waktuSelesai} onChange={handleChange} disabled={!form.enableTanggalSelesai} className="w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="waktu-ujian" className="block text-sm font-medium text-gray-600 mb-1">Waktu Ujian</label>
                <select id="waktu-ujian" name="waktuMode" value={form.waktuMode} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="30">30 Menit</option>
                  <option value="45">45 Menit</option>
                  <option value="60">60 Menit</option>
                  <option value="120">120 Menit</option>
                  <option value="custom">Custom</option>
                  <option value="unlimited">Tanpa Batas</option>
                </select>
                {form.waktuMode === "custom" && (
                  <input type="number" name="waktuCustom" value={form.waktuCustom} placeholder="Masukkan durasi (menit)" onChange={handleChange} className="w-full mt-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                )}
              </div>
              <div>
                <label htmlFor="deskripsi" className="block text-sm font-medium text-gray-600 mb-1">Deskripsi</label>
                <textarea id="deskripsi" name="deskripsi" value={form.deskripsi} onChange={handleChange} rows="3" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div className="border-t pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label htmlFor="max-percobaan" className="block text-sm font-medium text-gray-700">
                    Maksimal Percobaan
                  </label>
                  <input
                    id="max-percobaan"
                    type="number"
                    min="1"
                    value={form.maxPercobaan}
                    onChange={(e) => setForm({ ...form, maxPercobaan: parseInt(e.target.value) })}
                    className="mt-1 block w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.useToken}
                      onChange={(e) => setForm({ ...form, useToken: e.target.checked, tokenValue: "" })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-800">Gunakan Token untuk Memulai Ujian</span>
                  </label>
                  {form.useToken && (
                    <div className="pl-7">
                      <label htmlFor="token-quiz" className="block text-xs font-medium text-gray-600">
                        Token (maks 6 karakter, kedaluwarsa 15 menit)
                      </label>
                      <input
                        id="token-quiz"
                        type="text"
                        maxLength={6}
                        value={form.tokenValue}
                        onChange={(e) => setForm({ ...form, tokenValue: e.target.value.toUpperCase() })}
                        className="mt-1 block w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 uppercase"
                        placeholder="Contoh: ABC123"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-base font-medium text-gray-800">Opsi Tambahan</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.acakSoal}
                      onChange={(e) => setForm((prev) => ({ ...prev, acakSoal: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-800">Acak Urutan Soal</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.acakJawaban}
                      onChange={(e) => setForm((prev) => ({ ...prev, acakJawaban: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-800">Acak Urutan Jawaban</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.tampilkanHasil}
                      onChange={(e) => setForm({ ...form, tampilkanHasil: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-800">Tampilkan Hasil ke Siswa Setelah Ujian</span>
                  </label>
                  {form.tampilkanHasil && (
                    <div className="pl-7">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.analisisJawaban}
                          onChange={(e) => setForm((prev) => ({ ...prev, analisisJawaban: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-800">Tampilkan Analisis Jawaban ke Siswa</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.minWaktuSubmit}
                      onChange={(e) => setForm((prev) => ({ ...prev, minWaktuSubmit: e.target.checked, minWaktuSubmitValue: e.target.checked ? "1" : "" }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-800">Batas Minimal Waktu Submit</span>
                  </label>
                  {form.minWaktuSubmit && (
                    <div className="pl-7">
                      <label htmlFor="min-waktu-submit" className="block text-xs font-medium text-gray-600">
                        Waktu tersisa minimal (menit)
                      </label>
                      <input
                        id="min-waktu-submit"
                        type="number"
                        min="1"
                        name="minWaktuSubmitValue"
                        value={form.minWaktuSubmitValue}
                        onChange={handleChange}
                        className="mt-1 block w-full md:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Contoh: 5"
                      />
                    </div>
                  )}
                </div>
                
                <label className="flex items-center pt-2">
                    <input
                      type="checkbox"
                      checked={form.logPengerjaan}
                      onChange={(e) => setForm((prev) => ({ ...prev, logPengerjaan: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-800">Aktifkan Log Pengerjaan Siswa</span>
                  </label>
              </div>
            </div>

            <div className="text-right pt-4">
              <button type="submit" className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Simpan Konfigurasi
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Manajemen Soal</h2>
          <p className="text-sm text-gray-500 mb-6">Upload soal dari file Word atau tambahkan soal secara manual.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border rounded-lg p-4 mb-8 bg-gray-50">
  <div>
    <label htmlFor="upload-soal" className="block text-sm font-medium text-gray-600 mb-2">
      📤 Upload Soal (.pdf)
    </label>
    <input
      id="upload-soal"
      type="file"
      accept=".zip"
      onChange={handleUploadSoal}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
    />
  </div>
</div>

          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">📝 Daftar Soal ({soalList.length})</h3>
            <button
              onClick={() => {
                setSoalList((prev) => [...prev, { soal: "", opsi: ["", ""], jawaban: "" }]);
                setTimeout(() => {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                }, 100);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ➕ Tambah Soal
            </button>
          </div>

          {soalList.length > 0 && (
            <div className="space-y-6">
              {soalList.map((item, index) => {
                return (
                  <div
                    key={index}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg hover:border-blue-300"
                  >
                    <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-bold text-lg text-slate-800">
                        Soal #{index + 1}
                      </h3>
                      <button
                        onClick={() => setSoalList(soalList.filter((_, i) => i !== index))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-red-100 hover:text-red-700 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        Hapus Soal
                      </button>
                    </div>

                    <div className="p-5 md:p-6">
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-600 mb-2">
                          Pertanyaan
                        </label>
                        <div className="prose max-w-none">
                          <JoditEditor
                            ref={editorSoalRef}
                            value={toAbsoluteImageSrc(item.soal)}
                            config={{
                              readonly: false,
                              height: 300,
                              toolbar: true,
                              toolbarAdaptive: false,
                              toolbarSticky: false,
                              buttons: [ 'bold', 'italic', 'underline', '|', 'ul', 'ol', '|', 'image', '|', 'undo', 'redo' ],
                              enter: 'P',
                              tabIndex: 1,
                              allowTabNavigation: true,
                              placeholder: 'Tuliskan pertanyaan di sini...'
                            }}
                            onBlur={(newContent) => {
                              const updated = [...soalList];
                              updated[index].soal = newContent;
                              setSoalList(updated);
                            }}
                          />
                        </div>
                        <label htmlFor={`soal-img-upload-${index}`} className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-plus"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          Sisipkan Gambar
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          id={`soal-img-upload-${index}`}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            try {
                              const imgPath = await uploadImageToServer(file);
                              const updated = [...soalList];
                              updated[index].soal = `<img src="${imgPath}" class="max-h-60 mb-2 rounded-md"><br/>` + (item.soal || '');
                              setSoalList(updated);
                            } catch {
                              alert("❌ Gagal upload gambar soal.");
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">
                          Pilihan Jawaban
                        </label>
                        <div className="space-y-4">
                          {item.opsi.map((opsi, opsiIdx) => {
                            const huruf = labelHuruf(opsiIdx);
                            const isChecked = item.jawaban === huruf;

                            return (
                              <div key={opsiIdx} className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${ isChecked ? 'bg-green-50 border-green-400 shadow-sm' : 'bg-slate-50 border-slate-200' }`}>
                                <label htmlFor={`jawaban-${index}-${opsiIdx}`} className="flex-shrink-0 cursor-pointer">
                                  <input type="radio" id={`jawaban-${index}-${opsiIdx}`} name={`jawaban-${index}`} value={huruf} checked={isChecked}
                                    onChange={(e) => {
                                      const updated = [...soalList];
                                      updated[index].jawaban = e.target.value;
                                      setSoalList(updated);
                                    }}
                                    className="hidden peer"
                                  />
                                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-slate-300 font-bold text-slate-500 peer-checked:bg-green-600 peer-checked:border-green-600 peer-checked:text-white transition-all">
                                    {huruf}
                                  </div>
                                </label>

                                <div className="flex-1">
                                  <div className="prose max-w-none">
                                      <JoditEditor
                                        ref={editorOpsiRef}
                                        value={toAbsoluteImageSrc(opsi)}
                                        config={{
                                          readonly: false,
                                          height: 100,
                                          toolbar: true,
                                          toolbarAdaptive: false,
                                          toolbarSticky: false,
                                          buttons: [ 'bold', 'italic', 'underline', '|', 'ul', 'ol', '|', 'image', '|', 'undo', 'redo' ],
                                          enter: 'P',
                                          tabIndex: 1,
                                          allowTabNavigation: true,
                                          placeholder: 'Tuliskan pilihan jawaban...'
                                        }}
                                        onBlur={(newContent) => {
                                          const updated = [...soalList];
                                          updated[index].opsi[opsiIdx] = newContent;
                                          setSoalList(updated);
                                        }}
                                      />
                                  </div>
                                  <label htmlFor={`opsi-img-upload-${index}-${opsiIdx}`} className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-plus"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                    Sisipkan Gambar
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    id={`opsi-img-upload-${index}-${opsiIdx}`}
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files[0];
                                      if (!file) return;
                                      try {
                                        const imgPath = await uploadImageToServer(file);
                                        const updated = [...soalList];
                                        updated[index].opsi[opsiIdx] = `<img src="${imgPath}" class="max-h-28 mb-2 rounded-md"><br/>` + (item.opsi[opsiIdx] || '');
                                        setSoalList(updated);
                                      } catch {
                                        alert("❌ Gagal upload gambar opsi.");
                                      }
                                    }}
                                  />
                                </div>

                                <button
                                  className="flex-shrink-0 text-slate-400 hover:text-red-600 transition-colors"
                                  onClick={() => {
                                    const updated = [...soalList];
                                    updated[index].opsi.splice(opsiIdx, 1);
                                    if (updated[index].jawaban === huruf) {
                                      updated[index].jawaban = "";
                                    }
                                    setSoalList(updated);
                                  }}
                                  title="Hapus opsi ini"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <button
                              onClick={() => {
                                const updated = [...soalList];
                                updated[index].opsi.push("");
                                setSoalList(updated);
                              }}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                              Tambah Pilihan
                            </button>

                          {(item.opsi.length < 2 || !item.jawaban) && (
                            <div className="text-xs text-red-700 p-2 bg-red-100 rounded-lg flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                              <span>Soal harus memiliki min. 2 pilihan & 1 jawaban.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={handleSimpanSoal}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  💾 Simpan Semua Soal
                </button>

                <button
                onClick={() => navigate(`/courses/${courseId}/preview`)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition border border-gray-300"
              >
                <FiEye />
                Preview Soal
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageCoursePage;
