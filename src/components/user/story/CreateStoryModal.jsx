// src/components/story/CreateStoryModal.jsx
import { useState, useRef, useEffect } from "react";
import { FiX, FiImage, FiVideo, FiType } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { getCurrentUser } from "../../../api/user";
import TextStoryCreator from "./TextStoryCreator";

export default function CreateStoryModal({ isOpen, onClose, onStoryCreated }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState(null);
  const [showTextCreator, setShowTextCreator] = useState(false);
  
  const fileInputRef = useRef(null);

  // Fetch current user khi modal mở
  useEffect(() => {
    if (isOpen) {
      fetchCurrentUser();
    }
  }, [isOpen]);

  const fetchCurrentUser = async () => {
    try {
      setLoadingUser(true);
      const data = await getCurrentUser();
      setCurrentUser(data.user || data);
    } catch (error) {
      console.error("Get user error:", error);
      toast.error("Không thể lấy thông tin user");
    } finally {
      setLoadingUser(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File quá lớn! Tối đa 10MB");
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.error("Chỉ chấp nhận ảnh hoặc video!");
      return;
    }

    setSelectedFile(file);
    setFileType(isImage ? 'image' : 'video');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadStory = async () => {
    if (!selectedFile) {
      toast.error("Vui lòng chọn ảnh hoặc video!");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption);
      formData.append("privacy", privacy);

      const token = localStorage.getItem("access_token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
      
      const response = await fetch(`${API_URL}/api/story`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Upload failed");
      }

      toast.success("Đã tạo story!");
      onStoryCreated?.(data.story);
      handleClose();
      
    } catch (error) {
      console.error("Create story error:", error);
      toast.error(error.message || "Không thể tạo story");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTextStory = async (blob, gradient) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "text-story.png");
      formData.append("caption", "");
      formData.append("privacy", privacy);

      const token = localStorage.getItem("access_token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
      
      const response = await fetch(`${API_URL}/api/story`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Upload failed");
      }

      toast.success("Đã tạo story văn bản!");
      onStoryCreated?.(data.story);
      setShowTextCreator(false);
      handleClose();
      
    } catch (error) {
      console.error("Create text story error:", error);
      toast.error(error.message || "Không thể tạo story");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption("");
    setPrivacy("public");
    setFileType(null);
    setShowTextCreator(false);
    onClose();
  };

  if (!isOpen) return null;

  // Show Text Story Creator
  if (showTextCreator) {
    return (
      <TextStoryCreator
        onClose={() => setShowTextCreator(false)}
        onCreateTextStory={handleCreateTextStory}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Tạo tin</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* User Info */}
          {loadingUser ? (
            <div className="flex items-center gap-3 mb-4 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-3 mb-4">
              <img
                src={currentUser.avatar}
                className="w-12 h-12 rounded-full object-cover"
                alt="avatar"
              />
              <div>
                <p className="font-semibold">{currentUser.fullname}</p>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="text-sm bg-gray-100 px-2 py-1 rounded"
                >
                  <option value="public">Công khai</option>
                  <option value="friends">Bạn bè</option>
                  <option value="close_friends">Bạn thân</option>
                </select>
              </div>
            </div>
          ) : null}

          {/* File Preview */}
          {preview ? (
            <div className="relative mb-4">
              {fileType === 'image' ? (
                <img
                  src={preview}
                  alt="preview"
                  className="w-full h-96 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={preview}
                  controls
                  className="w-full h-96 rounded-lg bg-black"
                />
              )}
              
              <button
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 bg-white p-2 rounded-full shadow hover:bg-gray-100"
              >
                <FiX className="text-black" />
              </button>

              {/* Caption overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/70 to-transparent">
                <textarea
                  placeholder="Viết chú thích..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                  className="w-full bg-white/20 text-white placeholder-white/70 p-2 rounded resize-none outline-none"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            // Upload Area
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition mb-4"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-4">
                    <FiImage className="text-4xl text-green-500" />
                    <FiVideo className="text-4xl text-blue-500" />
                  </div>
                  <p className="text-gray-600">Thêm ảnh/video</p>
                  <p className="text-xs text-gray-400">hoặc kéo thả</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3 border-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <FiImage className="text-green-500 text-xl" />
                  <span className="font-medium">Ảnh/Video</span>
                </button>
                <button
                  onClick={() => setShowTextCreator(true)}
                  className="flex items-center justify-center gap-2 p-3 border-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <FiType className="text-blue-500 text-xl" />
                  <span className="font-medium">Văn bản</span>
                </button>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Footer */}
        {preview && (
          <div className="p-4 border-t">
            <button
              onClick={handleUploadStory}
              disabled={loading || !selectedFile}
              className={`w-full py-3 rounded-lg font-bold text-white transition ${
                loading || !selectedFile
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Đang đăng..." : "Chia sẻ lên story"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}