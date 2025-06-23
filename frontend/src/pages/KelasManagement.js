import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiXCircle, FiLoader, FiUsers } from "react-icons/fi";

const KelasManagement = () => {
  const [namaKelas, setNamaKelas] = useState("");
  const [daftarKelas, setDaftarKelas] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editInputRef = useRef(null);

  const fetchKelas = async () => {
    try {
      const res = await api.get("/data/kelas");
      setDaftarKelas(res.data);
    } catch (err) {
      console.error("Gagal fetch kelas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKelas();
  }, []);
  
  useEffect(() => {
    if (editId !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editId]);


  const handleTambah = async (e) => {
    e.preventDefault();
    if (!namaKelas.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const res = await api.post("/data/kelas", { nama_kelas: namaKelas });
      setDaftarKelas([...daftarKelas, res.data]);
      setNamaKelas("");
    } catch (err) {
      console.error("Gagal tambah kelas:", err);
      alert("Gagal menambahkan kelas baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapus = async (id) => {
    if (!window.confirm("Anda yakin ingin menghapus kelas ini? Tindakan ini tidak dapat diurungkan.")) return;

    const daftarKelasLama = [...daftarKelas];
    setDaftarKelas(daftarKelas.filter((k) => k.id !== id));

    try {
      await api.delete(`/data/kelas/${id}`);
    } catch (err) {
      console.error("Gagal hapus kelas:", err);
      alert("Gagal menghapus kelas.");
      setDaftarKelas(daftarKelasLama);
    }
  };

  const handleEdit = (kelas) => {
    setEditId(kelas.id);
    setEditNama(kelas.nama_kelas);
  };
  
  const handleBatalEdit = () => {
    setEditId(null);
    setEditNama("");
  }

  const handleSimpan = async (id) => {
    if (!editNama.trim()) return;
    try {
      await api.put(`/data/kelas/${id}`, { nama_kelas: editNama });
      setDaftarKelas(daftarKelas.map(k => k.id === id ? { ...k, nama_kelas: editNama } : k));
      handleBatalEdit();
    } catch (err) {
      console.error("Gagal ubah kelas:", err);
      alert("Gagal menyimpan perubahan.");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Manajemen Kelas</h1>
          <p className="text-slate-500 mt-1">Tambah, ubah, atau hapus daftar kelas yang tersedia.</p>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
          <form onSubmit={handleTambah} className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full">
              <FiUsers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                type="text"
                placeholder="Contoh: XII-RPL-1"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={namaKelas}
                onChange={(e) => setNamaKelas(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 transition-all transform hover:scale-105 disabled:bg-indigo-300 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <FiLoader className="animate-spin" /> : <FiPlus />}
              <span>{isSubmitting ? "Menyimpan..." : "Tambah Kelas"}</span>
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-sm font-semibold text-slate-600">NAMA KELAS</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="2" className="text-center p-10">
                      <FiLoader className="animate-spin text-2xl text-indigo-500 mx-auto" />
                    </td>
                  </tr>
                ) : daftarKelas.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center p-10">
                      <FiXCircle className="mx-auto text-4xl text-slate-400 mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada kelas</p>
                      <p className="text-sm text-slate-500">Silakan tambahkan kelas baru menggunakan form di atas.</p>
                    </td>
                  </tr>
                ) : (
                  daftarKelas.map((kelas) => (
                    <tr key={kelas.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-4 align-middle">
                        {editId === kelas.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editNama}
                            onChange={(e) => setEditNama(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSimpan(kelas.id)}
                            className="w-full px-2 py-1 border border-indigo-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        ) : (
                          <span className="text-slate-800 font-medium">{kelas.nama_kelas}</span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex justify-end items-center gap-2">
                          {editId === kelas.id ? (
                            <>
                              <button
                                onClick={() => handleSimpan(kelas.id)}
                                className="p-2 text-white bg-green-500 rounded-full hover:bg-green-600 transition-all"
                                title="Simpan Perubahan"
                              >
                                <FiSave />
                              </button>
                               <button
                                onClick={handleBatalEdit}
                                className="p-2 text-white bg-slate-400 rounded-full hover:bg-slate-500 transition-all"
                                title="Batal"
                              >
                                <FiXCircle />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(kelas)}
                                className="p-2 text-white bg-blue-500 rounded-full hover:bg-blue-600 transition-all"
                                title="Edit Kelas"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                onClick={() => handleHapus(kelas.id)}
                                className="p-2 text-white bg-red-500 rounded-full hover:bg-red-600 transition-all"
                                title="Hapus Kelas"
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default KelasManagement;