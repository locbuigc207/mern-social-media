import { useState } from "react";
import { FiMenu, FiX, FiSearch, FiBell } from "react-icons/fi";
import AdminNotifications from "./AdminNotifications";

export default function AdminHeader({ sidebarOpen, setSidebarOpen }) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-white shadow-sm border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Toggle & Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
        >
          {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-gray-100 px-4 py-2 rounded-full w-64 transition-all focus-within:w-72 focus-within:ring-2 focus-within:ring-blue-100">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell  */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full relative transition-all ${
              showNotifications
                ? "bg-blue-50 text-[#0866FF]"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <FiBell size={20} />
            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <AdminNotifications
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 group-hover:text-[#0866FF] transition-colors">
              Admin User
            </p>
            <p className="text-xs text-gray-500">Super Admin</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden ring-2 ring-white shadow-sm group-hover:ring-blue-100 transition-all">
            <img
              src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
              alt="Admin"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
