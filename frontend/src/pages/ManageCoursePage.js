import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import Cookies from "js-cookie";
import MngNavbar from "../components/ManageNavbar";

function ManageCoursePage() {
  const { id } = useParams();
  const role = Cookies.get("role");
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
        kelas: c.kelas instanceof Array ? c.kelas : [c.kelas],
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
        maxPercobaan: c.maxPercobaan || 1,
        tampilkanHasil: c.tampilkanHasil || false,
        useToken: c.useToken || false,
        tokenValue: c.tokenValue || "",
      });
    } catch (err) {
      console.error("Gagal ambil course:", err);
    }
  };

  const fetchKelas = async () => {
    try {
      const res = await api.get("/data/kelas");
      setKelasList(res.data);
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
    };
  
    try {
      await api.put(`/courses/${id}`, payload);
      alert("Konfigurasi berhasil disimpan!");
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
        id: item.id, // penting!
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
    if (!file || !file.name.endsWith(".docx")) {
      return alert("Hanya file .docx yang didukung!");
    }
  
    const form = new FormData();
    form.append("file", file);
  
    try {
      const res = await api.post(`/courses/${id}/upload-soal`, form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setSoalList(res.data.soal);
      alert(`✅ Berhasil membaca ${res.data.soal.length} soal`);
    } catch (err) {
      console.error("❌ Gagal upload:", err);
      alert("Gagal membaca file soal dari server");
    }
  };  

  const handleSimpanSoal = async () => {
    try {
      console.log("📤 Soal yang dikirim ke backend:");
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

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🛠️ Manage Course</h1>
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

            <div className="border-t pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <label htmlFor="max-percobaan" className="block text-sm font-medium text-gray-600 mb-1">Maksimal Percobaan</label>
                        <input id="max-percobaan" type="number" min="1" value={form.maxPercobaan} onChange={(e) => setForm({ ...form, maxPercobaan: parseInt(e.target.value) })} className="w-full md:w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div className="space-y-3 pt-2">
                        <label className="flex items-center">
                            <input type="checkbox" checked={form.tampilkanHasil} onChange={(e) => setForm({ ...form, tampilkanHasil: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-3 text-sm text-gray-700">Tampilkan hasil ke siswa setelah ujian</span>
                        </label>
                        <label className="flex items-center">
                            <input type="checkbox" checked={form.useToken} onChange={(e) => setForm({ ...form, useToken: e.target.checked, tokenValue: "" })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-3 text-sm text-gray-700">Gunakan Token untuk memulai ujian</span>
                        </label>
                    </div>
                </div>

                {form.useToken && (
                <div className="pl-6 border-l-4 border-blue-200">
                    <label htmlFor="token-quiz" className="block text-sm font-medium text-gray-600 mb-1">Token Quiz (maks 6 karakter)</label>
                    <input id="token-quiz" type="text" maxLength={6} value={form.tokenValue} onChange={(e) => setForm({ ...form, tokenValue: e.target.value.toUpperCase() })} className="w-full md:w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 uppercase" placeholder="Contoh: ABC123" />
                </div>
                )}
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
                  <label htmlFor="upload-soal" className="block text-sm font-medium text-gray-600 mb-2">📤 Upload Soal (.docx)</label>
                  <input id="upload-soal" type="file" accept=".docx" onChange={handleUploadSoal} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div className="flex flex-col space-y-2 self-center">
                  <label className="flex items-center text-sm text-gray-700">
                      <input type="checkbox" checked={acakSoal} onChange={() => setAcakSoal(!acakSoal)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                      <span className="ml-2">Acak Urutan Soal</span>
                  </label>
                  <label className="flex items-center text-sm text-gray-700">
                      <input type="checkbox" checked={acakJawaban} onChange={() => setAcakJawaban(!acakJawaban)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                      <span className="ml-2">Acak Urutan Jawaban</span>
                  </label>
              </div>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">📝 Daftar Soal ({soalList.length})</h3>
            <button
              onClick={() => setSoalList((prev) => [...prev, { soal: "", opsi: ["", ""], jawaban: "" }])}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ➕ Tambah Soal
            </button>
          </div>

          {soalList.length > 0 && (
            <div className="space-y-6">
              {soalList.map((item, index) => (
                <div key={index} className="p-5 border border-gray-200 rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-700">Soal #{index + 1}</span>
                    <button onClick={() => { const updated = soalList.filter((_, i) => i !== index); setSoalList(updated); }} className="text-gray-400 hover:text-red-600 transition-colors text-sm font-medium">
                      ❌ Hapus
                    </button>
                  </div>

                  <textarea
                    className="w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y"
                    placeholder="Tulis pertanyaan soal di sini..."
                    rows="3"
                    value={item.soal}
                    onChange={(e) => {
                      const updated = [...soalList];
                      updated[index].soal = e.target.value;
                      setSoalList(updated);
                    }}
                  />

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Pilihan Jawaban:</label>
                    <div className="space-y-3">
                      {Array.isArray(item.opsi) && item.opsi.map((opsi, opsiIdx) => (
                        <div key={opsiIdx} className="flex items-center gap-3">
                          <span className="font-mono text-sm text-gray-500">{String.fromCharCode(65 + opsiIdx)}.</span>
                          <input
                            type="text"
                            className="flex-1 p-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Teks untuk pilihan ${String.fromCharCode(65 + opsiIdx)}`}
                            value={opsi}
                            onChange={(e) => {
                              const updated = [...soalList];
                              updated[index].opsi[opsiIdx] = e.target.value;
                              setSoalList(updated);
                            }}
                          />
                          <label className="flex items-center text-sm text-gray-600 whitespace-nowrap">
                            <input
                              type="radio"
                              name={`jawaban-${index}`}
                              value={String.fromCharCode(65 + opsiIdx)}
                              checked={item.jawaban === String.fromCharCode(65 + opsiIdx)}
                              onChange={(e) => {
                                const updated = [...soalList];
                                updated[index].jawaban = e.target.value;
                                setSoalList(updated);
                              }}
                              className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <span className="ml-2">Benar</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    {(item.opsi.length < 2 || !item.jawaban) && (
                      <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded-md">
                        ⚠️ Peringatan: Soal harus memiliki minimal 2 pilihan dan 1 jawaban benar yang ditandai.
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="text-right border-t pt-6 mt-8">
                <button
                  onClick={handleSimpanSoal}
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  💾 Simpan Semua Soal ({soalList.length})
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
