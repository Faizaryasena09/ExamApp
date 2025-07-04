import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

function toAbsoluteImageSrc(html) {
  const baseURL = api.defaults.baseURL || "http://localhost:5000/api";

  return html.replace(/src="\/uploads/g, `src="${baseURL}/uploads`);
}

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const QuestionCard = ({ question, index }) => {
  const opsi = useMemo(() => {
    try {
      return Array.isArray(question.opsi) ? question.opsi : JSON.parse(question.opsi || "[]");
    } catch {
      return [];
    }
  }, [question.opsi]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transition-shadow hover:shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-start">
        <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
          {index + 1}
        </span>
        <div dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(question.soal) }} className="prose max-w-none" />
      </h2>

      <ul className="space-y-3">
        {opsi.map((opsiText, i) => (
          <li
            key={i}
            className="p-4 rounded-lg border bg-gray-100 border-gray-200 text-gray-700 flex items-start space-x-3"
          >
            <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
            <div dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(opsiText) }} className="prose max-w-none text-sm" />

          </li>
        ))}
      </ul>
    </div>
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

const PreviewPage = () => {
  const { id: courseId } = useParams();
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPreviewSoal = async () => {
    try {
      const config = await api.get(`/courses/${courseId}`);
      const acakSoal = config.data.acakSoal;
      const acakJawaban = config.data.acakJawaban;

      const soalRes = await api.get(`/courses/${courseId}/questions`);
      const rawSoal = soalRes.data;

      const soalFinal = (acakSoal ? shuffleArray(rawSoal) : rawSoal).map((soal) => {
        const opsiOriginal = typeof soal.opsi === "string" ? JSON.parse(soal.opsi) : soal.opsi;
        const opsiFinal = acakJawaban ? shuffleArray([...opsiOriginal]) : [...opsiOriginal];

        const opsiCleaned = opsiFinal.map((opsiHTML) => {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(opsiHTML, "text/html");
            const firstNode = doc.body.firstChild;

            if (
              firstNode &&
              firstNode.nodeType === 1 &&
              firstNode.childNodes.length === 1 &&
              firstNode.firstChild.nodeType === 3
            ) {
              const rawText = firstNode.textContent;
              if (/^[A-Da-d]\.\s*/.test(rawText)) {
                firstNode.textContent = rawText.replace(/^[A-Da-d]\.\s*/, "");
                return firstNode.outerHTML;
              }
            }

            return opsiHTML;
          } catch {
            return opsiHTML;
          }
        });

        return {
          ...soal,
          opsi: opsiCleaned,
        };
      });

      setSoalList(soalFinal);
    } catch (err) {
      console.error("❌ Gagal ambil soal preview:", err);
      setError("Gagal memuat soal. Pastikan koneksi dan server tersedia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreviewSoal();
  }, [courseId]);

  return (
    <div className="bg-gray-50 min-h-screen py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Preview Soal</h1>
          <p className="text-gray-500">Berikut adalah daftar soal dan pilihan jawabannya.</p>
        </header>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <div className="space-y-8">
            {soalList.map((soal, index) => (
              <QuestionCard key={soal.id || index} question={soal} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPage;
