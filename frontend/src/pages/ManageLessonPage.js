import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from '../utils/toast';
import JoditEditor from 'jodit-react';
import { FiPlus, FiTrash2, FiChevronLeft, FiLoader, FiArrowUp, FiArrowDown, FiSave } from 'react-icons/fi';

const ManageLessonPage = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentLesson, setCurrentLesson] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');

  const editorConfig = useMemo(() => ({
    readonly: false,
    placeholder: 'Tulis konten materi di sini...',
    height: 400,
  }), []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const courseRes = await api.get(`/courses/${courseId}`);
      setCourse(courseRes.data);

      const lessonsRes = await api.get(`/lessons/course/${courseId}`);
      setLessons(lessonsRes.data);
    } catch (error) {
      console.error("Gagal mengambil data lesson", error);
      toast.error("Gagal memuat data. Kembali ke halaman sebelumnya.");
      navigate('/lessons');
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectLesson = (lesson) => {
    setCurrentLesson(lesson);
    setLessonTitle(lesson.title);
    setEditorContent(lesson.content);
  };

  const handleAddNew = () => {
    setCurrentLesson(null);
    setLessonTitle('');
    setEditorContent('');
  };

  const handleSave = async () => {
    if (!lessonTitle || !editorContent) {
      return toast.warn('Judul dan konten materi tidak boleh kosong.');
    }

    const payload = {
      course_id: courseId,
      title: lessonTitle,
      content: editorContent,
    };

    try {
      if (currentLesson) {
        await api.put(`/lessons/${currentLesson.id}`, payload);
        toast.success('Materi berhasil diperbarui');
      } else {
        await api.post('/lessons', payload);
        toast.success('Materi baru berhasil disimpan');
      }
      await fetchData();
      handleAddNew();
    } catch (error) {
      console.error("Gagal menyimpan materi", error);
      toast.error('Gagal menyimpan materi.');
    }
  };

  const handleDelete = async (lessonId) => {
    if (window.confirm('Anda yakin ingin menghapus materi ini?')) {
      try {
        await api.delete(`/lessons/${lessonId}`);
        toast.success('Materi berhasil dihapus');
        setLessons(lessons.filter(l => l.id !== lessonId));
        if (currentLesson && currentLesson.id === lessonId) {
          handleAddNew();
        }
      } catch (error) {
        console.error("Gagal menghapus materi", error);
        toast.error('Gagal menghapus materi.');
      }
    }
  };

  const handleSaveOrder = useCallback(async (reorderedLessons) => {
    const orderedIds = reorderedLessons.map(l => l.id);
    try {
      await api.post('/lessons/reorder', { course_id: courseId, orderedIds });
      toast.success('Urutan materi berhasil disimpan.');
    } catch (error) {
      console.error("Gagal menyimpan urutan", error);
      toast.error('Gagal menyimpan urutan materi.');
      fetchData(); // Revert UI on failure
    }
  }, [courseId, fetchData]);

  const handleMove = (index, direction) => {
    const newLessons = [...lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newLessons.length) return;

    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];
    setLessons(newLessons);
    handleSaveOrder(newLessons);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><FiLoader className="animate-spin text-4xl" /></div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate('/lessons')} className="flex items-center gap-2 text-indigo-600 font-semibold mb-4">
          <FiChevronLeft /> Kembali ke Daftar Lesson
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Kelola Materi untuk: {course?.nama}</h1>
        <p className="text-gray-500 mt-1">Tambah, edit, atau urutkan materi/section untuk course ini.</p>

        <div className="flex flex-col md:flex-row gap-8 mt-8">
          {/* Daftar Section */}
          <div className="md:w-1/3 bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Daftar Materi</h2>
              <div className="flex items-center gap-2">
                <button onClick={handleAddNew} className="p-2 rounded-full hover:bg-gray-200" title="Tambah Materi Baru">
                  <FiPlus />
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {lessons.map((lesson, index) => (
                <li key={lesson.id} className={`p-3 rounded-lg flex justify-between items-center group ${currentLesson?.id === lesson.id ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}>
                  <span onClick={() => handleSelectLesson(lesson)} className="flex-grow cursor-pointer">{lesson.title}</span>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-20 disabled:cursor-not-allowed"><FiArrowUp size={16} /></button>
                    <button onClick={() => handleMove(index, 'down')} disabled={index === lessons.length - 1} className="p-1 disabled:opacity-20 disabled:cursor-not-allowed"><FiArrowDown size={16} /></button>
                    <button onClick={() => handleDelete(lesson.id)} className="text-red-500 hover:text-red-700 p-1 ml-2"><FiTrash2 size={16} /></button>
                  </div>
                </li>
              ))}
              {lessons.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada materi.</p>}
            </ul>
          </div>

          {/* Editor */}
          <div className="md:w-2/3 bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-bold mb-4">{currentLesson ? 'Edit Materi' : 'Tambah Materi Baru'}</h2>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label htmlFor="lessonTitle" className="block text-sm font-medium text-gray-700 mb-1">Judul Materi</label>
                <input 
                  type="text"
                  id="lessonTitle"
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Contoh: Bab 1 - Pengenalan"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Konten Materi</label>
              <JoditEditor
                value={editorContent}
                config={editorConfig}
                onBlur={newContent => setEditorContent(newContent)}
              />
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
                Simpan Materi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageLessonPage;
