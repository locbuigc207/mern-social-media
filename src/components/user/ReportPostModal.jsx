import { useState } from "react";
import { FiX, FiAlertTriangle } from "react-icons/fi";
import { reportPost } from "../../api/post";

const REPORT_REASONS = [
  { value: "spam", label: "Spam / Tin rác" },
  { value: "harassment", label: "Quấy rối" },
  { value: "hate_speech", label: "Ngôn từ gây thù ghét" },
  { value: "violence", label: "Bạo lực" },
  { value: "nudity", label: "Khỏa thân / Tình dục" },
  { value: "false_information", label: "Thông tin sai lệch" },
  { value: "scam", label: "Lừa đảo" },
  { value: "copyright", label: "Vi phạm bản quyền" },
  { value: "self_harm", label: "Tự tử / Tự hại" },
  { value: "terrorism", label: "Khủng bố" },
  { value: "child_exploitation", label: "Bóc lột trẻ em" },
  { value: "other", label: "Vấn đề khác" },
];

export default function ReportPostModal({ isOpen, onClose, postId }) {
  const [reason, setReason] = useState("spam");
  const [description, setDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  // Reset form mỗi khi mở modal lại
  if (!isOpen) return null;

  const handleSubmit = async () => {
    // 1. Validate
    if (!reason) {
      return alert("Vui lòng chọn lý do báo cáo.");
    }
    if (!description || description.trim().length < 10) {
      return alert("Vui lòng nhập mô tả chi tiết (tối thiểu 10 ký tự).");
    }

    setIsReporting(true);
    try {
      // 2. Gọi API
      await reportPost(postId, {
        reason,
        description,
      });

      alert("Báo cáo đã được gửi thành công. Cảm ơn bạn!");
      onClose(); // Đóng modal
      // Reset form
      setReason("spam");
      setDescription("");
    } catch (err) {
      alert(err.response?.data?.msg || err.message || "Lỗi khi gửi báo cáo");
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <FiAlertTriangle className="text-xl" />
            <h3 className="text-lg font-bold">Báo cáo vi phạm</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Hãy chọn vấn đề bạn đang gặp phải với bài viết này.
          </p>

          {/* 1. Chọn lý do */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lý do:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Nhập mô tả */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả chi tiết <span className="text-red-500">*</span>:
            </label>
            <textarea
              className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
              rows="4"
              placeholder="Vui lòng mô tả chi tiết vấn đề (tối thiểu 10 ký tự)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
            {description.length > 0 && description.length < 10 && (
              <p className="text-red-500 text-xs mt-1">
                Mô tả quá ngắn (cần thêm {10 - description.length} ký tự).
              </p>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition"
            disabled={isReporting}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isReporting || description.trim().length < 10}
            className={`px-4 py-2 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 transition flex items-center gap-2 ${
              isReporting || description.trim().length < 10
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isReporting ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </div>
      </div>
    </div>
  );
}
