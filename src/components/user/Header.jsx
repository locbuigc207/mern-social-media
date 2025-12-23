import React, { useState, useEffect, useRef } from "react";
import {
  FiSearch,
  FiHome,
  FiSettings,
  FiX,
  FiLogOut,
  FiMenu,
} from "react-icons/fi";

import { getCurrentUser, searchUsers } from "../../api/user";
import { logout } from "../../api/auth";
import NotificationDropdown from "./NotificationDropdown";
import MessageDropdown from "./MessageDropdown";
import { Link, useNavigate } from "react-router-dom";

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const [user, setUser] = useState(null);

  //State tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState([]); // Chứa danh sách user tìm được
  const [isSearching, setIsSearching] = useState(false);

  //State quản lý menu dropdown
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();
  const menuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Lỗi logout:", err);
    } finally {
      // Xóa token và user khỏi localStorage
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      // Redirect về trang đăng nhập
      navigate("/signin");
    }
  };

  // Lấy user + notification count
  useEffect(
    () => {
      const loadHeader = async () => {
        try {
          const res = await getCurrentUser();
          const currentUser = res.user;
          setUser(currentUser);
        } catch (err) {
          console.error("Lỗi tải thông tin user:", err);
        }
      };
      loadHeader();
    },
    [],
    []
  ); // Chỉ chạy 1 lần khi component mount

  //Logic tìm kiếm
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResult([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchUsers(searchQuery);
        setSearchResult(res.users || []);
      } catch (err) {
        setSearchResult([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Đợi 500ms sau khi ngừng gõ mới gọi API

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  //xử lý đóng menu khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  //TODO CLOSE SEARCH
  const handleCloseSearch = () => {
    setSearchQuery("");
    setSearchResult([]);
  };

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Left: Trang chủ + Search */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-2 p-2 rounded-lg hover:bg-gray-100"
          >
            <FiMenu size={22} />
          </button>
          <Link
            to="/home"
            className="text-blue-600 hover:text-blue-700 transition"
          >
            <FiHome className="text-3xl" />
          </Link>

          {/* --- SEARCH BAR --- */}
          <div className="relative hidden md:block w-80">
            <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
              <FiSearch className="text-gray-500 text-lg" />
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none ml-3 w-full text-sm text-gray-700"
              />
              {/* Nút xóa text hoặc loading */}
              {isSearching && (
                <div className="text-xs text-gray-400 animate-pulse">...</div>
              )}
              {!isSearching && searchQuery && (
                <FiX
                  className="text-gray-400 cursor-pointer hover:text-gray-600"
                  onClick={handleCloseSearch}
                />
              )}
            </div>

            {/* --- DROPDOWN KẾT QUẢ TÌM KIẾM --- */}
            {searchResult.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-lg mt-2 border border-gray-100 overflow-hidden max-h-96 overflow-y-auto animate-fadeIn">
                {searchResult.map((u) => (
                  <Link
                    key={u._id}
                    to={`/profile/${u._id}`}
                    onClick={handleCloseSearch} // Đóng search khi bấm vào
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-none"
                  >
                    <img
                      src={u.avatar || "/avatar.png"}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {u.fullname}
                      </p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Hiển thị "Không tìm thấy" */}
            {searchQuery && !isSearching && searchResult.length === 0 && (
              <div className="absolute top-full left-0 w-full bg-white shadow-md rounded-lg mt-2 p-3 text-center text-sm text-gray-500">
                Không tìm thấy người dùng.
              </div>
            )}
          </div>
        </div>

        {/* Right: Message+  Notification + Avatar + Logout */}
        <div className="flex items-center gap-4">
          {/**MessageDropdown */}
          <MessageDropdown />
          {/* Notification Dropdown */}
          <NotificationDropdown />
          <div className="relative" ref={menuRef}>
            {/* Avatar */}
            <div
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="cursor-pointer select-none"
            >
              {user ? (
                <img
                  src={user.avatar || "/avatar.png"}
                  alt={user.fullname}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200 hover:opacity-90 transition"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse" />
              )}
            </div>
            {/* Dropdown Menu - Hiển thị khi isMenuOpen = true */}
            {isMenuOpen && user && (
              <div className="absolute right-0 top-12 w-80 bg-white shadow-xl rounded-lg border border-gray-100 overflow-hidden p-2 animate-fadeIn">
                {/* Header của Menu  */}
                <div className="p-2 mb-2 bg-white rounded-lg shadow-sm border border-gray-100">
                  <Link
                    to={`/profile/${user._id}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <img
                      src={user.avatar || "/avatar.png"}
                      className="w-10 h-10 rounded-full object-cover"
                      alt="avatar"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">
                        {user.fullname}
                      </span>
                      <span className="text-sm text-gray-500">
                        Xem trang cá nhân của bạn
                      </span>
                    </div>
                  </Link>
                </div>

                <hr className="my-1 border-gray-200" />

                {/* Các lựa chọn Menu */}
                <div className="flex flex-col">
                  {/* Cài đặt */}
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="bg-gray-200 p-2 rounded-full">
                      <FiSettings className="text-xl text-black" />
                    </div>
                    <span className="font-medium">Cài đặt</span>
                  </Link>

                  {/* Đăng xuất */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition w-full text-left mt-1"
                  >
                    <div className="bg-gray-200 p-2 rounded-full">
                      <FiLogOut className="text-xl text-black" />
                    </div>
                    <span className="font-medium">Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
