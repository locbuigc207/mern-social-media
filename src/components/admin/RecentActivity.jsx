import { useEffect, useState } from "react";
import { activitiesApi } from "../../api/admin";
import { Link } from "react-router-dom";
import { FiUserPlus, FiEdit3, FiMessageCircle, FiBell } from "react-icons/fi";

//Hàm tính thời gian tương đối
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Gọi API lấy 10 hoạt động gần nhất
        const res = await activitiesApi.getRecent({ limit: 10 });

        // Backend trả về: { recentUsers: [], recentPosts: [], recentComments: [] }
        const newUsers = res.recentUsers.map((u) => ({
          id: `user-${u._id}`,
          user: u.username,
          avatar: u.avatar,
          action: "đã tham gia hệ thống",
          time: u.createdAt,
          type: "register",
        }));

        const newPosts = res.recentPosts.map((p) => ({
          id: `post-${p._id}`,
          user: p.user?.username || "Người dùng ẩn",
          avatar: p.user?.avatar,
          action: "đã đăng bài viết mới",
          time: p.createdAt,
          type: "post",
        }));

        const newComments = res.recentComments.map((c) => ({
          id: `comment-${c._id}`,
          user: c.user?.username || "Người dùng ẩn",
          avatar: c.user?.avatar,
          action: "đã bình luận vào bài viết",
          time: c.createdAt,
          type: "comment",
        }));

        // Gộp tất cả lại và sắp xếp theo thời gian mới nhất
        const mergedActivities = [...newUsers, ...newPosts, ...newComments]
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 10);

        setActivities(mergedActivities);
      } catch (error) {
        console.error("Lỗi tải hoạt động:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Hàm render icon dựa trên loại activity
  const renderIcon = (type) => {
    switch (type) {
      case "register":
        return { icon: FiUserPlus, bg: "bg-green-100 text-green-600" };
      case "post":
        return { icon: FiEdit3, bg: "bg-blue-100 text-blue-600" };
      case "comment":
        return { icon: FiMessageCircle, bg: "bg-purple-100 text-purple-600" };
      default:
        return { icon: FiBell, bg: "bg-gray-100 text-gray-600" };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 bg-linear-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Hoạt động gần đây
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${
                    activity.type === "report"
                      ? "bg-red-100 text-red-600"
                      : "bg-blue-100 text-blue-600"
                  }
                `}
                >
                  {activity.type === "post" && "📝"}
                  {activity.type === "comment" && "💬"}
                  {activity.type === "report" && "⚠️"}
                  {activity.type === "like" && "❤️"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.user} {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {activity.time}
                  </p>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
