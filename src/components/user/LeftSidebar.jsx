import { useState, useEffect } from "react";
import { getCurrentUser, getFollowing } from "../../api/user";
import { Link, useLocation } from "react-router-dom";
import {
  FiUser,
  FiUsers,
  FiClock,
  FiBookmark,
  FiUserPlus,
  FiPlayCircle,
  FiMenu,
  FiChevronLeft,
} from "react-icons/fi";
export default function LeftSidebar({ sidebarOpen, setSidebarOpen }) {
  const [user, setUser] = useState(null);
  const [followingCount, setFollowingCount] = useState(0);
  const location = useLocation(); //Theo dõi trang hiện tại

  useEffect(() => {
    const load = async () => {
      const u = await getCurrentUser();
      setUser(u.user);

      const res = await getFollowing();
      if (res && Array.isArray(res.following)) {
        setFollowingCount(res.following.length);
      }
    };
    load();
  }, []);

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const menu = [
    {
      icon: user?.avatar ? (
        <img
          src={user.avatar}
          className="w-8 h-8 rounded-full object-cover"
          alt="avatar"
        />
      ) : (
        <FiUser />
      ),
      label: user?.fullname || "Tên của bạn",
      key: "profile",
      to: user ? `/profile/${user._id}` : "/signin",
    },
    {
      icon: <FiUsers />,
      label: "Đang theo dõi",
      key: "following",
      to: "/following",
    },
    { icon: <FiClock />, label: "Kỷ niệm", key: "memories", to: "/memories" },
    { icon: <FiBookmark />, label: "Đã lưu", key: "saved", to: "/saved" },
    { icon: <FiUserPlus />, label: "Nhóm", key: "groups", to: "/groups" },
    { icon: <FiPlayCircle />, label: "Video", key: "videos", to: "/videos" },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* --- 2. SIDEBAR --- */}
      <aside
        className={`
          fixed lg:sticky top-0 lg:top-16 inset-y-0 left-0 z-40
          bg-white border-r border-gray-200 shadow-xl lg:shadow-none
          flex flex-col h-full lg:h-screen
          transition-all duration-300 ease-in-out overflow-hidden
          ${sidebarOpen ? "w-70" : "w-70 lg:w-20"} 
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* Toggle (Desktop) */}
        <div className="hidden lg:flex justify-end p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            {sidebarOpen ? <FiChevronLeft size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-hide">
          {menu.map((item) => {
            const isActive = location.pathname === item.to;

            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={handleLinkClick}
                className={`
                  flex items-center gap-4 px-4 py-3 rounded-lg transition-all group
                  ${
                    isActive
                      ? "bg-[#EBF5FF] text-[#0866FF] font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                  ${!sidebarOpen && "lg:justify-center lg:px-2"}
                `}
                title={!sidebarOpen ? item.label : ""}
              >
                <span
                  className={`text-xl shrink-0 flex items-center justify-center ${
                    isActive
                      ? "text-[#0866FF]"
                      : "text-gray-500 group-hover:text-gray-900"
                  }`}
                >
                  {item.icon}
                </span>

                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-300
                    ${
                      !sidebarOpen
                        ? "lg:w-0 lg:opacity-0 hidden lg:block"
                        : "opacity-100 w-auto"
                    }
                  `}
                >
                  {item.label}
                </span>

                {/* Badge following */}
                {item.key === "following" &&
                  followingCount > 0 &&
                  sidebarOpen && (
                    <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {followingCount}
                    </span>
                  )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
