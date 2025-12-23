import { Navigate, Outlet } from "react-router-dom";

/**
 * ProtectedRoute - Bảo vệ các route yêu cầu đăng nhập
 * Nếu chưa đăng nhập (không có token), chuyển hướng về trang signup
 */
export default function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem("access_token");

  // Lấy thông tin user để kiểm tra quyền
  const getUserRole = () => {
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr).role;
    } catch {
      return null;
    }
  };

  if (!token) {
    // Chưa đăng nhập, chuyển về trang đăng ký/đăng nhập
    return <Navigate to="/signin" replace />;
  }
  const userRole = getUserRole();
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/home" replace />;
  }

  // Đã đăng nhập, hiển thị component con
  return <Outlet />;
}
