import { Navigate } from "react-router-dom";

/**
 * PublicRoute - Dành cho các trang công khai như Login/Signup
 * Nếu đã đăng nhập (có token), chuyển hướng về trang home
 */
export default function PublicRoute({ children }) {
  const token = localStorage.getItem("accessToken");

  if (token) {
    // Đã đăng nhập, chuyển về trang home
    return <Navigate to="/home" replace />;
  }

  // Chưa đăng nhập, hiển thị component con (login/signup page)
  return children;
}
