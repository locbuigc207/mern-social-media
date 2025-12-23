/**
 * Cấu hình môi trường cho toàn bộ ứng dụng
 * 
 * Khi deploy production:
 * 1. Đổi isDevelopment = false
 * 2. Hoặc set VITE_DEV_MODE=false trong file .env
 */

// Ưu tiên đọc từ biến môi trường, nếu không có thì mặc định là true (dev mode)
export const isDevelopment = import.meta.env.VITE_DEV_MODE !== "false";

// API URL
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Các cấu hình khác
export const config = {
  isDevelopment,
  API_URL,
  
  // Thời gian delay giả lập API (ms) - chỉ dùng trong dev mode
  mockDelay: 300,
  
  // Số lượng items mỗi trang
  pageSize: 10,
};

export default config;
