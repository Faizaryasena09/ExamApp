import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import Cookies from "js-cookie";
import MngNavbar from "../components/ManageNavbar";
import { toast } from "../utils/toast";
import { uploadImageToServer } from "../utils/uploadImageToServer";

window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

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
        // Bentukkan ke struktur array kelas yang sama seperti sebelumnya
        const filtered = res.data.map((nama, idx) => ({
          id: idx + 1,
          nama_kelas: nama,
        }));
        setKelasList(filtered);
      } else {
        // admin: tampilkan semua kelas
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
      setSoalList((prev) => [...prev, ...res.data.soal]);
      alert(`✅ Berhasil membaca ${res.data.soal.length} soal`);
    } catch (err) {
      console.error("❌ Gagal upload:", err);
      alert("Gagal membaca file soal dari server");
    }
  };  

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const updated = Array.from(soalList);
    const [removed] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, removed);
    setSoalList(updated);
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

  function isImageOnly(html) {
    return html.includes("<img");
  }

  function toAbsoluteImageSrc(html) {
    return html.replace(/src="\/uploads/g, `src="http://localhost:5000/uploads`);
  }  

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
                  <label htmlFor="upload-soal" className="block text-sm font-medium text-gray-600 mb-2">📤 Upload Soal (.docx)</label>
                  <input id="upload-soal" type="file" accept=".docx" onChange={handleUploadSoal} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
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
  const labelHuruf = (i) => String.fromCharCode(65 + i);

  return (
    <div
      key={index}
      className="p-5 border border-gray-200 rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md mb-4"
    >
      {/* === Header === */}
      <div className="flex justify-between items-center mb-4">
        <span className="font-bold text-gray-700">Soal #{index + 1}</span>
        <button
          onClick={() => setSoalList(soalList.filter((_, i) => i !== index))}
          className="text-gray-400 hover:text-red-600 transition-colors text-sm font-medium"
        >
          ❌ Hapus
        </button>
      </div>

      {/* === Soal === */}
      <div className="mb-4">
        <textarea
          value={(() => {
            const div = document.createElement("div");
            div.innerHTML = item.soal || "";
            return div.textContent?.trim() || "";
          })()}
          onChange={(e) => {
            const updated = [...soalList];
            const html = item.soal || "";
            const div = document.createElement("div");
            div.innerHTML = html;
            const img = div.querySelector("img");
            const imgHTML = img ? img.outerHTML + "<br/>" : "";
            updated[index].soal = `${imgHTML}<span class="inline-option">${e.target.value}</span>`;
            setSoalList(updated);
          }}
          rows={4}
          className="w-full border border-gray-300 rounded-md p-3 mb-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="Tulis soal di sini..."
        />

        {/* Gambar soal (jika ada) */}
        {item.soal?.includes("<img") && (
          <div className="mb-2">
            <div
              dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(item.soal) }}
            />
            <button
              onClick={() => {
                const updated = [...soalList];
                const div = document.createElement("div");
                div.innerHTML = item.soal;
                div.querySelector("img")?.remove();
                updated[index].soal = div.innerHTML;
                setSoalList(updated);
              }}
              className="text-xs text-red-500 hover:text-red-700 mt-1"
            >
              ❌ Hapus Gambar Soal
            </button>
          </div>
        )}

        {/* Upload Gambar Soal */}
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
              const imgPath = await uploadImageToServer(file);
              const updated = [...soalList];
              const div = document.createElement("div");
              div.innerHTML = updated[index].soal || "";
              const text = div.textContent?.trim() || "";
              updated[index].soal = `<img src="${imgPath}" class="max-h-60 mb-2"><br/><span class="inline-option">${text}</span>`;
              setSoalList(updated);
            } catch {
              alert("❌ Gagal upload gambar soal.");
            }
          }}
          className="text-sm text-gray-600"
        />
      </div>

      {/* === OPSI === */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Pilihan Jawaban:
        </label>

        <div className="space-y-3">
          {item.opsi.map((opsi, opsiIdx) => {
            const huruf = labelHuruf(opsiIdx);
            const div = document.createElement("div");
            div.innerHTML = opsi;
            const img = div.querySelector("img");
            const imgHTML = img ? img.outerHTML + "<br/>" : "";
            const text = div.textContent?.replace(`${huruf}.`, "").trim() || "";

            return (
              <div key={opsiIdx} className="flex items-start gap-3">
                <div className="pt-2 font-mono text-sm text-gray-500 min-w-[1.5rem]">
                  {huruf}.
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    className="w-full border rounded p-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={text}
                    onChange={(e) => {
                      const updated = [...soalList];
                      updated[index].opsi[opsiIdx] =
                        `<span class="inline-option">${huruf}. <br/>${imgHTML}${e.target.value}</span>`;
                      setSoalList(updated);
                    }}
                    rows={2}
                    placeholder="Tulis pilihan..."
                  />

                  {/* Preview gambar opsi (jika ada) */}
                  {img && (
                    <div>
                      <div
                        dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(img.outerHTML) }}
                      />
                      <button
                        onClick={() => {
                          const updated = [...soalList];
                          const div = document.createElement("div");
                          div.innerHTML = opsi;
                          div.querySelector("img")?.remove();
                          updated[index].opsi[opsiIdx] = div.innerHTML;
                          setSoalList(updated);
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        ❌ Hapus Gambar Opsi
                      </button>
                    </div>
                  )}

                  {/* Upload gambar opsi */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      try {
                        const imgPath = await uploadImageToServer(file);
                        const updated = [...soalList];
                        updated[index].opsi[opsiIdx] =
                          `<span class="inline-option">${huruf}. <br/><img src="${imgPath}" class="max-h-28 mb-2"><br/>${text}</span>`;
                        setSoalList(updated);
                      } catch {
                        alert("❌ Gagal upload gambar opsi.");
                      }
                    }}
                    className="text-sm text-gray-600"
                  />
                </div>

                {/* Tombol benar dan hapus */}
                <div className="flex flex-col items-center gap-2 ml-2">
                  <label className="flex items-center text-sm text-gray-600 whitespace-nowrap">
                    <input
                      type="radio"
                      name={`jawaban-${index}`}
                      value={huruf}
                      checked={item.jawaban === huruf}
                      onChange={(e) => {
                        const updated = [...soalList];
                        updated[index].jawaban = e.target.value;
                        setSoalList(updated);
                      }}
                      className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <span className="ml-1">Benar</span>
                  </label>

                  <button
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={() => {
                      const updated = [...soalList];
                      updated[index].opsi.splice(opsiIdx, 1);
                      if (updated[index].jawaban === huruf) {
                        updated[index].jawaban = "";
                      }
                      setSoalList(updated);
                    }}
                    title="Hapus opsi"
                  >
                    ❌
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tambah Pilihan */}
        <div className="mt-3">
          <button
            onClick={() => {
              const updated = [...soalList];
              updated[index].opsi.push(`<span class="inline-option"></span>`);
              setSoalList(updated);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ➕ Tambah Pilihan
          </button>
        </div>

        {(item.opsi.length < 2 || !item.jawaban) && (
          <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded-md">
            ⚠️ Soal harus memiliki minimal 2 pilihan dan 1 jawaban benar.
          </div>
        )}
      </div>
    </div>
  );
})}


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
