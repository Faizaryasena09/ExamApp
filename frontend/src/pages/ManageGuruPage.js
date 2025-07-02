import React, { useEffect, useState } from "react";
import { toast } from "../utils/toast";
import api from "../api";

const SkeletonLoader = () => (
  <div className="mb-8 border border-gray-200 p-6 rounded-lg shadow-md bg-white animate-pulse">
    <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
    <div className="h-4 bg-gray-300 rounded w-1/4 mb-6"></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-300 rounded"></div>
      ))}
    </div>
    <div className="flex justify-end mt-6">
      <div className="h-10 bg-gray-300 rounded w-24"></div>
    </div>
  </div>
);

const ManageGuruPage = () => {
  const [guruList, setGuruList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [pengajaran, setPengajaran] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingStates, setSavingStates] = useState({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [guruRes, kelasRes, pengajaranRes] = await Promise.all([
          api.get("/gurus"),
          api.get("/kelas"),
          api.get("/guru-kelas"),
        ]);

        setGuruList(guruRes.data);
        setKelasList(kelasRes.data);

        const initPengajaran = {};
        pengajaranRes.data.forEach(({ guru_id, kelas }) => {
          if (!initPengajaran[guru_id]) {
            initPengajaran[guru_id] = [];
          }
          initPengajaran[guru_id].push(kelas);
        });
        setPengajaran(initPengajaran);
      } catch (err) {
        console.error("❌ Gagal mengambil data:", err);
        toast.error("Gagal memuat data dari server.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleCheckboxChange = (guruId, kelas) => {
    setPengajaran((prev) => {
      const currentKelas = prev[guruId] || [];
      const isChecked = currentKelas.includes(kelas);
      const updatedKelas = isChecked
        ? currentKelas.filter((k) => k !== kelas)
        : [...currentKelas, kelas];
      return { ...prev, [guruId]: updatedKelas };
    });
  };

  const handleSimpan = async (guruId) => {
    setSavingStates((prev) => ({ ...prev, [guruId]: true }));
    try {
      await api.post("/guru-kelas", {
        guruId,
        kelasList: pengajaran[guruId] || [],
      });
      toast.success("Perubahan berhasil disimpan!");
    } catch (err) {
      console.error("❌ Gagal menyimpan:", err);
      toast.error("Gagal menyimpan perubahan.");
    } finally {
      setSavingStates((prev) => ({ ...prev, [guruId]: false }));
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          🧑‍🏫 Manajemen Guru & Kelas
        </h1>

        {loading ? (
          <>
            <SkeletonLoader />
            <SkeletonLoader />
          </>
        ) : (
          <div className="space-y-8">
            {guruList.map((guru) => (
              <div
                key={guru.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {guru.nama}
                  </h3>
                  <p className="text-md font-medium text-gray-600 mb-5">
                    Pilih kelas yang diajar:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                    {kelasList.map((kelas, idx) => (
                      <label
                        key={idx}
                        className="flex items-center p-3 space-x-3 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={pengajaran[guru.id]?.includes(kelas) || false}
                          onChange={() => handleCheckboxChange(guru.id, kelas)}
                        />
                        <span className="text-gray-800 font-medium select-none">
                          {kelas}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleSimpan(guru.id)}
                      disabled={savingStates[guru.id]}
                      className={`px-6 py-2 font-semibold text-white rounded-md transition-all duration-200 ease-in-out
                        ${
                          savingStates[guru.id]
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        }`}
                    >
                      {savingStates[guru.id] ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageGuruPage;