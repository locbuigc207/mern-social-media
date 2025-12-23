// src/components/admin/UserReportDetailModal.jsx
import {
  FiX,
  FiFlag,
  FiShield,
  FiClock,
  FiAlertTriangle,
} from "react-icons/fi";

const getReasonLabel = (reason) => {
  const map = {
    spam: "Spam / Tin rác",
    harassment: "Quấy rối",
    hate_speech: "Thù ghét",
    violence: "Bạo lực",
    false_information: "Tin giả",
    scam: "Lừa đảo",
    other: "Khác",
    // ... thêm các lý do khác nếu có
  };
  return map[reason] || reason;
};

export default function UserReportDetailModal({
  isOpen,
  onClose,
  reportData,
  historyData,
}) {
  if (!isOpen || !reportData) return null;

  const targetUser = reportData.targetId;
  const reporter = reportData.reportedBy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-full text-red-600">
              <FiShield size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Chi tiết Báo cáo Người dùng
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Cột Trái: Thông tin Report hiện tại */}
          <div className="w-full md:w-1/2 p-6 border-r border-gray-100 overflow-y-auto custom-scrollbar">
            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wide">
              Thông tin vụ việc
            </h4>

            <div className="space-y-4">
              {/* Người báo cáo */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 font-medium mb-2 block">
                  Người báo cáo:
                </span>
                <div className="flex items-center gap-3">
                  <img
                    src={reporter?.avatar || "/avatar.png"}
                    className="w-10 h-10 rounded-full object-cover"
                    alt=""
                  />
                  <div>
                    <p className="font-bold text-gray-900">
                      {reporter?.username || "Ẩn danh"}
                    </p>
                    <p className="text-xs text-gray-500">{reporter?.email}</p>
                  </div>
                </div>
              </div>

              {/* Nội dung báo cáo */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Lý do:
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase border border-red-200">
                    {getReasonLabel(reportData.reason)}
                  </span>
                </div>

                <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600 italic leading-relaxed">
                    "{reportData.description || "Không có mô tả chi tiết"}"
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <FiClock size={12} />
                  Đã gửi:{" "}
                  {new Date(reportData.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          </div>

          {/* Cột Phải: Thông tin Người bị báo cáo & Lịch sử */}
          <div className="w-full md:w-1/2 p-6 bg-gray-50/50 overflow-y-auto custom-scrollbar">
            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wide">
              Người bị báo cáo
            </h4>

            <div className="flex flex-col items-center mb-6">
              <img
                src={targetUser?.avatar || "/avatar.png"}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm mb-3"
                alt=""
              />
              <h2 className="text-xl font-bold text-gray-900">
                {targetUser?.username}
              </h2>
              <p className="text-sm text-gray-500">{targetUser?.email}</p>

              {targetUser?.isBlocked && (
                <span className="mt-2 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                  Đang bị khóa
                </span>
              )}
            </div>

            {/* Thống kê lịch sử (nếu có) */}
            {historyData && historyData.length > 0 && (
              <div className="mt-6">
                <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <FiAlertTriangle /> Lịch sử vi phạm ({historyData.length})
                </h5>
                <div className="space-y-2">
                  {historyData.map((hist, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-lg border border-gray-200 text-sm"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-800">
                          {getReasonLabel(hist.reason)}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 rounded ${
                            hist.status === "resolved"
                              ? "bg-green-100 text-green-700"
                              : hist.status === "declined"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {hist.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {hist.description}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(hist.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Đóng
          </button>
          {/* Bạn có thể thêm nút "Xử lý ngay" tại đây nếu muốn */}
        </div>
      </div>
    </div>
  );
}
