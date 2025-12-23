import { useState, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import { useSocket } from "../../context/SocketContext";
import { getFollowing } from "../../api/user"; // Đảm bảo đã import đúng
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function RightSidebar({ onOpenChat }) {
  // [SỬA] Dùng tên state thống nhất là followingList để tránh nhầm lẫn
  const [followingList, setFollowingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const { onlineUsers } = useSocket();

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const res = await getFollowing();

        // Backend trả về { following: [...] }
        if (res && Array.isArray(res.following)) {
          setFollowingList(res.following);
        } else if (Array.isArray(res)) {
          setFollowingList(res);
        } else {
          setFollowingList([]);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách following:", err);
        setFollowingList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, []);

  // [SỬA] Dùng biến followingList thay vì friends
  const displayedUsers = Array.isArray(followingList)
    ? followingList
        .filter(
          (user) =>
            user &&
            user.fullname &&
            user.fullname.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((user) => ({
          ...user,
          isOnline:
            Array.isArray(onlineUsers) && onlineUsers.includes(user._id),
        }))
        .sort((a, b) => {
          if (a.isOnline === b.isOnline) return 0;
          return a.isOnline ? -1 : 1;
        })
    : [];

  return (
    <div className="hidden lg:block w-80 p-4 fixed right-0 top-16 h-[calc(100vh-64px)] overflow-y-auto bg-gray-50/50 border-l border-gray-200 custom-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wide">
          Đang theo dõi
        </h3>
      </div>

      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm người dùng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-gray-200 rounded-full text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <ul className="space-y-1">
          {displayedUsers.map((user) => (
            <li
              key={user._id}
              onClick={() => onOpenChat && onOpenChat(user)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 cursor-pointer transition group"
            >
              <div className="relative shrink-0">
                <img
                  src={user.avatar || "/avatar.png"}
                  alt={user.fullname}
                  className="w-10 h-10 rounded-full object-cover border border-gray-300"
                />
                {user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.fullname}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.isOnline ? (
                    <span className="text-green-600 font-medium">
                      Đang hoạt động
                    </span>
                  ) : user.lastActive ? (
                    formatDistanceToNow(new Date(user.lastActive), {
                      addSuffix: true,
                      locale: vi,
                    })
                  ) : (
                    "Ngoại tuyến"
                  )}
                </p>
              </div>
            </li>
          ))}

          {displayedUsers.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">
              Không tìm thấy người dùng.
            </p>
          )}
        </ul>
      )}
    </div>
  );
}
