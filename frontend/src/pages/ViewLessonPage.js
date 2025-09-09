import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from '../utils/toast';
import { FiChevronLeft, FiChevronDown, FiLoader, FiBookOpen } from 'react-icons/fi';
import DOMPurify from 'dompurify';

const ViewLessonPage = () => {
  const { id: courseId } = useParams(); // Changed from lessonId to courseId
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openLessonId, setOpenLessonId] = useState(null); // State for accordion

  useEffect(() => {
    const fetchCourseAndLessons = async () => {
      setLoading(true);
      try {
        // Fetch course details for the title
        const courseRes = await api.get(`/courses/${courseId}`);
        setCourse(courseRes.data);

        // Fetch all lessons for this course
        const lessonsRes = await api.get(`/lessons/course/${courseId}`);
        setLessons(lessonsRes.data);

        // Optionally open the first lesson by default
        if (lessonsRes.data.length > 0) {
          setOpenLessonId(lessonsRes.data[0].id);
        }

      } catch (error) {
        console.error("Gagal mengambil materi:", error);
        toast.error("Materi tidak ditemukan atau gagal dimuat.");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseAndLessons();
  }, [courseId, navigate]);

  const toggleLesson = (lessonId) => {
    setOpenLessonId(openLessonId === lessonId ? null : lessonId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <FiLoader className="animate-spin text-4xl text-indigo-600" />
        <p className="ml-3 text-lg text-gray-700">Memuat Materi...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-lg text-gray-700">Materi tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
            <button onClick={() => navigate('/lessons')} className="flex items-center gap-2 text-indigo-600 font-semibold mb-4">
              <FiChevronLeft /> Kembali ke Daftar Materi
            </button>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{course.nama}</h1>
            <p className="text-gray-500 mb-6">{course.deskripsi}</p>
        </div>

        <div className="mt-6 space-y-3">
            {lessons.length > 0 ? (
                lessons.map((lesson) => (
                    <div key={lesson.id} className="border border-gray-200 bg-white rounded-lg shadow-sm overflow-hidden">
                        <button
                            onClick={() => toggleLesson(lesson.id)}
                            className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <FiBookOpen className="text-indigo-500" />
                                <h2 className="text-lg font-semibold text-gray-800">{lesson.title}</h2>
                            </div>
                            <FiChevronDown className={`transform transition-transform text-gray-500 ${openLessonId === lesson.id ? 'rotate-180' : ''}`} />
                        </button>
                        {openLessonId === lesson.id && (
                            <div className="p-5 border-t border-gray-200 prose lg:prose-lg max-w-none">
                                {lesson.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content, { ADD_TAGS: ['img'], ADD_ATTR: ['src'] }) }} />
                                ) : (
                                    <p>Konten untuk materi ini tidak tersedia atau masih kosong.</p>
                                )}
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-600">Belum ada materi dalam course ini.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ViewLessonPage;
