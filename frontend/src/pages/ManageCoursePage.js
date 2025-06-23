import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import Cookies from "js-cookie";

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
      console.log("🔥 DATA DARI API:", res.data);
  
      const soalFormatted = res.data.map((item) => ({
        ...item,
        opsi: Array.isArray(item.opsi)
          ? item.opsi
          : JSON.parse(item.opsi || "[]"),
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

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post(`/courses/${id}/questions/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSoalList(
        res.data.map((item) => ({
          ...item,
          opsi: Array.isArray(item.opsi)
            ? item.opsi
            : JSON.parse(item.opsi || "[]"),
        }))
      );      
      alert(`✅ Berhasil membaca ${res.data.soal.length} soal dari file Word`);
    } catch (err) {
      console.error("❌ Gagal upload file Word:", err);
    }
  };

  const handleSimpanSoal = async () => {
    try {
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">🛠️ Manage Course</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* NAMA */}
        <div>
          <label className="block font-medium">Nama Ujian / Mapel</label>
          <input type="text" name="nama" value={form.nama} onChange={handleChange} required className="w-full border px-3 py-2 rounded" />
        </div>

        {/* KELAS */}
        <div>
          <label className="block font-medium">Kelas (boleh lebih dari 1)</label>
          <div className="w-full border rounded p-3 mt-1 h-40 overflow-y-auto">
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
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor={`kelas-${k.id}`} className="ml-2 text-sm">
                  {k.nama_kelas}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* TANGGAL & WAKTU MULAI */}
        <div>
          <label className="block font-medium mb-1">Tanggal & Waktu Mulai</label>
          <div className="flex gap-2">
            <input type="date" name="tanggalMulai" value={form.tanggalMulai} onChange={handleChange} required className="w-1/2 border px-3 py-2 rounded" />
            <input type="time" name="waktuMulai" value={form.waktuMulai} onChange={handleChange} required className="w-1/2 border px-3 py-2 rounded" />
          </div>
        </div>

        {/* TANGGAL & WAKTU SELESAI */}
        <div>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="enableTanggalSelesai" checked={form.enableTanggalSelesai} onChange={handleChange} />
            Tanggal & Waktu Selesai
          </label>
          <div className="flex gap-2 mt-2">
            <input type="date" name="tanggalSelesai" value={form.tanggalSelesai} onChange={handleChange} disabled={!form.enableTanggalSelesai} className="w-1/2 border px-3 py-2 rounded disabled:bg-gray-200" />
            <input type="time" name="waktuSelesai" value={form.waktuSelesai} onChange={handleChange} disabled={!form.enableTanggalSelesai} className="w-1/2 border px-3 py-2 rounded disabled:bg-gray-200" />
          </div>
        </div>

        {/* DROPDOWN WAKTU */}
        <div>
          <label className="block font-medium mb-1">Waktu Ujian</label>
          <select name="waktuMode" value={form.waktuMode} onChange={handleChange} className="w-full border px-3 py-2 rounded">
            <option value="30">30 Menit</option>
            <option value="45">45 Menit</option>
            <option value="60">60 Menit</option>
            <option value="120">120 Menit</option>
            <option value="custom">Custom</option>
            <option value="unlimited">Tanpa Batas</option>
          </select>
          {form.waktuMode === "custom" && (
            <input type="number" name="waktuCustom" value={form.waktuCustom} placeholder="Durasi (menit)" onChange={handleChange} className="w-full border mt-2 px-3 py-2 rounded" />
          )}
        </div>

        {/* DESKRIPSI */}
        <div>
          <label className="block font-medium">Deskripsi</label>
          <textarea name="deskripsi" value={form.deskripsi} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
        </div>

        {/* Max Percobaan */}
        <label className="block mb-2">Max Percobaan:</label>
        <input
        type="number"
        min={1}
        value={form.maxPercobaan}
        onChange={(e) =>
            setForm({ ...form, maxPercobaan: parseInt(e.target.value) })
        }
        />

        {/* Tampilkan hasil ke siswa */}
        <label className="block mt-4">
        <input
            type="checkbox"
            checked={form.tampilkanHasil}
            onChange={(e) =>
            setForm({ ...form, tampilkanHasil: e.target.checked })
            }
        />
        <span className="ml-2">Tampilkan hasil ke siswa</span>
        </label>

        {/* Token Quiz */}
        <label className="block mt-4">
        <input
            type="checkbox"
            checked={form.useToken}
            onChange={(e) =>
            setForm({ ...form, useToken: e.target.checked, tokenValue: "" })
            }
        />
        <span className="ml-2">Gunakan Token untuk mulai ujian</span>
        </label>

        {/* Form Token (hanya muncul jika checkbox token dicentang) */}
        {form.useToken && (
        <div className="mt-2">
            <label className="block mb-2">Token Quiz (maks 6 karakter):</label>
            <input
            type="text"
            maxLength={6}
            value={form.tokenValue}
            onChange={(e) =>
                setForm({ ...form, tokenValue: e.target.value.toUpperCase() })
            }
            className="input"
            placeholder="Misal: ABC123"
            />
        </div>
        )}

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Simpan Konfigurasi</button>
      </form>

      <div className="mt-10 border-t pt-6">
        <h3 className="text-xl font-semibold mb-2">📤 Upload Soal Word</h3>
        <input type="file" accept=".docx" onChange={handleUploadSoal} className="mb-3" />

        <label className="block mb-2">
          <input type="checkbox" checked={acakSoal} onChange={() => setAcakSoal(!acakSoal)} /> Acak Soal
        </label>
        <label className="block mb-4">
          <input type="checkbox" checked={acakJawaban} onChange={() => setAcakJawaban(!acakJawaban)} /> Acak Jawaban
        </label>

        <button
          onClick={() =>
            setSoalList((prev) => [...prev, { soal: "", opsi: ["", ""], jawaban: "" }])
          }
          className="bg-blue-500 text-white px-4 py-2 rounded mb-6"
        >
          ➕ Tambah Soal Kosong
        </button>

        {soalList.length > 0 && (
          <div className="space-y-6">
            <h4 className="text-xl font-semibold">📝 Daftar Soal ({soalList.length})</h4>

            {soalList.map((item, index) => (
              <div key={index} className="p-4 border border-gray-300 rounded-md bg-white shadow-sm">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-gray-700">Soal #{index + 1}</span>
                  <button
                    onClick={() => {
                      const updated = soalList.filter((_, i) => i !== index);
                      setSoalList(updated);
                    }}
                    className="text-red-500 text-sm"
                  >
                    ❌ Hapus
                  </button>
                </div>

                <textarea
                  className="w-full p-3 border border-gray-400 rounded bg-white text-black resize-none mb-4"
                  placeholder="Tulis soal di sini..."
                  rows={2}
                  value={item.soal}
                  onChange={(e) => {
                    const updated = [...soalList];
                    updated[index].soal = e.target.value;
                    setSoalList(updated);
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                />

                <label className="block font-medium mb-1">Pilihan Jawaban:</label>
                {Array.isArray(item.opsi) &&
  item.opsi.map((opsi, opsiIdx) => (
    <div key={opsiIdx} className="flex items-center gap-3 mb-2">
      <input
        type="text"
        className="flex-1 p-2 border rounded-md bg-white text-black"
        placeholder={`Pilihan ${String.fromCharCode(65 + opsiIdx)}`}
        value={opsi}
        onChange={(e) => {
          const updated = [...soalList];
          updated[index].opsi[opsiIdx] = e.target.value;
          setSoalList(updated);
        }}
      />
      <label className="text-sm text-gray-700">
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
/>
{" "}
        Jawaban Benar
      </label>
    </div>
  ))}

                {(item.opsi.length < 2 || !item.jawaban) && (
                  <div className="text-sm text-red-600 mt-1">
                    ⚠️ Soal belum lengkap. Harus ada minimal 2 pilihan dan 1 jawaban benar.
                  </div>
                )}
              </div>
            ))}

            <div className="text-right">
              <button
                onClick={handleSimpanSoal}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow"
              >
                💾 Simpan Semua Soal ({soalList.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageCoursePage;
