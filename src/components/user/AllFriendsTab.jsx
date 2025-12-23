// src/components/friends/AllFriendsTab.jsx
import { useState, useEffect, useCallback } from "react";
import { friendsApi } from "../../api/friendsApi";
import FriendCard from "./FriendCard";
import FriendsSkeleton from "./FriendsSkeleton";

export default function AllFriendsTab() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadFriends = useCallback(async (search = "", pageNum = 1) => {
    try {
      setLoading(true);
      const { data } = await friendsApi.getAllFriends({
        search,
        page: pageNum,
        limit: 20,
      });
      setFriends((prev) =>
        pageNum === 1 ? data.friends : [...prev, ...data.friends]
      );
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Load friends error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends(searchTerm, 1);
  }, [searchTerm, loadFriends]);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setPage(1);
    setFriends([]);
  };

  const handleUnfriend = async (friendId) => {
    if (confirm("Bạn có chắc muốn hủy kết bạn?")) {
      try {
        await friendsApi.unfriend(friendId);
        setFriends((prev) => prev.filter((f) => f._id !== friendId));
      } catch (err) {
        alert("Có lỗi xảy ra");
      }
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadFriends(searchTerm, nextPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tất cả bạn bè</h1>
          <p className="text-gray-600 mt-1">{friends.length} bạn bè</p>
        </div>

        <input
          type="text"
          placeholder="Tìm kiếm bạn bè..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full sm:w-80 pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {loading && friends.length === 0 ? (
        <FriendsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {friends.map((friend) => (
            <FriendCard
              key={friend._id}
              friend={friend}
              onUnfriend={() => handleUnfriend(friend._id)}
            />
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="text-center py-8">
          <button
            onClick={loadMore}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            Xem thêm bạn bè
          </button>
        </div>
      )}
    </div>
  );
}
