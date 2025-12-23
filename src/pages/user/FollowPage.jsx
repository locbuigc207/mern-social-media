import { useState, useEffect } from "react";
import { FiMenu } from "react-icons/fi";
import { useLocation } from "react-router-dom";

import Header from "../../components/user/Header";
import FollowSidebar from "../../components/user/FollowSidebar";
import FollowLayout from "../../components/user/FollowLayout";

export default function FollowPage() {
  // 1. State logic giống AdminDashboard/HomePage
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const location = useLocation();

  // Tự động đóng sidebar mobile khi chuyển tab
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location]);

  // Tự động mở lại sidebar khi resize màn hình to ra
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {/* HEADER */}
      <Header />

      {/* MAIN CONTAINER */}
      {/* pt-16 để tránh bị Header (fixed) che mất nội dung (giả sử header cao 64px) */}
      <div className="flex pt-16 max-w-360 mx-auto lg:pt-20">
        {/* 1. SIDEBAR */}
        <FollowSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* 2. MAIN CONTENT */}
        <main className="flex-1 min-w-0 px-4 py-6 lg:ml-0 transition-all duration-300">
          {/* Nút mở Menu cho Mobile (Nằm trong content thay vì fixed góc màn hình) */}
          {/* Lý do: Để không đè lên Header hoặc Logo */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-sm text-gray-700 font-semibold active:scale-95 transition-transform"
            >
              <FiMenu size={20} />
              <span>Menu</span>
            </button>
          </div>
          <FollowLayout />
        </main>
      </div>
    </div>
  );
}
