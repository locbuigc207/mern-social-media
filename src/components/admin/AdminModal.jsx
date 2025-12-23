// src/components/admin/AdminModalMock.jsx
import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { useAdmin } from "./AdminProvider";
import toast from "react-hot-toast";

export default function AdminModalMock({
  isOpen,
  onClose,
  type = "user",
  data = {},
}) {
  //Lấy action từ AdminContext
  const { actions } = useAdmin();
  //State cho form
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "user",
    status: "active",
    blockReason: "",
  });
  const [loading, setLoading] = useState(false);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen && data) {
      setFormData({
        username: data.username || "",
        email: data.email || "",
        role: data.role || "user",
        status: data.isBlocked ? "blocked" : "active",
        blockReason: data.blockedReason || "",
      });
    }
  }, [isOpen, data]);

  // Xử lý Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === "user") {
        // Logic xử lý Khóa / Mở khóa
        if (formData.status === "blocked") {
          // --- KHÓA ---
          if (!formData.blockReason.trim()) {
            toast.error("Vui lòng nhập lý do khóa tài khoản!");
            setLoading(false);
            return;
          }
          // Gọi API khóa
          await actions.blockUser(data._id, formData.blockReason);
        } else {
          // --- MỞ KHÓA ---
          if (data.isBlocked) {
            await actions.unblockUser(data._id);
          }
        }
      }

      onClose();
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[500px] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300">
          <div className="w-8"></div>
          <h3 className="text-xl font-bold text-gray-900">
            {type === "user"
              ? "Quản lý trạng thái người dùng"
              : "Quản lý trạng thái bài viết"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {type === "user" && (
            <>
              {/* Thông tin chỉ đọc */}
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-semibold text-gray-500 mb-1 block">
                    Tên hiển thị
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-lg text-gray-900 focus:ring-2 focus:ring-[#0866FF] transition-all"
                    placeholder="Nhập tên người dùng"
                  />
                </div>

                <div>
                  <label className="text-[13px] font-semibold text-gray-500 mb-1 block">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-lg text-gray-900 focus:ring-2 focus:ring-[#0866FF] transition-all"
                    placeholder="Nhập email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-500 mb-1">
                    Vai trò
                  </label>
                  <select
                    value={formData.role}
                    disabled
                    className="w-full px-3 py-3 bg-gray-100 border-none rounded-lg text-gray-900 focus:ring-2 focus:ring-[#0866FF] cursor-pointer"
                  >
                    <option value="user">Người dùng</option>
                    <option value="moderator">Kiểm duyệt</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
                {/* Không tin được phép sửa */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-500 mb-1">
                    Trạng thái tài khoản
                  </label>
                  <select
                    value={formData.status}
                    disabled={data.role === "admin"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-3 bg-gray-100 border-none rounded-lg text-gray-900 focus:ring-2 focus:ring-[#0866FF] cursor-pointer"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="blocked">Khoá tài khoản</option>
                  </select>
                </div>
              </div>
              {/* Input lý do khoá */}
              {formData.status === "blocked" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 w-full">
                  <label className="block text-[13px] font-semibold text-gray-500 mb-1">
                    Lý do khóa (*)
                  </label>
                  <textarea
                    value={formData.blockReason}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        blockReason: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0866FF] focus:bg-white focus:border-transparent transition-all text-sm resize-y"
                    placeholder="Vui lòng nhập lý do khóa tài khoản này..."
                    required
                  />
                </div>
              )}
            </>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-[#0866FF] font-semibold hover:bg-blue-50 rounded-md transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-[#0866FF] hover:bg-[#0054dd] text-white font-bold rounded-md shadow-sm transition-all disabled:opacity-60"
            >
              {loading ? "Đang xử lý..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
