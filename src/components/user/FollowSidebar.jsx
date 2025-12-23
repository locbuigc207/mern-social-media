import {
  FiHome,
  FiUserPlus,
  FiUser,
  FiCalendar,
  FiUserCheck,
  FiChevronLeft,
  FiMenu,
} from "react-icons/fi";
import { NavLink } from "react-router-dom";

const menuItems = [
  { icon: FiHome, label: "Trang chủ", to: "/" },
  { icon: FiUser, label: "Đang theo dõi", to: "/following" },
  { icon: FiUserCheck, label: "Người theo dõi", to: "/followers" },
  { icon: FiUserPlus, label: "Gợi ý theo dõi", to: "/suggestions" },
  { icon: FiCalendar, label: "Sinh nhật", to: "/birthdays" },
];

export default function FollowSidebar({ sidebarOpen, setSidebarOpen }) {
  return (
    <>
      {/* Overlay mobile (Backdrop) */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity duration-300
          ${sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"}
        `}
        onClick={() => setSidebarOpen(false)}
      />

      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:sticky top-0 lg:top-16 left-0 z-40
          bg-white border-r border-gray-100
          h-full lg:h-[calc(100vh-64px)]
          transition-all duration-300 ease-out flex flex-col shadow-2xl lg:shadow-none
          ${sidebarOpen ? "w-[280px]" : "w-[280px] lg:w-[88px]"} 
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* Toggle Button (Desktop Only) */}
        <div
          className={`hidden lg:flex p-4 items-center ${
            sidebarOpen ? "justify-end" : "justify-center"
          }`}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-200"
            title={sidebarOpen ? "Thu gọn menu" : "Mở rộng menu"}
          >
            {sidebarOpen ? <FiChevronLeft size={22} /> : <FiMenu size={22} />}
          </button>
        </div>

        {/* MENU LIST */}
        <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                relative flex items-center p-3.5 rounded-xl transition-all duration-200 group overflow-hidden
                ${
                  isActive
                    ? "bg-blue-50 text-blue-600 font-bold" // Active: Nền xanh nhạt, chữ xanh đậm
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900" // Normal
                }
                ${!sidebarOpen ? "justify-center" : "gap-4"}
              `}
              title={!sidebarOpen ? item.label : ""} // Tooltip native khi thu nhỏ
            >
              {/* Icon */}
              <item.icon
                className={`
                   text-2xl shrink-0 transition-transform duration-200
                   ${!sidebarOpen ? "group-hover:scale-110" : ""}
                `}
              />

              {/* Label (Text) */}
              <span
                className={`
                  whitespace-nowrap transition-all duration-300
                  ${
                    !sidebarOpen
                      ? "w-0 opacity-0 absolute" // Ẩn hoàn toàn khi thu nhỏ
                      : "w-auto opacity-100 relative"
                  }
                `}
              >
                {item.label}
              </span>

              {/* Active Indicator (Thanh xanh nhỏ bên trái - Optional) */}
              {/* {isActive && sidebarOpen && (
                 <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-600 rounded-r-full"></span>
              )} */}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
