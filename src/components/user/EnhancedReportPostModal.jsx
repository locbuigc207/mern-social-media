// src/components/user/EnhancedReportPostModal.jsx
import { useState, useRef } from "react";
import { FiX, FiAlertTriangle, FiUpload, FiImage } from "react-icons/fi";
import { reportPost } from "../../api/post";
import toast from "react-hot-toast";

const REPORT_REASONS = [
  { value: "spam", label: "Spam / Tin rác", severity: "low" },
  { value: "harassment", label: "Quấy rối", severity: "medium" },
  { value: "hate_speech", label: "Ngôn từ gây thù ghét", severity: "high" },
  { value: "violence", label: "Bạo lực", severity: "high" },
  { value: "nudity", label: "Khỏa thân / Tình dục", severity: "high" },
  { value: "false_information", label: "Thông tin sai lệch", severity: "medium" },
  { value: "scam", label: "Lừa đảo", severity: "high" },
  { value: "copyright", label: "Vi phạm bản quyền", severity: "medium" },
  { value: "self_harm", label: "Tự tử / Tự hại", severity: "critical" },
  { value: "terrorism", label: "Khủng bố", severity: "critical" },
  { value: "child_exploitation", label: "Bóc lột trẻ em", severity: "critical" },
  { value: "other", label: "Vấn đề khác", severity: "low" },
];

export default function EnhancedReportPostModal({ isOpen, onClose, postId }) {
  const [step, setStep] = useState(1); // 1: Select reason, 2: Details, 3: Success
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState([]);
  const [isReporting, setIsReporting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const selectedReason = REPORT_REASONS.find(r => r.value === reason);

  const handleScreenshotSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (screenshots.length + files.length > 5) {
      toast.error("Chỉ được tải lên tối đa 5 ảnh");
      return;
    }

    setScreenshots(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setScreenshotPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeScreenshot = (index) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(screenshotPreviews[index]);
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Vui lòng chọn lý do báo cáo");
      return;
    }
    
    if (!description || description.trim().length < 10) {
      toast.error("Vui lòng nhập mô tả chi tiết (tối thiểu 10 ký tự)");
      return;
    }

    setIsReporting(true);
    try {
      const formData = new FormData();
      formData.append('reason', reason);
      formData.append('description', description);
      
      screenshots.forEach(file => {
        formData.append('screenshots', file);
      });

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_URL}/api/post/${postId}/report`, {
        method: 'PATCH',
        headers: {
          'Authorization': token,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.msg);

      setStep(3); // Success step
      
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      toast.error(err.message || "Gửi báo cáo thất bại");
    } finally {
      setIsReporting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setReason("");
    setDescription("");
    setScreenshots([]);
    screenshotPreviews.forEach(url => URL.revokeObjectURL(url));
    setScreenshotPreviews([]);
    onClose();
  };

  // Step 3: Success
  if (step === 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Đã gửi báo cáo
          </h3>
          
          <p className="text-gray-600 mb-6">
            Cảm ơn bạn đã giúp chúng tôi giữ cộng đồng an toàn. Chúng tôi sẽ xem xét báo cáo trong vòng 24-48 giờ.
          </p>

          <button
            onClick={handleClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <FiAlertTriangle className="text-xl" />
            <h3 className="text-lg font-bold">
              {step === 1 ? "Báo cáo vi phạm" : "Chi tiết báo cáo"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            // Step 1: Select Reason
            <>
              <p className="text-sm text-gray-600 mb-4">
                Hãy chọn vấn đề bạn đang gặp phải với bài viết này.
              </p>

              <div className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                      reason === r.value
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1 w-5 h-5 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{r.label}</p>
                      {r.severity === 'critical' && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                          NGHIÊM TRỌNG
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          ) : (
            // Step 2: Details
            <>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Lý do đã chọn:</span>{" "}
                  {selectedReason?.label}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vui lòng mô tả chi tiết vấn đề (tối thiểu 10 ký tự)..."
                  rows={4}
                  maxLength={500}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {description.length}/500
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh chụp màn hình (tùy chọn)
                </label>
                
                {screenshotPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {screenshotPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt="screenshot"
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          onClick={() => removeScreenshot(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={screenshots.length >= 5}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiUpload className="text-2xl text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Tải lên ảnh chụp màn hình ({screenshots.length}/5)
                  </p>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleScreenshotSelect}
                />
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Lưu ý:</strong> Báo cáo của bạn sẽ được xem xét kỹ lưỡng. Chúng tôi không tiết lộ danh tính người báo cáo.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Quay lại
            </button>
          )}
          
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Hủy
          </button>
          
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!reason}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp tục
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isReporting || description.trim().length < 10}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isReporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang gửi...
                </>
              ) : (
                'Gửi báo cáo'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}