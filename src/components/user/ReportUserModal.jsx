import { useState } from "react";
import { FiX, FiAlertCircle } from "react-icons/fi";

const REPORT_REASONS = [
  {
    id: "spam",
    label: "Spam",
    description: "Nội dung lặp đi lặp lại hoặc quảng cáo",
  },
  {
    id: "harassment",
    label: "Quấy rối",
    description: "Gây phiền nhiễu hoặc đe dọa",
  },
  {
    id: "hate_speech",
    label: "Ngôn từ gây thù ghét",
    description: "Phân biệt đối xử hoặc kỳ thị",
  },
  {
    id: "violence",
    label: "Bạo lực",
    description: "Nội dung bạo lực hoặc nguy hiểm",
  },
  {
    id: "false_information",
    label: "Thông tin sai lệch",
    description: "Tin giả hoặc thông tin gây hiểu lầm",
  },
  {
    id: "inappropriate",
    label: "Nội dung không phù hợp",
    description: "Vi phạm tiêu chuẩn cộng đồng",
  },
  {
    id: "scam",
    label: "Mạo danh",
    description: "Giả mạo người khác",
  },
  {
    id: "other",
    label: "Lý do khác",
    description: "Vấn đề khác cần được xem xét",
  },
];

export default function ReportUserModal({ isOpen, onClose, onSubmit, userName }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState(1); // 1: chọn lý do, 2: mô tả chi tiết

  if (!isOpen) return null;

  const handleNext = () => {
    if (selectedReason) {
      setStep(2);
    }
  };

  const handleSubmit = () => {
    if (selectedReason) {
      onSubmit(selectedReason, description);
      // Reset form
      setSelectedReason("");
      setDescription("");
      setStep(1);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setDescription("");
    setStep(1);
    onClose();
  };

  const selectedReasonData = REPORT_REASONS.find(
    (r) => r.id === selectedReason
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 1 ? "Báo cáo trang cá nhân" : "Cung cấp thêm thông tin"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <FiX className="text-xl text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {step === 1 ? (
            <>
              {/* Thông tin người bị báo cáo */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
                <FiAlertCircle className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-900">
                  Bạn đang báo cáo <strong>{userName}</strong>. Hãy cho chúng
                  tôi biết vấn đề gì đang xảy ra.
                </p>
              </div>

              {/* Danh sách lý do */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Vui lòng chọn lý do báo cáo:
                </p>
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      selectedReason === reason.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {reason.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {reason.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Bước 2: Mô tả chi tiết */}
              <div className="mb-4">
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Lý do đã chọn:</span>{" "}
                    {selectedReasonData?.label}
                  </p>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả chi tiết (không bắt buộc)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vui lòng cung cấp thêm thông tin để giúp chúng tôi xem xét báo cáo của bạn..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/500 ký tự
                </p>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  Báo cáo của bạn sẽ được xem xét trong vòng 24-48 giờ. Chúng
                  tôi sẽ không tiết lộ danh tính của bạn cho người bị báo cáo.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2 justify-end">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition"
            >
              Quay lại
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition"
          >
            Hủy
          </button>
          {step === 1 ? (
            <button
              onClick={handleNext}
              disabled={!selectedReason}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedReason
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Tiếp tục
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
            >
              Gửi báo cáo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
