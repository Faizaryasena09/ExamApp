import api from "../api";
import { toast } from "../utils/toast";
import { useEffect, useState } from "react";

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const WebSettingsPage = () => {
  const [judul, setJudul] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoFromServer, setLogoFromServer] = useState("");
  const [tables, setTables] = useState([]);

  useEffect(() => {
    fetchWebSettings();
    fetchTables();
  }, []);

  const fetchWebSettings = () => {
    api.get("/web-settings").then((res) => {
      setJudul(res.data.judul || "");
      setLogoFromServer(res.data.logo);
    });
  };

  const fetchTables = () => {
    api.get("/db/tables").then((res) => setTables(res.data.tables));
  };

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("judul", judul);
    if (logoFile) {
      formData.append("logo", logoFile);
    }

    try {
      await api.put("/web-settings", formData);
      toast.success("Pengaturan berhasil disimpan");
      setLogoFile(null);
      fetchWebSettings();
    } catch (err) {
      toast.error("Gagal menyimpan pengaturan");
    }
  };

  const handleDeleteTable = (table) => {
    if (!window.confirm(`Anda yakin ingin menghapus tabel ${table}? Tindakan ini tidak dapat diurungkan.`)) return;
    api.delete(`/db/${table}`).then(() => {
      toast.success(`Tabel ${table} berhasil dihapus`);
      fetchTables();
    });
  };

  const handleResetDB = () => {
    if (!window.confirm("PERHATIAN: Anda yakin ingin mereset seluruh database? Semua data akan hilang secara permanen!")) return;
    api.post("/db/reset").then(() => {
      toast.success("Database berhasil direset!");
      fetchTables();
    });
  };

  const handleRestart = () => {
    if (!window.confirm("Anda yakin ingin merestart server?")) return;
    api.post("/restart-server").then(() => toast.success("Server sedang direstart..."));
  };
  
  const toAbsoluteImageSrc = (path) => {
    if (!path) return "";
  
    const baseURL = api.defaults.baseURL;
  
    if (path.startsWith("http")) {
      return path;
    }
  
    const fullURL = `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;
    return fullURL;
  };

  const logoPreviewSrc = logoFile ? URL.createObjectURL(logoFile) : toAbsoluteImageSrc(logoFromServer);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 font-sans">
      <div className="space-y-10">
        <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan Website</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="judul" className="block text-sm font-medium text-gray-700 mb-1">Judul Website</label>
              <input
                id="judul"
                type="text"
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo Website</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {logoPreviewSrc ? (
                    <img src={logoPreviewSrc} alt="Logo Preview" className="h-24 mx-auto mb-4 object-contain" />
                  ) : (
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Unggah file baru</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
                    </label>
                    <p className="pl-1">atau seret dan lepas</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF hingga 10MB</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-right">
            <button onClick={handleSave} className="bg-blue-600 text-white px-5 py-2.5 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out">
              Simpan Perubahan
            </button>
          </div>
        </div>

        <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Manajemen Database</h3>
          <div className="space-y-3 mb-6">
            {tables.length > 0 ? tables.map((table, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                <span className="font-mono text-sm text-gray-700">{table}</span>
                <button onClick={() => handleDeleteTable(table)} className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors duration-150">
                  <TrashIcon />
                  <span className="text-sm font-medium">Hapus</span>
                </button>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">Tidak ada tabel ditemukan.</p>
            )}
          </div>
           <div className="mt-6 border-t pt-6">
              <h4 className="text-lg font-semibold text-red-700">Zona Berbahaya</h4>
              <p className="text-sm text-gray-600 mt-1 mb-4">Tindakan berikut tidak dapat diurungkan. Harap berhati-hati.</p>
               <button onClick={handleResetDB} className="bg-red-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out">
                Reset Database
              </button>
           </div>
        </div>

        <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Tindakan Server</h3>
           <p className="text-sm text-gray-600 mb-4">Gunakan tombol di bawah ini untuk memulai ulang server aplikasi.</p>
          <button onClick={handleRestart} className="bg-gray-700 text-white px-4 py-2 rounded-md shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out">
            Restart Server
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebSettingsPage;