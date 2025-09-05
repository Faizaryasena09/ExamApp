const mammoth = require("mammoth");

// Logika ini dipindahkan dari frontend (ParsingModal.js) ke backend
const parseExamText = (rawText) => {
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
        // Simpan soal sebelumnya jika valid (memiliki jawaban)
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
        // Teks ini adalah kelanjutan dari item sebelumnya (soal atau opsi)
        if (state === "find_options" && currentSoal.opsi.length > 0) {
          // Lanjutan dari opsi terakhir
          const lastOptionIndex = currentSoal.opsi.length - 1;
          currentSoal.opsi[lastOptionIndex] += "\n" + line;
        } else {
          // Lanjutan dari soal (sebelum opsi pertama atau jika tidak ada opsi)
          currentSoal.soal += "\n" + line;
        }
      }
    }
  });

  // Simpan soal terakhir jika ada dan valid
  if (currentSoal && currentSoal.jawaban) {
    foundSoal.push(currentSoal);
  }

  // Membersihkan opsi kosong di akhir
  foundSoal.forEach(s => {
      s.opsi = s.opsi.filter(o => o.trim() !== "");
  });

  return foundSoal;
};


const parseDocx = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Tidak ada file yang diunggah." });
  }

  try {
    const buffer = req.file.buffer;
    
    // Ekstrak teks mentah dari buffer file .docx
    const { value } = await mammoth.extractRawText({ buffer });

    if (!value) {
        return res.status(500).json({ message: "Tidak dapat mengekstrak teks dari dokumen." });
    }

    // Parse teks mentah menjadi struktur soal
    const structuredQuestions = parseExamText(value);

    if (structuredQuestions.length === 0) {
        return res.status(404).json({ message: "Tidak ada soal dengan format yang benar ditemukan dalam dokumen." });
    }

    // Kirim hasil yang sudah terstruktur ke frontend
    res.status(200).json(structuredQuestions);

  } catch (error) {
    console.error("Error parsing docx:", error);
    res.status(500).json({ message: "Terjadi kesalahan di server saat memproses file.", error: error.message });
  }
};

module.exports = { parseDocx };
