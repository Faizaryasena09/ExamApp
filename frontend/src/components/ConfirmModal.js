// src/components/ConfirmModal.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

function ConfirmModal({ onConfirm, onCancel }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-96 text-center">
        <h2 className="text-xl font-semibold mb-4">Kerjakan Quiz Ini?</h2>
        <p className="mb-6">Pastikan kamu sudah siap sebelum memulai!</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onConfirm}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Kerjakan
          </button>
          <button
            onClick={onCancel || (() => navigate("/"))}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
