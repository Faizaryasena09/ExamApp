import React, { useEffect, useState } from "react";
import api from "../api";

export default function ManageExamPage() {
  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detikTambah, setDetikTambah] = useState(300);
  const [kelasFilter, setKelasFilter] = useState("");
  const [courseId, setCourseId] = useState(1); // Ganti ini kalau pakai useParams

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

  const hapusTimer = async (userId) => {
    try {
      await api.delete(`/exam/timer-delete`, { data: { user_id: userId, course_id: courseId } });
      alert("⏱️ Timer dihapus");
    } catch (err) {
      alert("❌ Gagal hapus timer");
    }
  };

  const tambahWaktu = async (userId) => {
    try {
      await api.post("/exam/add-timer", {
        user_id: userId,
        course_id: courseId,
        detik: detikTambah,
      });
      alert(`✅ Ditambahkan ${detikTambah} detik ke user`);
    } catch (err) {
      alert("❌ Gagal menambahkan waktu");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-semibold mb-4">🛠️ Manage Exam - Course #{courseId}</h1>

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
                    onClick={() => hapusTimer(s.id)}
                    className="px-2 py-1 bg-red-300 rounded"
                  >
                    Hapus Timer
                  </button>
                  <button
                    onClick={() => tambahWaktu(s.id)}
                    className="px-2 py-1 bg-blue-300 rounded"
                  >
                    Tambah {detikTambah}s
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
