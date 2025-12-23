import { Link } from "react-router-dom";
import FollowBtn from "../user/FollowBtn"; // Import nút Follow đã tạo

export default function UserCard({ user, currentUser }) {
  if (!user) return null;

  return (
    <div className="group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:border-blue-100 hover:-translate-y-1 transition-all duration-300 ease-out flex items-center gap-4">
      {/* 1. Avatar */}
      <Link to={`/profile/${user._id}`} className="shrink-0">
        <img
          src={user.avatar || "/avatar.png"}
          alt={user.fullname}
          className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform duration-300"
        />
      </Link>

      {/* 2. Info */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/profile/${user._id}`}
          className="block font-bold text-gray-800 text-[17px] leading-tight hover:text-blue-600 transition-colors truncate"
        >
          {user.fullname}
        </Link>
        <p className="text-sm text-gray-500 font-medium truncate mt-0.5">
          @{user.username}
        </p>
      </div>

      {/* 3. Action Button (Follow/Unfollow) */}
      <div className="shrink-0">
        {currentUser && (
          <FollowBtn
            user={user}
            currentUser={currentUser}
            styleClass="rounded-full px-6 py-2 shadow-sm shadow-blue-200/50"
          />
        )}
      </div>
    </div>
  );
}
