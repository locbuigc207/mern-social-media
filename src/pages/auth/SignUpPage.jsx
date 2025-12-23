import { useState } from "react";
import SignUpForm from "../../components/auth/SignUpForm";
import { useNavigate } from "react-router-dom";
import { register } from "../../api/auth";

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (data) => {
    setLoading(true);
    setError("");

    try {
      await register(data); //Gọi api từ auth.js
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/signin"); //Chuyển đến trang login
    } catch (err) {
      console.error("Lỗi đăng ký", err);
      const serverError = err.response?.data?.msg;
      setError(serverError || err.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {/* Hiển thị lỗi */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md max-w-md text-center">
          {error}
        </div>
      )}

      <SignUpForm onSubmit={handleSignUp} loading={loading} />
    </div>
  );
}
