import { useState } from "react";

export default function SignInForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Kiểm tra form hợp lệ
  const isFormValid = () => {
    const { email, password } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return emailRegex.test(email) && password.length >= 6;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setLoading(true);

    const payload = {
      email: formData.email,
      password: formData.password,
    };

    try {
      await onSubmit(payload); // Hàm gọi API từ ngoài
    } catch (error) {
      console.error("Lỗi khi đăng nhập:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <h1 className="text-[56px] text-blue-600 font-bold mb-4">
        My Social App
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-[430px]"
      >
        <h2 className="text-2xl font-bold text-center mb-1">
          Đăng nhập
        </h2>
        <p className="text-center text-gray-600 text-sm mb-4">
          Chào mừng bạn trở lại
        </p>

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded-md p-2 w-full mb-3 focus:outline-blue-500"
        />

        {/* Mật khẩu */}
        <input
          type="password"
          name="password"
          placeholder="Mật khẩu"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={6}
          className="border border-gray-300 rounded-md p-2 w-full mb-4 focus:outline-blue-500"
        />

        {/* Nút đăng nhập */}
        <button
          type="submit"
          disabled={loading || !isFormValid()}
          className={`w-full py-2 text-lg font-semibold rounded-md text-white transition ${
            loading || !isFormValid()
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        {/* Links phụ */}
        <div className="mt-4 text-center space-y-2">
          <a href="/forgot-password" className="text-blue-600 text-sm hover:underline block">
            Quên mật khẩu?
          </a>
          <a href="/signup" className="text-blue-600 text-sm hover:underline block">
            Tạo tài khoản mới
          </a>
        </div>
      </form>
    </div>
  );
}