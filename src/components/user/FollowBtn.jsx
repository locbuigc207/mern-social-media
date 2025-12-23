import { useState, useEffect } from "react";
import { followUser, unfollowUser } from "../../api/user";

export default function FollowBtn({ user, currentUser, styleClass }) {
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Kiểm tra xem mình đã follow người này chưa khi component mount
  useEffect(() => {
    if (!currentUser || !user) return;

    // currentUser.following có thể là mảng ID ["123", "456"]
    // hoặc mảng Object [{_id: "123"}, {_id: "456"}] do populate
    const isFollowing = currentUser.following?.some(
      (item) => (item._id || item).toString() === user._id.toString()
    );

    setFollowed(!!isFollowing);
  }, [currentUser, user]);

  // 2. Xử lý sự kiện bấm nút
  const handleFollow = async (e) => {
    // Ngăn sự kiện nổi bọt (để không kích hoạt Link vào profile nếu nút nằm trong thẻ Link)
    e.preventDefault();
    e.stopPropagation();

    if (loading || !currentUser) return;

    setLoading(true);
    try {
      if (followed) {
        // Nếu đang follow -> Gọi API Unfollow
        await unfollowUser(user._id);
        setFollowed(false);

        // Cập nhật lại state cục bộ của currentUser (Optional - nếu cần đồng bộ ngay lập tức ở context cha)
        // Tuy nhiên thường ta chỉ cần đổi UI nút bấm là đủ cho UX
      } else {
        // Nếu chưa follow -> Gọi API Follow
        await followUser(user._id);
        setFollowed(true);
      }
    } catch (err) {
      console.error("Lỗi follow/unfollow:", err);
      // alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Ẩn nút nếu:
  // - Không có user
  // - Hoặc User này chính là bản thân mình
  if (!currentUser || !user || currentUser._id === user._id) {
    return null;
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`
        px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 border
        ${styleClass /* Cho phép override style từ bên ngoài */}
        ${
          followed
            ? "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-red-600 hover:border-red-200"
            : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md"
        }
        ${loading ? "opacity-70 cursor-wait" : ""}
      `}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Loading
        </span>
      ) : followed ? (
        <span className="group-hover:hidden">Đang theo dõi</span>
      ) : (
        "Theo dõi"
      )}

      {/* Hiệu ứng hover khi đã follow -> hiện chữ Hủy */}
      {followed && !loading && (
        <span className="hidden hover:inline group-hover:inline">
          Hủy theo dõi
        </span>
      )}
    </button>
  );
}
