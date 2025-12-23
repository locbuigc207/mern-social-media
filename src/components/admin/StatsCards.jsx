// src/components/admin/StatsCards.jsx
import { useAdmin } from "./AdminProvider";
import {
  FiUsers,
  FiFileText,
  FiMessageSquare,
  FiHeart,
  FiAlertTriangle,
} from "react-icons/fi";

export default function StatsCards() {
  // Lấy data từ AdminProvider
  const { stats, loading } = useAdmin();

  const cards = [
    {
      title: "Tổng người dùng",
      value: stats.total_users || 0,
      icon: <FiUsers className="w-6 h-6 text-white" />,
      bg: "bg-blue-500", // Màu nền icon
    },
    {
      title: "Bài viết",
      value: stats.total_posts || 0,
      icon: <FiFileText className="w-6 h-6 text-white" />,
      bg: "bg-indigo-500",
    },
    {
      title: "Bình luận",
      value: stats.total_comments || 0,
      icon: <FiMessageSquare className="w-6 h-6 text-white" />,
      bg: "bg-green-500",
    },
    {
      title: "Lượt thích",
      value: stats.total_likes || 0,
      icon: <FiHeart className="w-6 h-6 text-white" />,
      bg: "bg-pink-500",
    },
    {
      title: "Bài viết Spam",
      value: stats.total_spam_posts || 0,
      icon: <FiAlertTriangle className="w-6 h-6 text-white" />,
      bg: "bg-red-500",
      isDanger: true, // Cờ đánh dấu để style khác biệt
    },
  ];

  // 1. Giao diện khi đang tải (Skeleton Loading)
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse h-32"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Giao diện hiển thị số liệu
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-transform hover:-translate-y-1 hover:shadow-md ${
            card.isDanger ? "border-red-100 bg-red-50/30" : ""
          }`}
        >
          <div className="flex items-center gap-4 relative z-10">
            {/* Icon Box */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${card.bg}`}
            >
              {card.icon}
            </div>

            {/* Info */}
            <div>
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <h4 className="text-2xl font-bold text-gray-800 mt-1">
                {card.value.toLocaleString()}
              </h4>
            </div>
          </div>

          {/* Decorative circle background */}
          <div
            className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${card.bg}`}
          />
        </div>
      ))}
    </div>
  );
}
