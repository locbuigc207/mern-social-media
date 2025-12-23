import { useState, useEffect } from "react";
import { getCurrentUser } from "../../api/user";
import { FiVideo, FiImage, FiSmile } from "react-icons/fi";
import CreatePostModal from "../user/CreatePostModal";

export default function CreatePost({ onNewPost }) {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Lấy user để hiện avatar
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await getCurrentUser();
        // Xử lý tùy theo format response của bạn (res.user hay res trực tiếp)
        setUser(res.user || res);
      } catch (err) {
        console.error(err);
      }
    };
    loadUser();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mt-20">
      <div className="flex gap-3 items-center">
        {/* Avatar */}
        <img
          src={user?.avatar || "/avatar.png"}
          alt="avatar"
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />

        {/* Input giả để mở Modal */}
        <div
          onClick={() => setIsOpen(true)}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-200 transition"
        >
          <span className="text-gray-500 text-sm">
            {user?.fullname ? `${user.fullname} ơi, bạn` : "Bạn"} đang nghĩ gì
            thế?
          </span>
        </div>
      </div>

      <div className="flex justify-between mt-3 pt-3 border-t">
        <button
          onClick={() => setIsOpen(true)}
          className="flex gap-2 items-center text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg flex-1 justify-center"
        >
          <FiImage className="text-green-500 text-xl" /> Ảnh/Video
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="flex gap-2 items-center text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg flex-1 justify-center"
        >
          <FiSmile className="text-yellow-500 text-xl" /> Cảm xúc
        </button>
      </div>

      {/* Render Modal */}
      {isOpen && (
        <CreatePostModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onNewPost={onNewPost}
          currentUser={user} // Truyền user xuống để đỡ phải fetch lại
        />
      )}
    </div>
  );
}
