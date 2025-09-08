import React, { useState } from 'react';
import api from '../api';

const SetupPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleModeSelect = async (mode) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/mode', { mode });
      alert(`Aplikasi berhasil diatur ke mode ${mode}! Halaman akan dimuat ulang.`);
      window.location.reload();
    } catch (err) {
      const message = err.response?.data?.message || 'Gagal mengatur mode aplikasi';
      setError(message);
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Selamat Datang!</h1>
        <p className="text-gray-600 mb-8">
          Ini adalah pertama kalinya Anda menjalankan aplikasi. Silakan pilih mode fungsionalitas yang ingin Anda gunakan.
          Pilihan ini hanya akan muncul sekali.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card untuk Assessment */}
          <div className="border p-6 rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Ujian / Asesmen</h2>
            <p className="text-sm text-gray-500 mb-4">Fokus pada pembuatan dan pelaksanaan ujian online, lengkap dengan penilaian otomatis.</p>
            <button
              onClick={() => handleModeSelect('assessment')}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Pilih Mode Ujian
            </button>
          </div>

          {/* Card untuk Lesson */}
          <div className="border p-6 rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Pembelajaran / Lesson</h2>
            <p className="text-sm text-gray-500 mb-4">Fokus pada pembuatan dan penyajian materi pembelajaran atau kursus online.</p>
            <button
              onClick={() => handleModeSelect('lesson')}
              disabled={loading}
              className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              Pilih Mode Lesson
            </button>
          </div>

          {/* Card untuk Hybrid */}
          <div className="border p-6 rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Hybrid (Keduanya)</h2>
            <p className="text-sm text-gray-500 mb-4">Gabungkan fungsionalitas asesmen dan lesson untuk pengalaman belajar yang lengkap.</p>
            <button
              onClick={() => handleModeSelect('hybrid')}
              disabled={loading}
              className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
            >
              Pilih Mode Hybrid
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 mt-6">Error: {error}</p>}
      </div>
    </div>
  );
};

export default SetupPage;
