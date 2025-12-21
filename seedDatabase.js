/**
 * Script để import mock data vào MongoDB
 * Chạy: node server/seedDatabase.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Import models
const User = require("./models/userModel");
const Post = require("./models/postModel");
const Notification = require("./models/notificationModel");

// Mock data - chuyển đổi từ frontend mock data
const mockUsers = [
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"), // dev_user_001
    fullname: "Developer User",
    username: "dev_user",
    email: "dev@example.com",
    password: "password123", // Sẽ hash
    avatar: "https://i.pravatar.cc/150?img=1",
    gender: "male",
    role: "user",
    friends: [],
  },
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"), // friend_001
    fullname: "Nguyễn Văn A",
    username: "nguyen_van_a",
    email: "nguyenvana@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?img=2",
    gender: "male",
    friends: [],
  },
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"), // friend_002
    fullname: "Trần Thị B",
    username: "tran_thi_b",
    email: "tranthib@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?img=3",
    gender: "female",
    friends: [],
  },
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"), // friend_003
    fullname: "Lê Văn C",
    username: "le_van_c",
    email: "levanc@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?img=4",
    gender: "male",
    friends: [],
  },
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"), // friend_004
    fullname: "Phạm Thị D",
    username: "pham_thi_d",
    email: "phamthid@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?img=5",
    gender: "female",
    friends: [],
  },
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439016"), // friend_005
    fullname: "Hoàng Văn E",
    username: "hoang_van_e",
    email: "hoangvane@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?img=6",
    gender: "male",
    friends: [],
  },
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439017"), // request_001
    fullname: "Đỗ Thị F",
    username: "do_thi_f",
    email: "dothif@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?img=7",
    gender: "female",
    friends: [],
  },
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439018"), // sug_001
    fullname: "Vũ Thị G",
    username: "vu_thi_g",
    email: "vuthig@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?img=8",
    gender: "female",
    friends: [],
  },
  {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439019"), // sug_002
    fullname: "Đặng Văn H",
    username: "dang_van_h",
    email: "dangvanh@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?img=9",
    gender: "male",
    friends: [],
  },
];

const mockPosts = [
  {
    content: "Hôm nay trời đẹp quá! 🌞 Đi cafe với bạn bè thật vui.",
    images: ["https://picsum.photos/seed/post1/600/400"],
    user: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
    likes: [
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
    ],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    content: "Vừa hoàn thành dự án mới! 🎉 Cảm ơn team đã cùng nhau cố gắng.",
    images: [],
    user: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
    likes: [new mongoose.Types.ObjectId("507f1f77bcf86cd799439011")],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    content: "Review quán ăn mới gần công ty, đồ ăn ngon và giá cả hợp lý 👍",
    images: [
      "https://picsum.photos/seed/food1/600/400",
      "https://picsum.photos/seed/food2/600/400",
    ],
    user: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
    likes: [
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
    ],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    content: "Cuối tuần rồi! Ai có plan gì chưa? 🎈",
    images: [],
    user: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
    likes: [],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    content:
      "Chia sẻ một số tips học lập trình hiệu quả:\n1. Code mỗi ngày\n2. Đọc code người khác\n3. Làm project thực tế\n4. Tham gia cộng đồng",
    images: ["https://picsum.photos/seed/coding/600/400"],
    user: new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"),
    likes: [
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439016"),
    ],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
];

const seedDatabase = async () => {
  try {
    console.log("🔌 Đang kết nối MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URL);
    console.log("✅ Đã kết nối MongoDB!");

    // Xóa dữ liệu cũ
    // Xóa dữ liệu cũ
    console.log("\n🗑️  Đang xóa dữ liệu cũ...");
    try {
      console.log("   Đang xóa Users...");
      await User.deleteMany({});
      console.log("   ✓ Đã xóa Users");

      console.log("   Đang xóa Posts...");
      await Post.deleteMany({});
      console.log("   ✓ Đã xóa Posts");

      console.log("   Đang xóa Notifications...");
      await Notification.deleteMany({});
      console.log("   ✓ Đã xóa Notifications");

      console.log("✅ Đã xóa dữ liệu cũ!");
    } catch (error) {
      console.error("❌ Lỗi khi xóa dữ liệu:", error.message);
      throw error;
    }

    // Hash password cho users
    console.log("\n🔐 Đang hash password...");
    for (let i = 0; i < mockUsers.length; i++) {
      console.log(
        `   Hashing password cho user ${i + 1}/${mockUsers.length}...`
      );
      mockUsers[i].password = await bcrypt.hash(mockUsers[i].password, 12);
    }
    console.log("✅ Đã hash xong!");

    // Insert users
    console.log("\n👥 Đang thêm users...");
    const users = [];
    for (let i = 0; i < mockUsers.length; i++) {
      console.log(
        `   Thêm user ${i + 1}/${mockUsers.length}: ${mockUsers[i].username}...`
      );
      const user = await User.create(mockUsers[i]);
      users.push(user);
    }
    console.log(`✅ Đã thêm ${users.length} users!`);

    // Thiết lập quan hệ bạn bè
    console.log("\n🤝 Đang thiết lập quan hệ bạn bè...");
    const devUser = users[0]; // dev_user_001
    const friends = [users[1], users[2], users[3], users[4], users[5]]; // friend_001 đến friend_005

    // Dev user có 5 bạn bè
    devUser.friends = friends.map((f) => f._id);

    // Thêm friend requests vào dev_user
    devUser.friendRequests = [
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"), // friend_001 (Nguyễn Văn A)
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"), // friend_002 (Trần Thị B)
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439017"), // request_001 (Đỗ Thị F)
    ];
    await devUser.save();

    // Các friends cũng có dev_user trong danh sách bạn
    for (let friend of friends) {
      friend.friends = [devUser._id];
      await friend.save();
    }

    console.log(
      `✅ Dev user đã kết bạn với ${friends.length} người và có ${devUser.friendRequests.length} friend requests!`
    );

    // Insert posts
    console.log("\n📝 Đang thêm posts...");
    const posts = await Post.insertMany(mockPosts);
    console.log(`✅ Đã thêm ${posts.length} posts!`);

    // Tạo notifications
    console.log("\n🔔 Đang thêm notifications...");
    const mockNotifications = [
      {
        recipient: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        sender: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
        type: "like",
        post: posts[0]._id,
        text: "đã thích bài viết của bạn",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
      },
      {
        recipient: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        sender: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
        type: "comment",
        post: posts[0]._id,
        text: "đã bình luận về bài viết của bạn",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
      },
      {
        recipient: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        sender: new mongoose.Types.ObjectId("507f1f77bcf86cd799439017"),
        type: "friend_request",
        text: "đã gửi lời mời kết bạn",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        recipient: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        sender: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
        type: "friend_accept",
        text: "đã chấp nhận lời mời kết bạn",
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    ];

    const notifications = await Notification.insertMany(mockNotifications);
    console.log(`✅ Đã thêm ${notifications.length} notifications!`);

    // Thống kê
    console.log("\n📊 Thống kê dữ liệu đã import:");
    console.log(`   👥 Users: ${await User.countDocuments()}`);
    console.log(`      - 1 dev user (dev_user)`);
    console.log(`      - 5 bạn bè (friend_001 -> friend_005)`);
    console.log(`      - 1 friend request (request_001)`);
    console.log(`      - 2 suggestions (sug1, sug2)`);
    console.log(`   📝 Posts: ${await Post.countDocuments()}`);
    console.log(`   🔔 Notifications: ${await Notification.countDocuments()}`);
    console.log(`   🤝 Quan hệ bạn bè: dev_user có 5 bạn`);

    console.log("\n✨ Hoàn thành! Bây giờ bạn có thể:");
    console.log("   1. Tắt VITE_DEV_MODE trong .env (hoặc đặt = false)");
    console.log("   2. Khởi động lại frontend: npm run dev");
    console.log("   3. Đăng nhập với: dev_user / password123");
    console.log("   4. Test các tính năng với dữ liệu thật từ database");
    console.log("\n💡 Tất cả users đều có password: password123\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
};

// Chạy seed
seedDatabase();
