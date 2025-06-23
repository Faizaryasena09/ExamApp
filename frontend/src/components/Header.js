import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiChevronDown } from "react-icons/fi";
import Cookies from "js-cookie";
import api from "../api";

function Header({ onToggleSidebar }) {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const nameFromCookie = Cookies.get("name");
    if (nameFromCookie) setUserName(nameFromCookie);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const name = Cookies.get("name");
    if (name) {
      try {
        await api.post("/session", { name, status: "offline" });
      } catch (err) {
        console.error("Gagal update status logout:", err);
      }
    }
    Cookies.remove("token");
    Cookies.remove("name");
    Cookies.remove("role");
    Cookies.remove("user_id");
    navigate("/");
  };

  return (
    <header className="bg-slate-800 px-4 sm:px-6 py-2 flex justify-between items-center shadow-md border-b border-slate-700">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="bg-slate-700 text-slate-200 rounded-sm p-2 text-2xl hover:bg-slate-600 transition-colors"
        >
          ☰
        </button>
        <h1 className="text-xl font-semibold text-white">ExamApp</h1>
      </div>
      <div ref={dropdownRef} className="relative">
        <div
          className="flex items-center cursor-pointer p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          onClick={() => setDropdownOpen(!isDropdownOpen)}
        >
          <span className="mr-3 text-slate-200 hidden sm:block">
            Selamat datang, <strong>{userName}</strong>
          </span>
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <FiChevronDown
            className={`ml-2 h-5 w-5 text-slate-400 transition-transform ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        <div
          className={`absolute right-0 mt-3 w-48 bg-white rounded-md shadow-lg py-1 z-20
                     transition-all duration-150 ease-in-out
                     ${isDropdownOpen
                       ? "opacity-100 scale-100"
                       : "opacity-0 scale-95 pointer-events-none"}`}
        >
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            <p className="font-semibold">Masuk sebagai</p>
            <p className="truncate">{userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 group"
          >
            <FiLogOut className="mr-3 text-gray-500 group-hover:text-red-500" />
            <span className="group-hover:text-gray-900">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;