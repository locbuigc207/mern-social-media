import { useEffect, useState } from "react";
import {
  FiClock,
  FiCheck,
  FiInfo,
  FiAlertCircle,
  FiMessageSquare,
} from "react-icons/fi";
import { notificationsApi } from "../../api/admin";
import { useNavigate } from "react-router-dom";

//Hàm tính thời gian tương đối
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
};

export default function AdminNotifications({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Gọi API khi isOpen = true
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Gọi API lấy 5 thông báo mới nhất
      const res = await notificationsApi.getAll({ limit: 5 });

      console.log("Dữ liệu thông báo:", res); //Debug
      const formattedData = res.notifications.map((item) => ({
        id: item._id,
        type: item.type || "user",
        user: item.user?.username || "Người dùng",
        avatar: item.user?.avatar,
        content: item.text || item.content || "đã thực hiện một hành động",
        time: formatTimeAgo(item.createdAt),
        isRead: item.isRead,
        url: item.url,
      }));

      setNotifications(formattedData);
    } catch (error) {
      console.error("Lỗi tải thông báo:", error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
  };

  const handleNotificationClick = (notif) => {
    // Đánh dấu đã đọc (UI)
    const updated = notifications.map((n) =>
      n.id === notif.id ? { ...n, isRead: true } : n
    );
    setNotifications(updated);

    // Chuyển hướng nếu có URL
    if (notif.url) {
      navigate(notif.url);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up origin-top-right">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
        <h3 className="font-bold text-lg text-gray-800">Thông báo</h3>
        <button
          onClick={handleMarkAllRead}
          className="text-xs text-[#0866FF] font-medium hover:underline"
        >
          Đánh dấu đã đọc
        </button>
      </div>

      {/* List */}
      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Đang tải...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không có thông báo mới
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer relative ${
                !notif.isRead ? "bg-blue-50/30" : ""
              }`}
            >
              {/* Avatar / Icon */}
              <div className="shrink-0 relative">
                {notif.avatar ? (
                  <img
                    src={notif.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <FiInfo className="text-gray-600" />
                  </div>
                )}

                {/* Icon loại thông báo nhỏ ở góc */}
                <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                  {notif.type === "report" && (
                    <FiAlertCircle className="w-4 h-4 text-red-500 fill-red-100" />
                  )}
                  {notif.type === "system" && (
                    <FiCheck className="w-4 h-4 text-green-500 fill-green-100" />
                  )}
                  {/* Mặc định là icon message */}
                  {(notif.type === "user" ||
                    notif.type === "comment" ||
                    notif.type === "like") && (
                    <FiMessageSquare className="w-4 h-4 text-blue-500 fill-blue-100" />
                  )}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1">
                <p className="text-sm text-gray-800 leading-snug">
                  <span className="font-semibold">{notif.user}</span>{" "}
                  {notif.content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Hiển thị loại thông báo nếu muốn */}
                  {/* <p className="text-xs text-[#0866FF] font-medium">
                    {notif.type.toUpperCase()}
                  </p>
                  <span className="text-gray-300">•</span> */}

                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <FiClock className="w-3 h-3" /> {notif.time}
                  </p>
                </div>
              </div>

              {/* Unread Dot */}
              {!notif.isRead && (
                <div className="w-3 h-3 bg-[#0866FF] rounded-full mt-2 shrink-0"></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
        <button
          onClick={() => navigate("/admin/notifications")} // Điều hướng đến trang quản lý thông báo full (nếu có)
          className="text-sm font-medium text-gray-600 hover:text-[#0866FF] transition-colors"
        >
          Xem tất cả thông báo
        </button>
      </div>

      {/* Backdrop vô hình để click outside close */}
      <div className="fixed inset-0 z-[-1]" onClick={onClose}></div>
    </div>
  );
}
