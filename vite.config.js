import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,        // Chạy ở port 3000
    strictPort: true,  // Báo lỗi nếu port 3000 bận (không tự chuyển port khác)
  },
});
