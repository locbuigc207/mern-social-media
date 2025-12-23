import { useState, useEffect } from "react";
import { getFollowing, getCurrentUser } from "../../api/user";
import UserCard from "./UserCard";
import { Link } from "react-router-dom";
import { FiSearch, FiUserX, FiUsers } from "react-icons/fi";

export default function FollowingTab() {
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // State tìm kiếm

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Bắt đầu lấy Current User...");
        const me = await getCurrentUser();
        console.log("Current User data:", me);
        setCurrentUser(me.user || me);
        console.log("Bắt đầu lấy Following...");
        const res = await getFollowing();
        console.log("Response từ getFollowing:", res);
        if (res && Array.isArray(res.following)) {
          setFollowing(res.following);
        } else {
          setFollowing([]);
        }
      } catch (err) {
        console.error("Lỗi tải following:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Logic lọc danh sách theo từ khóa tìm kiếm
  const filteredUsers = following.filter(
    (user) =>
      user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:p-8 min-h-[600px]">
      {/* 1. Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Đang theo dõi
            {!loading && (
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-bold border border-blue-100">
                {following.length}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Danh sách những người bạn quan tâm.
          </p>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="relative w-full md:w-64 group">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Tìm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* 2. Content Area */}
      {loading ? (
        /* Skeleton Loading Effect */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-5 border border-gray-100 rounded-2xl animate-pulse"
            >
              <div className="w-16 h-16 bg-gray-200 rounded-full shrink-0"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : following.length === 0 ? (
        /* Empty State: Chưa follow ai */
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            <FiUsers />
          </div>
          <h3 className="text-gray-900 font-bold text-lg">Danh sách trống</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">
            Bạn chưa theo dõi ai cả. Hãy tìm kiếm bạn bè hoặc xem gợi ý để kết
            nối thêm nhé.
          </p>
          <Link
            to="/suggestions"
            className="inline-block mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
          >
            Xem gợi ý theo dõi
          </Link>
        </div>
      ) : filteredUsers.length === 0 ? (
        /* Empty State: Tìm kiếm không thấy */
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
            <FiSearch />
          </div>
          <p className="text-gray-600 font-medium">
            Không tìm thấy ai có tên "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm("")}
            className="text-blue-600 text-sm mt-2 hover:underline font-medium"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        /* Grid Users */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredUsers.map((user) => (
            <UserCard key={user._id} user={user} currentUser={currentUser} />
          ))}
        </div>
      )}
    </div>
  );
}
