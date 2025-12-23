import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFollowers, getCurrentUser } from "../../api/user"; // API thật
import FollowBtn from "./FollowBtn"; // Tái sử dụng nút Follow
import UserCard from "./UserCard";

export default function FollowersTab() {
  const [followers, setFollowers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Lấy thông tin bản thân (để truyền vào FollowBtn)
        const me = await getCurrentUser();
        setCurrentUser(me.user || me);

        // 2. Lấy danh sách người theo dõi
        const res = await getFollowers();
        // Backend trả về { followers: [...] }
        if (res && Array.isArray(res.followers)) {
          setFollowers(res.followers);
        } else {
          setFollowers([]);
        }
      } catch (err) {
        console.error("Lỗi tải followers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header thống kê */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Người theo dõi</h1>
        <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium border border-blue-100">
          {followers.length} người
        </span>
      </div>

      {/* Grid danh sách */}
      {followers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {followers.map((user) => (
            <UserCard key={user._id} user={user} currentUser={currentUser} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👥</span>
          </div>
          <h3 className="text-gray-900 font-medium text-lg">
            Chưa có người theo dõi
          </h3>
          <p className="text-gray-500 mt-1">
            Hãy chia sẻ hồ sơ của bạn để kết nối với nhiều người hơn.
          </p>
        </div>
      )}
    </div>
  );
}
