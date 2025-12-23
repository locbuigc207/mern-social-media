import { useState } from "react";
import SignInForm from "../../components/auth/SignInForm";
import { useNavigate } from "react-router-dom";
import { login, adminLogin } from "../../api/auth";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (data) => {
    setLoading(true);
    setError("");

    try {
      let response;

      // Thử với User trước, không được mới dùng Admin
      try {
        // 1. Thử gọi API đăng nhập User thường
        response = await login(data);
      } catch (userErr) {
        // 2. Nếu User login thất bại, thử gọi API Admin login
        try {
          response = await adminLogin(data);
        } catch (adminErr) {
          throw adminErr;
        }
      }
      
      if (response?.access_token) {
        // Lưu access token
        localStorage.setItem("access_token", response.access_token);

        if (response.user) {
          // Lưu user object
          localStorage.setItem("currentUser", JSON.stringify(response.user));
          
          //Lưu userId riêng để dùng cho messaging
          localStorage.setItem("userId", response.user._id);
          
          console.log("Đã lưu userId:", response.user._id);
        }

        const role = response.user?.role;
        if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      } else {
        throw new Error("Lỗi hệ thống: Không nhận được Access Token.");
      }
    } catch (err) {
      // Lấy msg lỗi từ backend trả về
      const msg = err.message || "Email hoặc mật khẩu không đúng.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {/* Hiển thị lỗi */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md max-w-md w-full text-center animate-bounce">
          {error}
        </div>
      )}

      <SignInForm onSubmit={handleSignIn} loading={loading} />
    </div>
  );
}