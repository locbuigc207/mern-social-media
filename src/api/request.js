// API chung - xử lý lỗi, token
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const request = async (endpoint, options = {}) => {
  // 1. Lấy token từ localStorage
  const access_token = localStorage.getItem("access_token");

  // 2. Chuẩn bị Header
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (headers["Content-Type"] === undefined) {
    delete headers["Content-Type"];
  }

  // Danh sách endpoint công khai (không cần Authorization)
  const publicEndpoints = [
    "/api/verify_email/", // xác thực email
    "/api/verify-email/",
    "/api/register",     // đăng ký
    "/api/login",        // đăng nhập
    "/api/forgot-password", // quên mật khẩu
    "/api/resend-verification" // gửi lại email xác thực
  ];

  // Chỉ gắn Authorization nếu endpoint không phải public
  const isPublic = publicEndpoints.some((pub) => endpoint.startsWith(pub));
  if (access_token && !isPublic) {
    headers["Authorization"] = access_token;
  }

  // 3. Cấu hình request
  const config = {
    ...options,
    headers,
    credentials: "include",
  };

  // 4. Gọi API
  const res = await fetch(`${API_URL}${endpoint}`, config);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Đã có lỗi xảy ra");
  }

  return data;
};
