import React, { useEffect, useState } from "react";
import api from "../api";
import { toast } from "../utils/toast";

export default function ManageExamPage() {
  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kelasFilter, setKelasFilter] = useState("");
  const [searchNama, setSearchNama] = useState("");
  const [courseId, setCourseId] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [menit, setMenit] = useState(0);
  const [detik, setDetik] = useState(0);

  useEffect(() => {
    fetchSiswa();
    const interval = setInterval(fetchSiswa, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSiswa = async () => {
    setLoading(true);
    try {
      const res = await api.get("/exam/siswa");
      setSiswa(res.data);
    } catch {
      toast.error("❌ Gagal mengambil data siswa");
    } finally {
      setLoading(false);
    }
  };

  const resetUjian = async (userId) => {
    try {
      await api.delete(`/exam/reset/${courseId}`, { data: { user_id: userId } });
      toast.success("✅ Ujian siswa berhasil direset");
    } catch {
      toast.error("❌ Gagal reset ujian");
    }
  };

  const logoutUser = async (userId) => {
    try {
      await api.post("/exam/logout-user", { user_id: userId });
      toast.success("✅ User berhasil logout");
    } catch {
      toast.error("❌ Gagal logout user");
    }
  };

  const toggleKunciAkun = async (userId, terkunci) => {
    try {
      if (terkunci) {
        await api.post("/exam/unlock-user", { user_id: userId });
        toast.success("🔓 Akun berhasil dibuka");
      } else {
        await api.post("/exam/lock-user", { user_id: userId });
        toast.success("🔒 Akun berhasil dikunci");
      }
      fetchSiswa();
    } catch {
      alert("❌ Gagal mengubah status akun");
    }
  };

  const bukaModalTambahWaktu = (userId) => {
    setSelectedUser(userId);
    setMenit(0);
    setDetik(0);
    setShowModal(true);
  };

  const konfirmasiTambahWaktu = async () => {
    const totalDetik = parseInt(menit) * 60 + parseInt(detik);
    if (!totalDetik) {
      alert("⏱️ Masukkan waktu yang valid.");
      return;
    }
    try {
      await api.post("/exam/add-timer", {
        user_id: selectedUser,
        course_id: courseId,
        detik: totalDetik,
      });
      toast.success(`✅ Ditambahkan ${totalDetik} detik ke user`);
      setShowModal(false);
    } catch {
      toast.error("❌ Gagal menambahkan waktu");
    }
  };

  const siswaFiltered = siswa.filter((s) => {
    const cocokKelas = kelasFilter
      ? s.kelas?.toLowerCase().includes(kelasFilter.toLowerCase())
      : true;
    const cocokNama = searchNama
      ? s.name?.toLowerCase().includes(searchNama.toLowerCase())
      : true;
    return cocokKelas && cocokNama;
  });

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-semibold mb-4">🛠️ Manage Exam</h1>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Filter kelas:</label>
          <input
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="border px-3 py-1 rounded-md"
            placeholder="Contoh: 9A"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Cari nama:</label>
          <input
            value={searchNama}
            onChange={(e) => setSearchNama(e.target.value)}
            className="border px-3 py-1 rounded-md"
            placeholder="Nama siswa"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading siswa...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full bg-white rounded shadow text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Status Sesi</th>
                <th className="p-3">Status Ujian</th>
                <th className="p-3">Terkunci?</th>
                <th className="p-3">Update Terakhir</th>
                <th className="p-3">Operasi</th>
              </tr>
            </thead>
            <tbody>
              {siswaFiltered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500">
                    Tidak ada siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                siswaFiltered.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{s.kelas}</td>
                    <td className="p-3 capitalize">{s.status}</td>
                    <td className="p-3">{s.status_ujian || "-"}</td>
                    <td className="p-3">{s.login_locked ? "🔒" : "❎"}</td>
                    <td className="p-3">
                      {s.last_update
                        ? new Date(s.last_update).toLocaleString()
                        : "-"}
                    </td>
                    <td className="p-3 flex flex-wrap gap-1">
                      <button
                        onClick={() => resetUjian(s.id)}
                        className="px-2 py-1 bg-yellow-400 rounded text-xs"
                      >
                        Reset Ujian
                      </button>
                      <button
                        onClick={() => bukaModalTambahWaktu(s.id)}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                      >
                        Tambah Waktu
                      </button>
                      <button
                        onClick={() => logoutUser(s.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                      >
                        Logout
                      </button>
                      <button
                        onClick={() => toggleKunciAkun(s.id, s.login_locked)}
                        className={`px-2 py-1 text-white rounded text-xs ${
                          s.login_locked ? "bg-green-600" : "bg-gray-700"
                        }`}
                      >
                        {s.login_locked ? "Buka Kunci" : "Kunci Akun"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-[90%] max-w-md">
            <h2 className="text-lg font-semibold mb-4">⏱️ Tambah Waktu</h2>
            <div className="flex gap-4 items-center mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Menit</label>
                <input
                  type="number"
                  value={menit}
                  onChange={(e) => setMenit(e.target.value)}
                  className="border px-2 py-1 w-20 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Detik</label>
                <input
                  type="number"
                  value={detik}
                  onChange={(e) => setDetik(e.target.value)}
                  className="border px-2 py-1 w-20 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Batal
              </button>
              <button
                onClick={konfirmasiTambahWaktu}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
