import { useState } from "react";

export default function SignUpForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    gender: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  // Kiểm tra thông tin cá nhân hợp lệ chưa
  const isFormValid = () => {
    const {
      firstName,
      lastName,
      username,
      birthDay,
      birthMonth,
      birthYear,
      gender,
      email,
      password,
      confirm_password,
    } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const currentYear = new Date().getFullYear();
    const age = birthYear ? currentYear - parseInt(birthYear) : 0;

    // Debug - xem điều kiện nào false
    // console.log({
    //   firstName: !!firstName.trim(),
    //   lastName: !!lastName.trim(),
    //   username: !!username.trim(),
    //   birthDay: !!birthDay,
    //   birthMonth: !!birthMonth,
    //   birthYear: !!birthYear,
    //   gender: !!gender,
    //   emailValid: emailRegex.test(email),
    //   passwordLength: password.length >= 6,
    //   ageValid: age >= 13,
    //   passwordMatch: password === confirm_password,
    //   password,
    //   confirm_password,
    // });

    return (
      firstName.trim() &&
      lastName.trim() &&
      username.trim() &&
      birthDay &&
      birthMonth &&
      birthYear &&
      gender &&
      emailRegex.test(email) &&
      password.length >= 6 &&
      age >= 13 &&
      password === confirm_password
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    const fullname = `${formData.lastName} ${formData.firstName}`.trim();
    const genderMap = {
      Nam: "male",
      Nữ: "female",
      "Tùy chỉnh": "other",
    };

    const payload = {
      fullname,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      gender: genderMap[formData.gender] || "male",
    };

    try {
      await onSubmit(payload); // Hàm gọi API từ ngoài
    } catch (error) {
      console.error("Lỗi khi đăng ký:", error);
    }
  };

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100;
  const maxYear = currentYear - 13;

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
          Tạo tài khoản mới
        </h2>

        {/* Họ tên */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            name="lastName"
            placeholder="Họ"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-md p-2 w-1/2 focus:outline-blue-500"
          />
          <input
            type="text"
            name="firstName"
            placeholder="Tên"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-md p-2 w-1/2 focus:outline-blue-500"
          />
        </div>

        {/* Tên đăng nhập */}
        <input
          type="text"
          name="username"
          placeholder="Tên đăng nhập"
          value={formData.username}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded-md p-2 w-full mb-3 focus:outline-blue-500"
        />

        {/* Ngày sinh */}
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Ngày sinh
        </label>
        <div className="flex gap-2 mb-3">
          <select
            name="birthDay"
            value={formData.birthDay}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-md p-2 w-1/3"
          >
            <option value="">Ngày</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>

          <select
            name="birthMonth"
            value={formData.birthMonth}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-md p-2 w-1/3"
          >
            <option value="">Tháng</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Tháng {i + 1}
              </option>
            ))}
          </select>

          <select
            name="birthYear"
            value={formData.birthYear}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-md p-2 w-1/3"
          >
            <option value="">Năm</option>
            {Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
              const year = maxYear - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        {/* Giới tính */}
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Giới tính
        </label>
        <div className="flex gap-3 mb-4">
          {["Nữ", "Nam", "Tùy chỉnh"].map((g) => (
            <label
              key={g}
              className="border border-gray-300 rounded-md flex items-center justify-between p-2 w-1/3 cursor-pointer hover:border-blue-500 transition"
            >
              <span className="text-sm">{g}</span>
              <input
                type="radio"
                name="gender"
                value={g}
                checked={formData.gender === g}
                onChange={handleChange}
                className="ml-2"
              />
            </label>
          ))}
        </div>

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded-md p-2 w-full mb-2 focus:outline-blue-500"
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
        <input
          type="password"
          name="confirm_password"
          placeholder="Nhập lại mật khẩu"
          value={formData.confirm_password}
          onChange={handleChange}
          required
          minLength={6}
          className="border border-gray-300 rounded-md p-2 w-full mb-4 focus:outline-blue-500"
        />
        {/* Nút đăng ký */}
        <button
          type="submit"
          disabled={loading || !isFormValid()}
          className={`w-full py-2 text-lg font-semibold rounded-md text-white transition ${
            loading || !isFormValid()
              ? "bg-green-300 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </button>
        {/* Link phụ */}
        <a
          href="/signin"
          className="text-blue-600 text-sm hover:underline block mt-2"
        >
          Bạn đã có tài khoản?
        </a>
      </form>
    </div>
  );
}
