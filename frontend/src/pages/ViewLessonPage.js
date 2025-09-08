import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from '../utils/toast';
import { FiChevronLeft, FiLoader } from 'react-icons/fi';

const ViewLessonPage = () => {
  const { id: lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await api.get(`/lessons/${lessonId}`);
        setLesson(res.data);
      } catch (error) {
        console.error("Gagal mengambil materi lesson:", error);
        toast.error("Materi tidak ditemukan atau gagal dimuat.");
        navigate(-1); // Kembali ke halaman sebelumnya
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [lessonId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <FiLoader className="animate-spin text-4xl text-indigo-600" />
        <p className="ml-3 text-lg text-gray-700">Memuat Materi...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-lg text-gray-700">Materi tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-indigo-600 font-semibold mb-4">
          <FiChevronLeft /> Kembali
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{lesson.title}</h1>
        <div
          className="prose lg:prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      </div>
    </div>
  );
};

export default ViewLessonPage;
