import React, { useState, useEffect, useCallback, useRef } from "react";
import { renderAsync } from "docx-preview";
import { toast } from "../utils/toast";
import html2canvas from "html2canvas";
import api from "../api"; // Menggunakan instance axios yang sudah dikonfigurasi

// Komponen untuk loading overlay
const LoadingOverlay = () => (
  <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-10">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-400"></div>
    <p className="text-white text-lg mt-4 font-semibold">
      Menganalisis Teks dengan AI...
    </p>
    <p className="text-gray-300 mt-1">
      Mendukung multi-bahasa, tulisan Arab, dan formula.
    </p>
  </div>
);

function ParsingModal({ isOpen, onClose, file, onSave }) {
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState({
    soal: "",
    opsi: [],
    jawaban: "",
  });
  const [selectionMode, setSelectionMode] = useState("soal");
  const [editingIndex, setEditingIndex] = useState(null);
  const [isParsing, setIsParsing] = useState(false); // State untuk loading OCR
  const contentRef = useRef(null);

  const processFile = useCallback(async () => {
    if (!file || !contentRef.current) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await renderAsync(event.target.result, contentRef.current, null, {
          className: "docx",
          inWrapper: false,
        });
      } catch (error) {
        console.error("Error rendering docx", error);
        toast.error("Gagal membaca file docx.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  useEffect(() => {
    if (isOpen) {
      processFile();
      const savedSelections = localStorage.getItem(`selections_${file?.name}`);
      if (savedSelections) {
        setSelections(JSON.parse(savedSelections));
      }
    } else {
      setSelections([]);
      setCurrentSelection({ soal: "", opsi: [], jawaban: "" });
      setSelectionMode("soal");
      setEditingIndex(null);
      if (contentRef.current) contentRef.current.innerHTML = "";
    }
  }, [isOpen, processFile, file]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(
        `selections_${file?.name}`,
        JSON.stringify(selections)
      );
    }
  }, [selections, isOpen, file]);

  // Logika parsing yang akan digunakan pada teks hasil OCR
  const parseOcrText = (rawText) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const foundSoal = [];
    let currentSoal = null;
    let state = "find_question"; // states: find_question, find_options, find_answer

    const questionNumberRegex = /^\d+[\.\)]\s*/;
    const optionRegex = /^[A-Ea-e][\.\)]\s*/;
    const answerRegex = /^(?:ANS|JAWABAN)\s*:\s*([A-Ea-e])/i;

    lines.forEach((line) => {
      const isQuestionStart = questionNumberRegex.test(line);
      const isOption = optionRegex.test(line);
      const isAnswer = answerRegex.test(line);

      if (isQuestionStart) {
        if (currentSoal) {
          if (currentSoal.jawaban) {
            foundSoal.push(currentSoal);
          }
        }
        currentSoal = {
          soal: line.replace(questionNumberRegex, "").trim(),
          opsi: [],
          jawaban: "",
        };
        state = "find_options";
      } else if (currentSoal) {
        if (isOption) {
          currentSoal.opsi.push(line.replace(optionRegex, "").trim());
          state = "find_options";
        } else if (isAnswer) {
          const match = line.match(answerRegex);
          if (match) {
            currentSoal.jawaban = match[1].toUpperCase();
            foundSoal.push(currentSoal);
            currentSoal = null;
            state = "find_question";
          }
        } else {
          if (state === "find_options" && currentSoal.opsi.length > 0) {
            const lastOptionIndex = currentSoal.opsi.length - 1;
            currentSoal.opsi[lastOptionIndex] += "\n" + line;
          } else {
            currentSoal.soal += "\n" + line;
          }
        }
      }
    });

    if (currentSoal && currentSoal.jawaban) {
      foundSoal.push(currentSoal);
    }
    
    foundSoal.forEach(s => {
        s.opsi = s.opsi.filter(o => o.trim() !== "");
    });

    return foundSoal;
  };

  const handleAutoParse = async () => {
    if (!contentRef.current) return;
    setIsParsing(true);

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

      const formData = new FormData();
      formData.append("image", blob, "screenshot.png");

      const response = await api.post("/ocr/parse-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const { text } = response.data;
      // Log ini kita pertahankan untuk debugging jika diperlukan
      console.log("--- RAW OCR TEXT FROM BACKEND ---", text);
      if (!text) {
        toast.error("OCR tidak dapat mendeteksi teks apa pun.");
        return;
      }

      const parsedSoal = parseOcrText(text);

      if (parsedSoal.length > 0) {
        setSelections(parsedSoal);
        toast.success(`${parsedSoal.length} soal berhasil diparsing dengan AI!`);
      } else {
        toast.warn(
          "Tidak ada soal yang terdeteksi dengan format yang benar. Periksa kembali format penulisan soal."
        );
      }
    } catch (err) {
      console.error("OCR error:", err);
      const errorMessage =
        err.response?.data?.message || "Gagal melakukan OCR via server.";
      toast.error(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  // Sisa kode tidak berubah...
  const markTextAsParsed = (textToMark) => {
    if (contentRef.current && textToMark) {
      const content = contentRef.current.innerHTML;
      const newContent = content.replace(
        textToMark,
        () => `<span class="bg-green-200">${textToMark}</span>`
      );
      if (content !== newContent) {
        contentRef.current.innerHTML = newContent;
      }
    }
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount > 0) return;

    const range = selection.getRangeAt(0);
    if (
      range.startContainer.parentElement.closest(".bg-green-200") ||
      range.endContainer.parentElement.closest(".bg-green-200")
    ) {
      toast.warn("Teks ini sudah diparsing.");
      selection.removeAllRanges();
      return;
    }

    const selectedText = range.toString().trim();
    if (selectedText) {
      const tempDiv = document.createElement("div");
      tempDiv.appendChild(range.cloneContents());
      const selectedHtml = tempDiv.innerHTML;

      switch (selectionMode) {
        case "soal":
          setCurrentSelection((prev) => ({ ...prev, soal: selectedHtml }));
          toast.success(`Soal ditandai`);
          setSelectionMode("opsi");
          break;
        case "opsi":
          setCurrentSelection((prev) => ({
            ...prev,
            opsi: [...prev.opsi, selectedHtml],
          }));
          toast.info(`Opsi ditandai`);
          break;
        case "jawaban":
          if (selectedText.length > 1)
            toast.warn("Jawaban sebaiknya hanya satu huruf.");
          setCurrentSelection((prev) => ({
            ...prev,
            jawaban: selectedText.charAt(0).toUpperCase(),
          }));
          toast.success(`Jawaban ditandai`);
          break;
        default:
          break;
      }
    }
  };

  const addOrUpdateSoal = () => {
    if (
      !currentSelection.soal ||
      currentSelection.opsi.length === 0 ||
      !currentSelection.jawaban
    ) {
      toast.error("Soal, Opsi, dan Jawaban harus lengkap.");
      return;
    }

    const newSelections = [...selections];
    if (editingIndex !== null) {
      newSelections[editingIndex] = currentSelection;
      toast.success("Soal berhasil diperbarui!");
    } else {
      newSelections.push(currentSelection);
      toast.success("Soal berhasil ditambahkan!");
    }

    markTextAsParsed(currentSelection.soal);
    currentSelection.opsi.forEach((opsi) => markTextAsParsed(opsi));

    setSelections(newSelections);
    setCurrentSelection({ soal: "", opsi: [], jawaban: "" });
    setSelectionMode("soal");
    setEditingIndex(null);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setCurrentSelection(selections[index]);
    setSelectionMode("soal");
  };

  const handleDelete = (index) => {
    if (window.confirm("Yakin ingin menghapus soal ini?")) {
      setSelections(selections.filter((_, i) => i !== index));
      toast.info("Soal dihapus.");
    }
  };

  const resetCurrentSoal = () => {
    setCurrentSelection({ soal: "", opsi: [], jawaban: "" });
    setSelectionMode("soal");
    if (editingIndex !== null) setEditingIndex(null);
    toast.info("Soal saat ini direset.");
  };

  const handleSave = () => {
    if (selections.length === 0)
      return toast.error("Tidak ada soal untuk disimpan.");
    onSave(selections);
    localStorage.removeItem(`selections_${file?.name}`);
    onClose();
  };

  if (!isOpen) return null;

  const getModeButtonClass = (mode) =>
    selectionMode === mode
      ? "bg-blue-600 text-white"
      : "bg-gray-200 text-gray-800 hover:bg-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col relative">
        {isParsing && <LoadingOverlay />}
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            Parse Soal Interaktif
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
          >
            &times;
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div
            className="w-1/2 p-6 overflow-y-auto border-r"
            onMouseUp={handleMouseUp}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">Konten Dokumen:</h3>
              <button
                onClick={handleAutoParse}
                disabled={isParsing}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-semibold disabled:bg-purple-300 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Parse Cerdas (AI)
              </button>
            </div>
            <div
              ref={contentRef}
              className="prose max-w-none docx-preview-container"
            />
          </div>

          <div className="w-1/2 p-6 flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
              <h3 className="font-semibold mb-4 text-gray-700">
                Kontrol Seleksi Manual:
              </h3>
              <div className="flex gap-2 mb-4 p-3 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setSelectionMode("soal")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass(
                    "soal"
                  )}`}
                >
                  1. Tandai Soal
                </button>
                <button
                  onClick={() => setSelectionMode("opsi")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass(
                    "opsi"
                  )}`}
                >
                  2. Tandai Opsi
                </button>
                <button
                  onClick={() => setSelectionMode("jawaban")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass(
                    "jawaban"
                  )}`}
                >
                  3. Tandai Jawaban
                </button>
              </div>

              <div className="mb-4 p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-2">
                  {editingIndex !== null
                    ? `Mengedit Soal #${editingIndex + 1}`
                    : "Soal Saat Ini:"}
                </h4>
                <div className="bg-gray-50 p-2 rounded text-xs mb-1">
                  <strong>Soal:</strong>{" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currentSelection.soal || "...",
                    }}
                  />
                </div>
                <div className="bg-gray-50 p-2 rounded text-xs mb-1">
                  <strong>Opsi:</strong>{" "}
                  <ul>
                    {currentSelection.opsi.map((o, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: o }} />
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <strong>Jawaban:</strong> {currentSelection.jawaban || "..."}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={addOrUpdateSoal}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    {editingIndex !== null ? "Update Soal" : "Tambah Soal"}
                  </button>
                  <button
                    onClick={resetCurrentSoal}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h3 className="font-semibold mb-2 text-gray-700">
                Daftar Soal ({selections.length}):
              </h3>
              <div className="space-y-2">
                {selections.map((s, index) => (
                  <div
                    key={index}
                    className={`border p-2 rounded text-xs flex justify-between items-start ${ 
                      editingIndex === index ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    <div>
                      <p>
                        <strong>{index + 1}. </strong>{" "}
                        <span
                          dangerouslySetInnerHTML={{ __html: s.soal.replace(/\n/g, '<br/>') }}
                        />
                      </p>
                      <ul className="pl-4 list-disc list-inside">
                        {s.opsi.map((opt, i) => (
                          <li key={i} dangerouslySetInnerHTML={{ __html: opt.replace(/\n/g, '<br/>') }} />
                        ))}
                      </ul>
                      <p className="pl-4">
                        <strong>Jawaban:</strong> {s.jawaban}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleEdit(index)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="p-4 border-t flex justify-end gap-4 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
          >
            Simpan & Terapkan
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ParsingModal;
