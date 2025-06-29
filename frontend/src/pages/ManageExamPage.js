import React, { useEffect, useState } from "react";
import api from "../api";

export default function ManageExamPage() {
  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kelasFilter, setKelasFilter] = useState("");
  const [courseId, setCourseId] = useState(1); // Ganti sesuai useParams nanti
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [menit, setMenit] = useState(0);
  const [detik, setDetik] = useState(0);

  useEffect(() => {
    fetchSiswa();
  }, [kelasFilter]);

  const fetchSiswa = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/exam/siswa${kelasFilter ? `?kelas=${kelasFilter}` : ""}`);
      setSiswa(res.data);
    } catch (err) {
      alert("❌ Gagal mengambil data siswa");
    } finally {
      setLoading(false);
    }
  };

  const resetJawaban = async (userId) => {
    try {
      await api.delete(`/exam/reset/${courseId}`, { data: { user_id: userId } });
      alert("✅ Jawaban siswa berhasil direset");
    } catch (err) {
      alert("❌ Gagal reset jawaban");
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
      alert(`✅ Ditambahkan ${totalDetik} detik ke user`);
      setShowModal(false);
    } catch (err) {
      alert("❌ Gagal menambahkan waktu");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-semibold mb-4">🛠️ Manage Exam</h1>

      <div className="mb-4">
        <label className="text-sm font-medium mr-2">Filter kelas:</label>
        <input
          value={kelasFilter}
          onChange={(e) => setKelasFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        />
      </div>

      {loading ? (
        <p>Loading siswa...</p>
      ) : (
        <table className="w-full bg-white rounded shadow text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Username</th>
              <th className="p-2">Nama</th>
              <th className="p-2">Kelas</th>
              <th className="p-2">Status</th>
              <th className="p-2">Status Ujian</th>
              <th className="p-2">Update Terakhir</th>
              <th className="p-2">Operasi</th>
            </tr>
          </thead>
          <tbody>
            {siswa.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{s.username}</td>
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.kelas}</td>
                <td className="p-2 capitalize">{s.status}</td>
                <td className="p-2">{s.status_ujian || "-"}</td>
                <td className="p-2">
                  {s.last_update ? new Date(s.last_update).toLocaleString() : "-"}
                </td>
                <td className="p-2 space-x-2">
                  <button
                    onClick={() => resetJawaban(s.id)}
                    className="px-2 py-1 bg-yellow-300 rounded"
                  >
                    Reset Jawaban
                  </button>
                  <button
                    onClick={() => bukaModalTambahWaktu(s.id)}
                    className="px-2 py-1 bg-blue-300 rounded"
                  >
                    Tambahan Waktu
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL TAMBAH WAKTU */}
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
