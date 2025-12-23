import { useState } from "react";
import { FiX, FiShare2 } from "react-icons/fi";
import { sharePost } from "../../api/post"; // Import API vừa tạo
import { toast } from "react-hot-toast";

export default function SharePostModal({ isOpen, onClose, post, currentUser }) {
  const [caption, setCaption] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen || !post) return null;

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await sharePost(post._id, caption);
      toast.success("Đã chia sẻ bài viết thành công!");
      setCaption("");
      onClose();
      // Có thể reload trang hoặc cập nhật feed nếu cần
    } catch (err) {
      toast.error(err.response?.data?.msg || "Lỗi khi chia sẻ bài viết");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Chia sẻ bài viết</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* User Input Area */}
          <div className="flex gap-3 mb-4">
            <img
              src={currentUser?.avatar || "/avatar.png"}
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
              alt=""
            />
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm mb-1">
                {currentUser?.fullname}
              </p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Hãy nói gì đó về bài viết này..."
                className="w-full p-0 border-none focus:ring-0 text-gray-700 text-base resize-none min-h-[60px]"
                autoFocus
              />
            </div>
          </div>

          {/* Preview Post Content (Bài được share) */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            {/* Ảnh bài gốc (nếu có) */}
            {post.images && post.images.length > 0 && (
              <div className="h-48 w-full bg-gray-200">
                <img
                  src={post.images[0].url}
                  className="w-full h-full object-cover"
                  alt="preview"
                />
              </div>
            )}

            {/* Nội dung bài gốc */}
            <div className="p-3">
              <p className="text-xs font-bold text-gray-500 mb-1">
                {post.user?.fullname} •{" "}
                {new Date(post.createdAt).toLocaleDateString("vi-VN")}
              </p>
              <p className="text-sm text-gray-800 line-clamp-3">
                {post.content}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
          >
            Hủy
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className={`px-6 py-2 bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 transition ${
              isSharing ? "opacity-70 cursor-wait" : "hover:bg-blue-700"
            }`}
          >
            {isSharing ? (
              "Đang đăng..."
            ) : (
              <>
                <FiShare2 /> Chia sẻ ngay
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
