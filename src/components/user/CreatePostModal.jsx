import { useState, useEffect } from "react";
import { createPost } from "../../api/post";
import {
  FiImage,
  FiSmile,
  FiMapPin,
  FiX,
  FiVideo,
  FiGlobe,
} from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function CreatePostModal({
  isOpen,
  onClose,
  onNewPost,
  currentUser,
  initialType = "text",
}) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]); // Lưu File Object
  const [previews, setPreviews] = useState([]); // Lưu URL Preview (để hiển thị)
  const [loading, setLoading] = useState(false);

  // Clean up URL blob khi đóng modal hoặc unmount
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (images.length + files.length > 10) {
      toast.error("Chỉ được tải lên tối đa 10 ảnh/video!");
      return;
    }

    // 1. Lưu File Object
    setImages((prev) => [...prev, ...files]);

    // 2. Tạo Preview URL
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      console.warn("Không có nội dung để đăng");
      return;
    }

    setLoading(true);
    try {
      // Dùng FormData để gửi file
      const formData = new FormData();
      formData.append("content", content);

      // Append từng file ảnh vào key "files"
      images.forEach((img) => {
        formData.append("files", img);
      });

      // 🔍 DEBUG: Soi dữ liệu trong FormData trước khi gửi
      console.group(" Đang gửi dữ liệu...");
      for (let pair of formData.entries()) {
        console.log(`Key: ${pair[0]}, Value:`, pair[1]);
      }
      console.groupEnd();

      const res = await createPost(formData);
      console.log(" API Phản hồi:", res);
      const finalPost = res.newPost || res.post || res.data?.newPost;

      if (finalPost) {
        toast.success("Đăng bài thành công!");
        onNewPost?.(finalPost); // Gửi dữ liệu chuẩn về HomePage
        handleClose();
      } else {
        throw new Error("Không tìm thấy dữ liệu bài viết trong phản hồi API");
      }
    } catch (err) {
      console.error(" LỖI GẶP PHẢI:", err);

      let message = "Đăng bài thất bại";

      if (err.response) {
        // Lỗi từ Server trả về (400, 404, 500)
        console.error("Response Status:", err.response.status);
        console.error("Response Data:", err.response.data);
        message =
          err.response.data?.msg || `Lỗi Server (${err.response.status})`;
      } else if (err.request) {
        // Lỗi không gọi được server (Mạng, Sai URL)
        console.error("Request Error:", err.request);
        message = "Không kết nối được Server. Kiểm tra Backend.";
      } else {
        // Lỗi code frontend
        message = err.message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setContent("");
    setImages([]);
    setPreviews([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b relative shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Tạo bài viết</h2>
          <button
            onClick={handleClose}
            className="absolute right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
          >
            <FiX className="text-xl text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto custom-scrollbar">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={currentUser?.avatar || "/avatar.png"}
              className="w-10 h-10 rounded-full object-cover border"
              alt="avatar"
            />
            <div>
              <p className="font-semibold text-gray-900">
                {currentUser?.fullname || "Bạn"}
              </p>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            placeholder={`Bạn đang nghĩ gì thế, ${
              currentUser?.fullname || "bạn"
            }?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-lg text-gray-800 outline-none resize-none placeholder-gray-400 min-h-[100px]"
          />

          {/* Image Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4 border rounded-lg p-2 relative">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt="preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-white p-1 rounded-full shadow hover:bg-gray-100"
                  >
                    <FiX className="text-black" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 px-4 py-3 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex gap-2">
              <label className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition">
                <FiImage className="text-green-500 text-2xl" />
                <input
                  type="file"
                  accept="image/*, video/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
              <button className="p-2 hover:bg-gray-100 rounded-full transition">
                <FiMapPin className="text-red-500 text-2xl" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition">
                <FiSmile className="text-yellow-500 text-2xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0">
          <button
            onClick={handleSubmit}
            disabled={loading || (!content.trim() && images.length === 0)}
            className={`w-full py-2.5 rounded-lg font-bold text-white transition-all ${
              loading || (!content.trim() && images.length === 0)
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-md"
            }`}
          >
            {loading ? "Đang đăng..." : "Đăng"}
          </button>
        </div>
      </div>
    </div>
  );
}
