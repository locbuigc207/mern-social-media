import { useState, useEffect } from "react";
import { getSuggestions, getCurrentUser } from "../../api/user";
import UserCard from "./UserCard";
import { FiRefreshCw, FiZap } from "react-icons/fi";

export default function SuggestionsTab() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const me = await getCurrentUser();
      setCurrentUser(me.user || me);

      // Lấy 20 gợi ý
      const res = await getSuggestions(20);
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:p-8 min-h-[600px]">
      {/* Header đẹp hơn */}
      <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Gợi ý theo dõi <span className="text-yellow-500 text-2xl"></span>
          </h1>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="group flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full font-semibold text-sm transition-all active:scale-95"
        >
          <FiRefreshCw
            className={`text-lg transition-transform duration-700 ${
              refreshing ? "animate-spin" : "group-hover:rotate-180"
            }`}
          />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Grid Layout */}
      {loading && users.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            ></div>
          ))}
        </div>
      ) : users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {users.map((user) => (
            <UserCard key={user._id} user={user} currentUser={currentUser} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <FiZap className="text-gray-300 text-4xl" />
          </div>
          <p className="text-gray-500 font-medium">
            Không có gợi ý nào phù hợp lúc này.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 text-blue-600 hover:underline"
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
