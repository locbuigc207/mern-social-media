import { request } from "./request";

// ĐĂNG KÝ
export const register = (userData) => {
  return request("/api/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};
// XÁC THỰC EMAIL
export const verifyEmail = (token) => {
  return request(`/api/verify_email/${token}`, {
    method: "GET",
  });
};
//GỬI LẠI EMAIL XÁC THỰC
export const resendVerificationEmail = (email) => {
  return request("/api/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};
// ĐĂNG NHẬP
export const login = (userData) => {
  return request("/api/login", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};
export const adminLogin = (userData) => {
  return request("/api/admin_login", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

// ĐĂNG XUẤT
export const logout = () => {
  return request("/api/logout", {
    method: "POST",
  });
};

// LÀM MỚI TOKEN
export const refreshToken = () => {
  return request("/api/refresh_token", {
    method: "POST",
  });
};
// QUÊN MẬT KHẨU
export const forgotPassword = (email) => {
  return request("/api/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};
//ĐẶT LẠI MẬT KHẨU
export const resetPassword = (token, passwords) => {
  // authCtrl lấy token từ params và password từ body
  // passwords: { password, confirmPassword }
  return request(`/api/reset-password/${token}`, {
    method: "POST",
    body: JSON.stringify(passwords),
  });
};
//ĐỔI MẬT KHẨU
export const changePassword = (data) => {
  // data: { oldPassword, newPassword, cnfNewPassword }
  return request("/api/changePassword", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
// ĐĂNG KÝ CHO ADMIN
export const registerAdmin = (data) => {
  return request("/api/register_admin", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
