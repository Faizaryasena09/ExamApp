import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

const ScoreCard = ({ score, totalQuestions }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 text-center">
    <h3 className="text-xl font-semibold text-gray-600 mb-2">Skor Siswa</h3>
    <p className="text-5xl font-bold text-blue-600">
      {score}
      <span className="text-3xl text-gray-400">/{totalQuestions}</span>
    </p>
    <p className="mt-3 text-gray-500">Jawaban Benar</p>
  </div>
);

const QuestionCard = ({ question, index }) => {
  const opsi = useMemo(() => {
    try {
      return Array.isArray(question.opsi) ? question.opsi : JSON.parse(question.opsi || '[]');
    } catch {
      return [];
    }
  }, [question.opsi]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transition-shadow hover:shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-start">
        <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">{index + 1}</span>
        {question.soal}
      </h2>
      <ul className="space-y-3">
        {opsi.map((opsiText, i) => (
          <Option
            key={i}
            index={i}
            text={opsiText}
            isCorrect={String.fromCharCode(65 + i) === question.jawaban_benar}
            isSelected={String.fromCharCode(65 + i) === question.jawaban_siswa}
          />
        ))}
      </ul>
    </div>
  );
};

const Option = ({ index, text, isCorrect, isSelected }) => {
  const getOptionLabel = (idx) => String.fromCharCode(65 + idx);
  const label = getOptionLabel(index);

  let style = 'bg-gray-100 border-gray-200 text-gray-700';
  let icon = null;

  if (isSelected && isCorrect) {
    style = 'bg-green-100 border-green-300 text-green-800 font-semibold';
    icon = <span className="text-green-500">✔ Jawaban Anda (Benar)</span>;
  } else if (isSelected && !isCorrect) {
    style = 'bg-red-100 border-red-300 text-red-800 font-semibold';
    icon = <span className="text-red-500">✖ Jawaban Anda (Salah)</span>;
  } else if (isCorrect) {
    style = 'bg-green-100 border-green-300 text-green-800';
    icon = <span className="text-green-600">✔ Kunci Jawaban</span>;
  }

  return (
    <li className={`p-4 rounded-lg border flex justify-between items-center transition-colors ${style}`}>
      <span>
        <strong className="mr-2">{label}.</strong> {text}
      </span>
      {icon && <span className="text-sm font-bold">{icon}</span>}
    </li>
  );
};

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>
);

const ErrorMessage = ({ message }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
        <p className="font-bold">Terjadi Kesalahan</p>
        <p>{message}</p>
    </div>
);


const ExamResultPage = () => {
  const { courseId, userId } = useParams();
  const [examData, setExamData] = useState({ questions: [], studentName: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/courses/${courseId}/user/${userId}/hasil`);
        if (res.data && res.data.length > 0) {
            setExamData({
                questions: res.data,
                studentName: res.data[0].siswa_name || 'Siswa',
            });
        }
        setError(null);
      } catch (err) {
        console.error('❌ Gagal ambil hasil ujian:', err);
        setError('Tidak dapat memuat hasil ujian. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [courseId, userId]);

  const score = useMemo(() => {
      return examData.questions.reduce((acc, q) => {
          return q.jawaban_siswa === q.jawaban_benar ? acc + 1 : acc;
      }, 0);
  }, [examData.questions]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Hasil Ujian</h1>
          <p className="text-lg text-gray-500 mt-1">
            Detail jawaban untuk <span className="font-semibold text-blue-600">{examData.studentName}</span>
          </p>
        </header>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <main className="lg:col-span-2 space-y-6">
              {examData.questions.map((q, index) => (
                <QuestionCard key={q.soal_id} question={q} index={index} />
              ))}
            </main>
            
            <aside className="lg:col-span-1">
                <div className="sticky top-8">
                    <ScoreCard score={score} totalQuestions={examData.questions.length} />
                </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResultPage;