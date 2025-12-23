// src/components/user/CreatePostModal.jsx (Enhanced)
import { useState, useEffect, useRef } from "react";
import { createPost, saveDraft, schedulePost } from "../../api/post";
import {
  FiImage,
  FiX,
  FiClock,
  FiSave,
  FiCalendar,
} from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function CreatePostModal({
  isOpen,
  onClose,
  onNewPost,
  currentUser,
  initialType = "text",
  draftData = null, // For editing existing draft
}) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  
  const fileInputRef = useRef(null);
  const autoSaveTimer = useRef(null);

  // Load draft data if editing
  useEffect(() => {
    if (draftData) {
      setContent(draftData.content || "");
      if (draftData.images) {
        setPreviews(draftData.images.map(img => img.url));
      }
    }
  }, [draftData]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!isOpen || !content.trim()) return;

    autoSaveTimer.current = setInterval(async () => {
      try {
        const formData = new FormData();
        formData.append("content", content);
        images.forEach((img) => formData.append("files", img));

        await saveDraft(formData);
        toast.success("Đã tự động lưu nháp", { duration: 1000 });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 30000); // 30 seconds

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [isOpen, content, images]);

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

    setImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    if (!content.trim() && images.length === 0) {
      toast.error("Nội dung trống không thể lưu");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      images.forEach((img) => formData.append("files", img));

      await saveDraft(formData);
      toast.success("Đã lưu nháp!");
      handleClose();
    } catch (err) {
      toast.error(err.message || "Lưu nháp thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulePost = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("Vui lòng chọn ngày giờ đăng bài");
      return;
    }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    const now = new Date();

    if (scheduledAt <= now) {
      toast.error("Thời gian phải ở tương lai");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("scheduledAt", scheduledAt.toISOString());
      images.forEach((img) => formData.append("files", img));

      await schedulePost(formData);
      toast.success("Đã lên lịch đăng bài!");
      handleClose();
    } catch (err) {
      toast.error(err.message || "Lên lịch thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      images.forEach((img) => formData.append("files", img));

      const res = await createPost(formData);
      const finalPost = res.newPost || res.post || res.data?.newPost;

      if (finalPost) {
        toast.success("Đăng bài thành công!");
        onNewPost?.(finalPost);
        handleClose();
      }
    } catch (err) {
      toast.error(err.message || "Đăng bài thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setContent("");
    setImages([]);
    setPreviews([]);
    setShowSchedule(false);
    setScheduleDate("");
    setScheduleTime("");
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
            <div className="grid grid-cols-2 gap-2 mt-4 border rounded-lg p-2">
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

          {/* Schedule Options */}
          {showSchedule && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiCalendar className="text-blue-600" />
                Lên lịch đăng bài
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giờ
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
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
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </label>
              
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <FiClock className={`text-2xl ${showSchedule ? 'text-blue-500' : 'text-gray-500'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 space-y-2">
          {showSchedule ? (
            <button
              onClick={handleSchedulePost}
              disabled={loading || (!content.trim() && images.length === 0)}
              className="w-full py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 transition"
            >
              {loading ? "Đang xử lý..." : "Lên lịch đăng"}
            </button>
          ) : (
            <>
              <button
                onClick={handleSubmit}
                disabled={loading || (!content.trim() && images.length === 0)}
                className="w-full py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 transition"
              >
                {loading ? "Đang đăng..." : "Đăng"}
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="w-full py-2.5 rounded-lg font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <FiSave />
                Lưu nháp
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}