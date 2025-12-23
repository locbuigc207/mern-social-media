// src/components/NotificationDropdown.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FiBell,
  FiHeart,
  FiMessageCircle,
  FiUserPlus,
  FiCheck,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  getNotifications,
  markAllNotificationsAsRead,
} from "../../api/notification";
import { Link } from "react-router-dom";
import { toast } from 'react-hot-toast';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Lấy danh sách thông báo
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getNotifications();
        setNotifications(res.notifies || []);
        setUnreadCount(res.result || 0);
      } catch (err) {
        console.error("Lỗi load thông báo:", err);
        setError(err.message);
        toast.error("Không thể tải thông báo");
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  // Đóng/mở dropdown
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((noti) => ({ ...noti, isRead: true }))
      );
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc:", err);
      toast.error("Không thể đánh dấu đã đọc");
    }
  };

  // Đóng khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationIcon = (noti) => {
    const text = noti.text || "";
    if (text.includes("thích") || text.includes("like"))
      return <FiHeart className="text-red-500" />;
    if (text.includes("bình luận") || text.includes("comment"))
      return <FiMessageCircle className="text-blue-500" />;
    if (text.includes("theo dõi") || text.includes("following"))
      return <FiUserPlus className="text-green-500" />;
    return <FiBell className="text-gray-500" />;
  };

  const getNotificationText = (noti) => {
    return (
      <span>
        <b>{noti.user?.fullname}</b> {noti.text}
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <div className="relative cursor-pointer" onClick={handleToggle}>
        <FiBell className="text-2xl text-gray-600 hover:text-gray-800 transition" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-white z-10">
            <span className="font-semibold text-lg">Thông báo</span>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition flex items-center gap-1"
                title="Đánh dấu tất cả là đã đọc"
              >
                <FiCheck /> Đã đọc
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-96">
            {/* Hiển thị lỗi */}
            {error && (
              <div className="p-4 text-center text-red-600 text-sm">
                {error}
                <button
                  onClick={() => window.location.reload()}
                  className="block mx-auto mt-2 text-blue-600 hover:underline"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Hiển thị danh sách thông báo */}
            {!error && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {loading ? "Đang tải..." : "Chưa có thông báo nào"}
              </div>
            ) : (
              <ul>
                {notifications.map((noti) => (
                  <li
                    key={noti._id}
                    className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${
                      !noti.isRead ? "bg-blue-50/60" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className="mt-1">{getNotificationIcon(noti)}</div>

                    <div className="flex-1">
                      {/* Avatar + nội dung */}
                      <div className="flex items-start gap-2">
                        <img
                          src={noti.user?.avatar}
                          alt={noti.user?.fullname}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                        <div className="flex-1 text-sm">
                          {getNotificationText(noti)}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(noti.createdAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Nếu có post thì hiển thị ảnh preview */}
                      {noti.image && noti.image !== noti.user?.avatar && (
                        <Link
                          to={`/post/${noti.id}`}
                          onClick={() => setIsOpen(false)}
                        >
                          <img
                            src={noti.image}
                            alt="content"
                            className="mt-2 w-16 h-16 object-cover rounded-md border"
                          />
                        </Link>
                      )}
                    </div>

                    {/* Chấm xanh báo chưa đọc */}
                    {!noti.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;