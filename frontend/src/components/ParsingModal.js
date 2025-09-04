import React, { useState, useEffect, useCallback, useRef } from 'react';
import mammoth from 'mammoth';
import { toast } from '../utils/toast';

function ParsingModal({ isOpen, onClose, file, onSave }) {
  const [htmlContent, setHtmlContent] = useState('');
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState({ soal: '', opsi: [], jawaban: '' });
  const [selectionMode, setSelectionMode] = useState('soal'); // 'soal', 'opsi', 'jawaban'
  const [editingIndex, setEditingIndex] = useState(null); // null or index
  const contentRef = useRef(null);

  const processFile = useCallback(async () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: event.target.result });
        setHtmlContent(result.value);
      } catch (error) {
        console.error('Error converting docx to html', error);
        toast.error('Gagal membaca file docx.');
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
      setHtmlContent('');
      setSelections([]);
      setCurrentSelection({ soal: '', opsi: [], jawaban: '' });
      setSelectionMode('soal');
      setEditingIndex(null);
    }
  }, [isOpen, processFile, file]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(`selections_${file?.name}`, JSON.stringify(selections));
    }
  }, [selections, isOpen, file]);

  const markTextAsParsed = (textToMark) => {
    if (contentRef.current) {
      const content = contentRef.current.innerHTML;
      const newContent = content.replace(textToMark, `<span class="bg-green-200">${textToMark}</span>`);
      if (content !== newContent) {
        contentRef.current.innerHTML = newContent;
      }
    }
  };
  
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount > 0) return;
  
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
  
    // Prevent selecting already parsed text
    if (range.startContainer.parentElement.closest('.bg-green-200') || range.endContainer.parentElement.closest('.bg-green-200')) {
      toast.warn("Teks ini sudah diparsing.");
      selection.removeAllRanges();
      return;
    }
  
    if (selectedText) {
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(range.cloneContents());
      const selectedHtml = tempDiv.innerHTML;
  
      switch (selectionMode) {
        case 'soal':
          setCurrentSelection(prev => ({ ...prev, soal: selectedHtml }));
          toast.success(`Soal ditandai: "${selectedText}"`);
          setSelectionMode('opsi');
          break;
        case 'opsi':
          setCurrentSelection(prev => ({ ...prev, opsi: [...prev.opsi, selectedHtml] }));
          toast.info(`Opsi ditandai: "${selectedText}"`);
          break;
        case 'jawaban':
          if (selectedText.length > 1) {
            toast.warn("Jawaban sebaiknya hanya satu huruf (misal: A, B, C).");
          }
          setCurrentSelection(prev => ({ ...prev, jawaban: selectedText.charAt(0).toUpperCase() }));
          toast.success(`Jawaban ditandai: "${selectedText}"`);
          break;
        default:
          break;
      }
    }
  };

  const addOrUpdateSoal = () => {
    if (!currentSelection.soal || currentSelection.opsi.length === 0 || !currentSelection.jawaban) {
      toast.error('Soal, Opsi, dan Jawaban harus lengkap.');
      return;
    }

    const newSelections = [...selections];
    if (editingIndex !== null) {
      newSelections[editingIndex] = currentSelection;
      toast.success('Soal berhasil diperbarui!');
    } else {
      newSelections.push(currentSelection);
      toast.success('Soal berhasil ditambahkan!');
    }
    
    // Mark text in document
    markTextAsParsed(currentSelection.soal);
    currentSelection.opsi.forEach(opsi => markTextAsParsed(opsi));
    
    setSelections(newSelections);
    setCurrentSelection({ soal: '', opsi: [], jawaban: '' });
    setSelectionMode('soal');
    setEditingIndex(null);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setCurrentSelection(selections[index]);
    setSelectionMode('soal'); // Reset mode to start editing from soal
  };

  const handleDelete = (index) => {
    if (window.confirm("Yakin ingin menghapus soal ini?")) {
      const newSelections = selections.filter((_, i) => i !== index);
      setSelections(newSelections);
      toast.info('Soal dihapus.');
    }
  };

  const resetCurrentSoal = () => {
    setCurrentSelection({ soal: '', opsi: [], jawaban: '' });
    setSelectionMode('soal');
    if (editingIndex !== null) {
      setEditingIndex(null);
    }
    toast.info('Soal saat ini direset.');
  };

  const handleSave = () => {
    if (selections.length === 0) {
      return toast.error('Tidak ada soal untuk disimpan.');
    }
    onSave(selections);
    localStorage.removeItem(`selections_${file?.name}`);
    onClose();
  };

  if (!isOpen) return null;

  const getModeButtonClass = (mode) => {
    return selectionMode === mode
      ? 'bg-blue-600 text-white'
      : 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col">
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Parse Soal Interaktif</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 p-6 overflow-y-auto border-r" onMouseUp={handleMouseUp}>
            <h3 className="font-semibold mb-2 text-gray-700">Konten Dokumen:</h3>
            <div
              ref={contentRef}
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>

          <div className="w-1/2 p-6 flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
              <h3 className="font-semibold mb-4 text-gray-700">Kontrol Seleksi:</h3>
              <div className="flex gap-2 mb-4 p-3 bg-gray-100 rounded-lg">
                <button onClick={() => setSelectionMode('soal')} className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass('soal')}`}>1. Tandai Soal</button>
                <button onClick={() => setSelectionMode('opsi')} className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass('opsi')}`}>2. Tandai Opsi</button>
                <button onClick={() => setSelectionMode('jawaban')} className={`px-4 py-2 rounded-md text-sm font-medium ${getModeButtonClass('jawaban')}`}>3. Tandai Jawaban</button>
              </div>

              <div className="mb-4 p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-2">{editingIndex !== null ? `Mengedit Soal #${editingIndex + 1}` : 'Soal Saat Ini:'}</h4>
                <div className="bg-gray-50 p-2 rounded text-xs mb-1"><strong>Soal:</strong> <span dangerouslySetInnerHTML={{ __html: currentSelection.soal || '...' }} /></div>
                <div className="bg-gray-50 p-2 rounded text-xs mb-1"><strong>Opsi:</strong> <ul>{currentSelection.opsi.map((o, i) => <li key={i} dangerouslySetInnerHTML={{ __html: o }} />)}</ul></div>
                <div className="bg-gray-50 p-2 rounded text-xs"><strong>Jawaban:</strong> {currentSelection.jawaban || '...'}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={addOrUpdateSoal} className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                    {editingIndex !== null ? 'Update Soal' : 'Tambah Soal ke Daftar'}
                  </button>
                  <button onClick={resetCurrentSoal} className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">
                    Reset Soal Ini
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <h3 className="font-semibold mb-2 text-gray-700">Daftar Soal ({selections.length}):</h3>
              <div className="space-y-2">
                {selections.map((s, index) => (
                  <div key={index} className={`border p-2 rounded text-xs flex justify-between items-start ${editingIndex === index ? 'bg-blue-50' : 'bg-white'}`}>
                    <div>
                      <p><strong>{index + 1}. </strong> <span dangerouslySetInnerHTML={{ __html: s.soal }} /></p>
                      <ul className="pl-4 list-disc list-inside">
                        {s.opsi.map((opt, i) => <li key={i} dangerouslySetInnerHTML={{__html: opt}} />)}
                      </ul>
                      <p className="pl-4"><strong>Jawaban:</strong> {s.jawaban}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button onClick={() => handleEdit(index)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(index)} className="text-xs text-red-600 hover:underline">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="p-4 border-t flex justify-end gap-4 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Batal</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Simpan & Terapkan</button>
        </footer>
      </div>
    </div>
  );
}

export default ParsingModal;