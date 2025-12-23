import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute - Bảo vệ các route yêu cầu đăng nhập
 * Nếu chưa đăng nhập (không có token), chuyển hướng về trang đăng nhập
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    // Chưa đăng nhập, chuyển về trang đăng nhập
    return <Navigate to="/signin" replace />;
  }

  // Đã đăng nhập, hiển thị component con
  return children;
}
