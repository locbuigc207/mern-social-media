import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { verifyEmail } from "../../api/auth";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("Đang xác thực email...");
  const hasVerified = useRef(false); // Flag để tránh gọi API 2 lần

  useEffect(() => {
    if (token && !hasVerified.current) {
      hasVerified.current = true; // Đánh dấu đã gọi API

      const handleVerify = async () => {
        try {
          // Gọi API GET /verify_email/:token
          const res = await verifyEmail(token);

          setStatus("success");
          setMessage("Xác thực thành công! Đang chuyển hướng...");

          // --- XỬ LÝ TỰ ĐỘNG ĐĂNG NHẬP (OPTIONAL) ---
          // Backend của bạn trả về { access_token, user }
          // Nếu muốn user không phải đăng nhập lại, hãy lưu token ngay tại đây:
          if (res.access_token) {
            localStorage.setItem("token", res.access_token);
            if (res.user) {
              localStorage.setItem("currentUser", JSON.stringify(res.user));
            }
          }

          // Chuyển hướng về trang chủ (hoặc login) sau 3 giây
          setTimeout(() => {
            // Nếu đã lưu token ở trên thì về Home, chưa lưu thì về Login
            navigate("/signin");
          }, 3000);
        } catch (err) {
          setStatus("error");
          console.error(err);
          // Hiển thị lỗi từ backend (ví dụ: Token expired)
          setMessage(
            err.message || "Link xác thực không hợp lệ hoặc đã hết hạn."
          );
        }
      };

      handleVerify();
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        {/* TRẠNG THÁI LOADING */}
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">
              Đang kiểm tra...
            </h2>
          </div>
        )}

        {/* TRẠNG THÁI SUCCESS */}
        {status === "success" && (
          <div className="flex flex-col items-center animate-fade-in-up">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Thành công!
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate("/signin")}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* TRẠNG THÁI ERROR */}
        {status === "error" && (
          <div className="flex flex-col items-center animate-fade-in-up">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Xác thực thất bại
            </h2>
            <p className="text-red-500 mb-6">{message}</p>
            <button
              onClick={() => navigate("/signin")}
              className="px-6 py-2 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-900 transition"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
