// src/pages/ErrorPage.jsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiAlertTriangle,
  FiHome,
  FiArrowLeft,
  FiRefreshCw,
} from "react-icons/fi";

export default function ErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse error từ query params (nếu có)
  const urlParams = new URLSearchParams(location.search);
  const errorCode = urlParams.get("code") || "UNKNOWN";
  const errorMessage = urlParams.get("message") || "Có lỗi xảy ra";

  // Auto redirect sau 5s cho lỗi 503
  useEffect(() => {
    if (errorCode === "503") {
      const timer = setTimeout(() => {
        navigate("/home");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [navigate, errorCode]);

  const errorConfig = {
    404: {
      title: "404 - Không tìm thấy",
      message: "Trang bạn tìm kiếm không tồn tại.",
      icon: <FiAlertTriangle className="w-24 h-24 text-red-400" />,
      actions: [
        {
          label: "Về trang chủ",
          icon: <FiHome />,
          onClick: () => navigate("/home"),
        },
        {
          label: "Quay lại",
          icon: <FiArrowLeft />,
          onClick: () => navigate(-1),
        },
      ],
    },
    403: {
      title: "403 - Không có quyền",
      message: "Bạn không có quyền truy cập trang này.",
      icon: <FiAlertTriangle className="w-24 h-24 text-yellow-500" />,
      actions: [
        {
          label: "Về trang chủ",
          icon: <FiHome />,
          onClick: () => navigate("/home"),
        },
      ],
    },
    500: {
      title: "500 - Lỗi máy chủ",
      message: "Có lỗi xảy ra ở phía máy chủ. Đội ngũ kỹ thuật đang khắc phục.",
      icon: <FiAlertTriangle className="w-24 h-24 text-red-500" />,
      actions: [
        {
          label: "Thử lại",
          icon: <FiRefreshCw />,
          onClick: () => window.location.reload(),
        },
        {
          label: "Về trang chủ",
          icon: <FiHome />,
          onClick: () => navigate("/home"),
        },
      ],
    },
    503: {
      title: "503 - Dịch vụ tạm thời không khả dụng",
      message: "Hệ thống đang bảo trì. Vui lòng thử lại sau 5 giây...",
      icon: (
        <FiAlertTriangle className="w-24 h-24 text-blue-500 animate-pulse" />
      ),
      actions: [
        {
          label: "Về trang chủ ngay",
          icon: <FiHome />,
          onClick: () => navigate("/home"),
        },
      ],
    },
    UNKNOWN: {
      title: `Lỗi - ${errorCode}`,
      message: errorMessage,
      icon: <FiAlertTriangle className="w-24 h-24 text-gray-400" />,
      actions: [
        {
          label: "Về trang chủ",
          icon: <FiHome />,
          onClick: () => navigate("/home"),
        },
        {
          label: "Thử lại",
          icon: <FiRefreshCw />,
          onClick: () => window.location.reload(),
        },
      ],
    },
  };

  const config = errorConfig[errorCode] || errorConfig.UNKNOWN;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Error Card */}
        <div className="bg-white shadow-xl rounded-3xl p-8 sm:p-12 border border-gray-200">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto">{config.icon}</div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
                {config.title}
              </h1>
              <p className="text-sm font-mono bg-gray-100 text-gray-600 px-3 py-1 rounded-full inline-block">
                Mã lỗi: {errorCode}
              </p>
            </div>

            {/* Message */}
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
              {config.message}
            </p>

            {/* Progress bar for 503 */}
            {errorCode === "503" && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: "100%" }}
                ></div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-6">
              {config.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`
                    flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-medium
                    transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5
                    ${
                      index === 0
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                        : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300"
                    }
                  `}
                >
                  <span className="text-lg">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Support info */}
            <div className="pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Cần hỗ trợ?
                <a
                  href="mailto:support@example.com"
                  className="text-blue-600 hover:underline font-medium ml-1"
                >
                  Liên hệ chúng tôi
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Debug info (chỉ dev) */}
        {import.meta.env.DEV && (
          <div className="text-center">
            <details className="text-xs text-gray-500 inline-block cursor-pointer">
              <summary className="underline">Chi tiết lỗi (Dev)</summary>
              <pre className="mt-2 text-left bg-gray-900 text-gray-100 p-3 rounded-xl text-xs max-w-full overflow-auto">
                {JSON.stringify(
                  {
                    code: errorCode,
                    message: errorMessage,
                    url: location.href,
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
