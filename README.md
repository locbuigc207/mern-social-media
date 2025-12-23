# 🌐 IT4409 - Mạng Xã Hội

Ứng dụng mạng xã hội được xây dựng với **MERN Stack** (MongoDB, Express, React, Node.js)

## 📋 Tổng quan

| Thành phần | Công nghệ |
|------------|-----------|
| **Frontend** | React 19, Vite, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB |
| **Real-time** | Socket.IO |
| **Authentication** | JWT (JSON Web Token) |

## 📁 Cấu trúc dự án

```
IT4409_Mang_xa_hoi/
├── src/                    # Frontend React
│   ├── api/                # API calls
│   ├── components/         # React components
│   ├── pages/              # Page components
│   └── ...
├── server/                 # Backend Node.js
│   ├── controllers/        # Business logic
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── middleware/         # Auth middleware
│   └── server.js           # Entry point
├── package.json            # Frontend dependencies
└── docker-compose.yml      # Docker configuration
```

---

## 🚀 Hướng dẫn cài đặt và chạy (Local Development)

### Yêu cầu

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker Desktop** (để chạy MongoDB)
- **Git**

### Bước 1: Clone repository

```bash
git clone https://github.com/donglam1824/IT4409_Mang_xa_hoi.git
cd IT4409_Mang_xa_hoi
```

### Bước 2: Chạy MongoDB bằng Docker

```bash
# Chạy MongoDB container (lần đầu)
docker run -d --name mongodb -p 27017:27017 mongo:7.0

# Kiểm tra MongoDB đang chạy
docker ps
```

> **Lưu ý:** Các lần sau chỉ cần `docker start mongodb`

### Bước 3: Cấu hình môi trường

**Tạo file `.env` trong thư mục gốc:**

```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=MySocialApp
```

**Tạo file `.env` trong thư mục `server/`:**

```env
MONGODB_URL=mongodb://localhost:27017/social_network
ACCESS_TOKEN_SECRET=your_access_token_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
PORT=4000
CLIENT_URL=http://localhost:3000
MAIL_SERVICE=gmail
EMAIL_USERNAME=your_gmail
EMAIL_PASSWORD=your_app_password
```

> **Tạo SECRET KEY:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Bước 4: Cài đặt dependencies

```bash
# Cài đặt frontend
npm install

# Cài đặt backend
cd server
npm install
cd ..
```

### Bước 5: Chạy ứng dụng

**Mở 2 terminal riêng biệt:**

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
→ Backend chạy tại: **http://localhost:4000**

**Terminal 2 - Frontend:**
```bash
npm run dev
```
→ Frontend chạy tại: **http://localhost:3000**

---

## 🐳 Chạy với Docker Compose (Full Stack)

```bash
# Chạy tất cả services (MongoDB + Backend + Frontend)
docker-compose up --build

# Chạy ở background
docker-compose up -d --build

# Dừng services
docker-compose down
```

**URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- MongoDB: mongodb://localhost:27017

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/register` | Đăng ký tài khoản |
| POST | `/api/login` | Đăng nhập |
| POST | `/api/logout` | Đăng xuất |
| POST | `/api/refresh_token` | Làm mới token |

### Users
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/user/:id` | Lấy thông tin user |
| PATCH | `/api/user` | Cập nhật profile |
| GET | `/api/search` | Tìm kiếm user |
| PATCH | `/api/user/:id/follow` | Follow user |
| PATCH | `/api/user/:id/unfollow` | Unfollow user |

### Posts
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/posts` | Lấy danh sách posts |
| POST | `/api/posts` | Tạo post mới |
| GET | `/api/post/:id` | Lấy chi tiết post |
| PATCH | `/api/post/:id` | Cập nhật post |
| DELETE | `/api/post/:id` | Xóa post |
| PATCH | `/api/post/:id/like` | Like post |
| PATCH | `/api/post/:id/unlike` | Unlike post |

### Comments
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/comment` | Tạo comment |
| PATCH | `/api/comment/:id` | Sửa comment |
| DELETE | `/api/comment/:id` | Xóa comment |

---

## ❗ Xử lý lỗi thường gặp

### 1. Lỗi kết nối MongoDB
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```
**Giải pháp:** Chạy MongoDB container
```bash
docker start mongodb
# hoặc nếu chưa có
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

### 2. Lỗi CORS
```
Access to fetch blocked by CORS policy
```
**Giải pháp:** Kiểm tra `server/server.js` - đảm bảo origin frontend được cho phép

### 3. Lỗi "Failed to fetch"
**Giải pháp:**
- Kiểm tra backend đang chạy: `http://localhost:4000/api`
- Kiểm tra `VITE_API_URL` trong file `.env`

### 4. Port 3000 bị chiếm
**Giải pháp:**
```bash
# Tìm process đang dùng port 3000
netstat -ano | findstr :3000

# Kill process (thay PID bằng số từ lệnh trên)
taskkill /PID <PID> /F
```

---

## 🔐 Bảo mật

- ❌ **KHÔNG commit** file `.env` lên Git
- ✅ Sử dụng `.env.example` làm template
- ✅ Tạo SECRET KEY riêng cho mỗi môi trường
- ✅ Thay đổi SECRET KEY định kỳ

---

## 👥 Đóng góp

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/TenTinhNang`
3. Commit changes: `git commit -m "Add: Tính năng mới"`
4. Push branch: `git push origin feature/TenTinhNang`
5. Tạo Pull Request

---

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.