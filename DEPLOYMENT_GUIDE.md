# 🚀 Hướng Dẫn Deploy Miễn Phí

## Tổng Quan
Deploy ứng dụng Social Media với:
- **Frontend**: Vercel (miễn phí)
- **Backend**: Render.com (miễn phí, 750h/tháng)
- **Database**: MongoDB Atlas (miễn phí, 512MB)
- **Storage**: Cloudinary (miễn phí, 25GB)

---

## 📋 Chuẩn Bị

### 1. Tạo Tài Khoản
- ✅ [Vercel](https://vercel.com) (kết nối GitHub)
- ✅ [Render](https://render.com) (kết nối GitHub)
- ✅ [MongoDB Atlas](https://mongodb.com/atlas)
- ✅ [Cloudinary](https://cloudinary.com)

### 2. Push Code Lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/repo.git
git push -u origin main
```

---

## 🗄️ BƯỚC 1: Setup MongoDB Atlas (Database)

### 1.1 Tạo Cluster
1. Đăng nhập [MongoDB Atlas](https://cloud.mongodb.com)
2. Tạo **New Project** → Đặt tên: `SocialMediaApp`
3. Click **Build a Database** hoặc **Create**
4. Chọn **M0 FREE** (Shared Cluster - Miễn phí)
   - Cloud Provider: AWS
   - Region: **Singapore** (ap-southeast-1) - Gần Việt Nam nhất
   - Cluster Name: `Cluster0` (mặc định)
5. Click **Create Cluster** (chờ 3-5 phút để khởi tạo)

### 1.2 Tạo Database User (Authentication)
1. Sau khi cluster tạo xong, màn hình sẽ hiện **Security Quickstart**
2. Tạo **Database User**:
   - **Authentication Method**: Password
   - Username: `admin` (hoặc tên bạn muốn)
   - Password: Tạo mật khẩu mạnh (click **Autogenerate Secure Password** hoặc tự đặt)
   - ⚠️ **LƯU LẠI MẬT KHẨU NÀY** - bạn sẽ cần dùng sau
   - Database User Privileges: **Atlas admin** (mặc định)
3. Click **Create User**

### 1.3 Whitelist IP (Network Access)
1. Màn hình tiếp tục hiện **Where would you like to connect from?**
2. Click **Add IP Address** → Chọn **My Local Environment**
3. Chọn **Allow Access from Anywhere** (cho phép mọi IP)
   - IP Address: `0.0.0.0/0`
   - Mô tả: `Allow all IPs` (cho Render, Vercel truy cập)
4. Click **Add Entry**
5. Click **Finish and Close**

> 💡 Trong production thực tế, bạn nên giới hạn IP cụ thể. Nhưng với free tier và các cloud platform, dùng `0.0.0.0/0` là đơn giản nhất.

### 1.4 Lấy Connection String
1. Trên **Database Deployments**, tìm cluster `Cluster0`
2. Click nút **Connect**
3. Chọn **Drivers** (Connect your application)
4. **Driver**: Node.js | **Version**: 6.7 or later (mặc định)
5. Copy **Connection String**:
```
mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```
6. **Thay thế**:
   - `<password>` → Mật khẩu database user (bước 1.2)
   - Thêm tên database vào: `...mongodb.net/social-media?retryWrites=...`

**Connection String cuối cùng**:
```
mongodb+srv://admin:YourPassword123@cluster0.xxxxx.mongodb.net/social-media?retryWrites=true&w=majority
```

> ⚠️ **LƯU Ý**: Database `social-media` sẽ tự động được tạo khi ứng dụng kết nối lần đầu. Bạn không cần tạo thủ công!

---

## ☁️ BƯỚC 2: Setup Cloudinary (Image Storage)

1. Đăng ký [Cloudinary](https://cloudinary.com/users/register/free)
2. Vào **Dashboard**, lấy:
   - `Cloud Name`
   - `API Key`
   - `API Secret`

---

## 🔧 BƯỚC 3: Deploy Backend lên Render

### 3.1 Tạo Web Service
1. Đăng nhập [Render](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Kết nối GitHub repository
4. Cấu hình:
   - **Name**: `social-media-backend`
   - **Language**: Click dropdown → Chọn **Node** (KHÔNG chọn Docker!)
     > ⚠️ Nếu Render tự động chọn "Docker", hãy đổi sang "Node" để có options Build/Start Command
   - **Branch**: `main`
   - **Region**: `Singapore`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

### 3.2 Setup Environment Variables
Vào **Environment** tab, thêm các biến sau:

```env
NODE_ENV=production
PORT=10000

# MongoDB Atlas (từ Bước 1)
MONGODB_URL=mongodb+srv://admin:password@cluster0.xxxxx.mongodb.net/social-media

# JWT Secrets (tự tạo chuỗi ngẫu nhiên dài)
JWT_SECRET=your_super_secret_jwt_key_32_characters_minimum_2024
ACCESS_TOKEN_SECRET=your_access_token_secret_key_32_chars_min_2024
REFRESH_TOKEN_SECRET=your_refresh_token_secret_key_32_chars_min_2024

# Cloudinary (từ Bước 2)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Gmail - Tùy chọn)
MAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend URL (sẽ cập nhật sau khi deploy Vercel)
CLIENT_URL=https://your-app.vercel.app
```

### 3.3 Tạo JWT Secrets
Chạy lệnh này trong terminal để tạo chuỗi ngẫu nhiên:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.4 Deploy
1. Click **Create Web Service**
2. Đợi 5-10 phút để deploy xong
3. Lấy URL backend: `https://social-media-backend.onrender.com`

---

## 🌐 BƯỚC 4: Deploy Frontend lên Vercel

### 4.1 Deploy trên Vercel (KHÔNG cần push .env.production)
1. Đăng nhập [Vercel](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import GitHub repository
4. Cấu hình:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (thư mục gốc)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 4.2 Environment Variables (Configure trên Vercel Dashboard)

1. Trong quá trình setup, hoặc vào **Settings** → **Environment Variables**
2. Thêm các biến sau:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | `https://social-media-backend.onrender.com` | Production |
| `VITE_SOCKET_URL` | `https://social-media-backend.onrender.com` | Production |

### 4.3 Deploy
1. Click **Deploy**
2. Đợi 2-5 phút
3. Lấy URL: `https://your-app.vercel.app`

---

## 🔄 BƯỚC 5: Cập Nhật CORS & CLIENT_URL

### 5.1 Cập nhật Backend
1. Vào Render Dashboard → Web Service
2. Vào **Environment** → Sửa biến `CLIENT_URL`:
```
CLIENT_URL=https://your-app.vercel.app
```
3. Click **Save Changes** → Render sẽ tự động redeploy

### 5.2 Kiểm tra CORS trong code
File `server/server.js` đã có CORS config:
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
```

---

## ✅ BƯỚC 6: Test & Verify

### 6.1 Kiểm tra Backend
Mở trình duyệt: `https://social-media-backend.onrender.com/api/health`

Kết quả mong đợi:
```json
{
  "status": "healthy",
  "services": {
    "mongodb": "connected",
    "cloudinary": "connected"
  }
}
```

### 6.2 Kiểm tra Frontend
1. Mở: `https://your-app.vercel.app`
2. Test đăng ký/đăng nhập
3. Test upload ảnh
4. Test real-time chat (Socket.io)

---

## ⚠️ Lưu Ý Quan Trọng

### Free Tier Limitations

#### Render.com:
- ✅ 750 giờ/tháng miễn phí
- ⚠️ **Auto-sleep** sau 15 phút không hoạt động
- ⏱️ Khởi động lại mất ~30-60 giây (cold start)
- 💡 **Giải pháp**: Dùng [Cron-job.org](https://cron-job.org) ping `/api/health` mỗi 10 phút

#### MongoDB Atlas:
- ✅ 512MB storage
- ✅ Unlimited connections
- ⚠️ Giới hạn 100 databases

#### Cloudinary:
- ✅ 25GB storage
- ✅ 25GB bandwidth/tháng
- ⚠️ 10,000 transformations/tháng

---

## 🔧 Troubleshooting

### 1. Backend không kết nối được MongoDB
```bash
# Kiểm tra IP whitelist trong MongoDB Atlas
# Kiểm tra connection string trong Render Environment
```

### 2. CORS Error
```javascript
// Đảm bảo CLIENT_URL đúng trong Render Environment
// Kiểm tra server/server.js có config CORS
```

### 3. Socket.io không kết nối
```javascript
// Kiểm tra VITE_SOCKET_URL trong frontend
// Render hỗ trợ WebSocket, không cần config thêm
```

### 4. Cold Start chậm
```bash
# Dùng cron job để ping backend mỗi 10 phút
# URL: https://social-media-backend.onrender.com/api/health
```

---

## 🚀 Deploy Updates

### Update Frontend:
```bash
git add .
git commit -m "Update frontend"
git push
# Vercel tự động deploy
```

### Update Backend:
```bash
git add .
git commit -m "Update backend"
git push
# Render tự động deploy
```

---

## 📊 Monitoring

### Render Dashboard:
- Xem logs: **Logs** tab
- Xem metrics: **Metrics** tab
- Health checks: Tự động

### Vercel Dashboard:
- Analytics: **Analytics** tab
- Logs: **Deployments** → Click deployment → **Logs**

---

## 💰 Chi Phí

| Service | Free Tier | Đủ dùng? |
|---------|-----------|----------|
| Vercel | 100GB bandwidth | ✅ Yes |
| Render | 750h/tháng | ✅ Yes (1 app) |
| MongoDB | 512MB | ✅ Yes (demo/small) |
| Cloudinary | 25GB | ✅ Yes |
| **TỔNG** | **$0/tháng** | ✅ **Hoàn toàn miễn phí** |

---

## 🎉 Hoàn Thành!

URL của bạn:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://social-media-backend.onrender.com`
- **Admin**: `https://your-app.vercel.app/admin`

Chúc mừng bạn đã deploy thành công! 🎊
