import React from "react";
import { Link, NavLink } from "react-router-dom";
import { FiHome, FiUsers, FiBookOpen, FiX, FiPaperclip, FiFileText } from "react-icons/fi";

function Sidebar({ isOpen, onClose }) {
  const activeLinkStyle = {
    backgroundColor: '#334155',
    color: '#f8fafc',
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity md:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={onClose}
      ></div>

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-slate-300 z-50 
                   transition-transform duration-300 ease-in-out
                   ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-4 py-5 border-b border-slate-700">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-slate-100">ExamApp</h2>
          </div>
          
          <button
            className="text-slate-400 text-2xl hover:text-white md:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <FiX />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <NavLink
                to="/home"
                onClick={onClose}
                style={({ isActive }) => isActive ? activeLinkStyle : undefined}
                className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
              >
                <FiHome className="mr-3 text-lg" />
                <span>Beranda</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/usrmng"
                onClick={onClose}
                style={({ isActive }) => isActive ? activeLinkStyle : undefined}
                className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
              >
                <FiUsers className="mr-3 text-lg" />
                <span>Manajemen User</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/classmanage"
                onClick={onClose}
                style={({ isActive }) => isActive ? activeLinkStyle : undefined}
                className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
              >
                <FiBookOpen className="mr-3 text-lg" />
                <span>Manajemen Kelas</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/courses"
                onClick={onClose}
                style={({ isActive }) => isActive ? activeLinkStyle : undefined}
                className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
              >
                <FiFileText className="mr-3 text-lg" />
                <span>Manajemen Ujian</span>
              </NavLink>
            </li>
          </ul>
        </nav>
        
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-700">
        </div>
      </aside>
    </>
  );
}

export default Sidebar;