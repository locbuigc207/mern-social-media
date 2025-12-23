// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiFlag, FiPieChart, FiLogOut } from "react-icons/fi";
//Import api logout
import { logout } from "../../api/auth";

// Import components
import AdminProvider from "../../components/admin/AdminProvider";
import AdminHeader from "../../components/admin/AdminHeader";

function AdminLayoutContent() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location]);

  // Menu Configuration
  const menuItems = [
    { path: "/admin", icon: FiHome, label: "Tổng quan", end: true },
    { path: "/admin/users", icon: FiUsers, label: "Quản lý người dùng" },
    { path: "/admin/posts", icon: FiFlag, label: "Quản lý bài viết" },
    { path: "/admin/analytics", icon: FiPieChart, label: "Thống kê & Báo cáo" },
  ];

  const handleLogout = async () => {
    //Gọi API
    await logout();
    // Xoá token khỏi localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    //
    navigate("/signin");
  };

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden">
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* --- SIDEBAR --- */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40
          bg-white border-r border-gray-200 
          transition-all duration-300 flex flex-col h-full shadow-lg lg:shadow-none ${
            sidebarOpen ? "w-[280px]" : "w-[280px] lg:w-20"
          } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-[#0866FF] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1
            className={`font-bold text-2xl text-[#0866FF] tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${
              !sidebarOpen && "opacity-0 w-0"
            }`}
          >
            Admin Panel
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `
                  flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group whitespace-nowrap overflow-hidden
                  ${
                    isActive
                      ? "bg-[#EBF5FF] text-[#0866FF] font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                <item.icon
                  className={`text-xl shrink-0 ${
                    isActive
                      ? "text-[#0866FF]"
                      : "text-gray-500 group-hover:text-gray-900"
                  }`}
                />
                <span
                  className={`${
                    !sidebarOpen && "hidden"
                  } transition-opacity duration-200`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all w-full whitespace-nowrap overflow-hidden group"
          >
            <FiLogOut className="text-xl shrink-0 group-hover:text-red-600" />
            <span className={`${!sidebarOpen && "hidden"}`}>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* --- HEADER --- */}
        <AdminHeader
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {location.pathname === "/admin" && (
              <div className="mb-8 animate-fade-in-down">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Tổng quan hệ thống
                </h2>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminLayoutContent />
    </AdminProvider>
  );
}
