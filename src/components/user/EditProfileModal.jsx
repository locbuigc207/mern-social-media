import { useState, useRef } from "react";
import { FiX, FiCamera, FiUser, FiMapPin, FiEdit3 } from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function EditProfileModal({ isOpen, onClose, currentUser, onUpdateSuccess }) {
  const [formData, setFormData] = useState({
    fullname: currentUser?.fullname || "",
    bio: currentUser?.bio || "",
    location: currentUser?.location || "",
    mobile: currentUser?.mobile || "",
    website: currentUser?.website || "",
    gender: currentUser?.gender || "male",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || "");
  
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(currentUser?.coverPhoto || "");
  
  const [loading, setLoading] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB!");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ảnh bìa không được vượt quá 10MB!");
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullname.trim()) {
      toast.error("Vui lòng nhập họ tên!");
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Append text fields
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, formData[key]);
      });

      // Append files with correct field names
      if (avatarFile) {
        formDataToSend.append("avatar", avatarFile);
      }
      if (coverFile) {
        formDataToSend.append("coverPhoto", coverFile);
      }


      // Import updateUser function
      const { updateUser } = await import("../../api/user");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("access_token");
      
      const response = await fetch(`${API_URL}/api/user`, {
        method: "PATCH",
        headers: {
          Authorization: token,
        },
        body: formDataToSend,
        credentials: "include",
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.msg || "Cập nhật thất bại");
      }

      toast.success("Cập nhật thành công!");
      
      // Callback to parent component
      if (onUpdateSuccess) {
        onUpdateSuccess(result.user);
      }
      
      onClose();
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.message || "Cập nhật thất bại!");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - FIXED */}
        <div className="shrink-0 border-b p-4 flex items-center justify-between bg-white">
          <h2 className="text-xl font-bold">Chỉnh sửa trang cá nhân</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Cover Photo */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Ảnh bìa
              </label>
              <div className="relative h-48 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl overflow-hidden">
                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition shadow-md"
                >
                  <FiCamera />
                  <span>Chỉnh sửa ảnh bìa</span>
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Ảnh đại diện
              </label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={avatarPreview || "/avatar.png"}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition"
                  >
                    <FiCamera />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Ảnh JPG, PNG hoặc GIF. Tối đa 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Fullname */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Họ và tên *
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="fullname"
                  value={formData.fullname}
                  onChange={handleChange}
                  required
                  maxLength={25}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập họ và tên"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Tiểu sử
              </label>
              <div className="relative">
                <FiEdit3 className="absolute left-3 top-3 text-gray-400" />
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  maxLength={200}
                  rows={3}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Viết vài dòng về bản thân..."
                />
              </div>
              <p className="text-xs text-gray-500 text-right">
                {formData.bio.length}/200
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Vị trí
              </label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Thành phố, quốc gia"
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Giới tính
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={formData.gender === "male"}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Nam</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={formData.gender === "female"}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Nữ</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="gender"
                    value="other"
                    checked={formData.gender === "other"}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Khác</span>
                </label>
              </div>
            </div>

            {/* Buttons - FIXED POSITION */}
            <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t -mx-6 px-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}