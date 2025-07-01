// src/components/RichTextEditor.js
import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function RichTextEditor({ value, onChange, placeholder }) {
  const modules = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["image"],
    ],
  };

  return (
    <ReactQuill
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder || "Tulis di sini..."}
      className="bg-white border border-gray-300 rounded-md shadow-sm"
    />
  );
}
