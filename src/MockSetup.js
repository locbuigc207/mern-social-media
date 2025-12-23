// File: src/mockSetup.js
// Import file này ở đầu main.jsx là xong, không cần sửa gì khác!

// ============= MOCK DATA =============
const mockCurrentUser = {
  _id: "mock_user_001",
  username: "vuly2024",
  fullname: "Vũ Ly",
  email: "vuly50833@gmail.com",
  avatar: "https://i.pravatar.cc/300?img=1",
  coverPhoto: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200",
  bio: "Học Computer Science tại Trường Công nghệ Thông tin và Truyền thông - ĐH Bách khoa Hà Nội 🎓",
  location: "Hà Nội",
  followers: [
    { _id: "mock_user_002", username: "phglinh", fullname: "Phạm Gia Linh", avatar: "https://i.pravatar.cc/150?img=2" },
    { _id: "f2", username: "tran_thi_b", fullname: "Trần Thị B", avatar: "https://i.pravatar.cc/150?img=3" },
    { _id: "f3", username: "le_van_c", fullname: "Lê Văn C", avatar: "https://i.pravatar.cc/150?img=4" },
    { _id: "f4", username: "pham_thi_d", fullname: "Phạm Thị D", avatar: "https://i.pravatar.cc/150?img=5" },
    { _id: "f5", username: "hoang_van_e", fullname: "Hoàng Văn E", avatar: "https://i.pravatar.cc/150?img=6" },
  ],
  saved: [],
  createdAt: "2024-01-15T00:00:00.000Z",
};

// Mock user khác - Phạm Gia Linh
const mockOtherUser = {
  _id: "mock_user_002",
  username: "phglinh",
  fullname: "Phạm Gia Linh",
  email: "phglinh@gmail.com",
  avatar: "https://i.pravatar.cc/300?img=2",
  coverPhoto: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
  bio: "Yêu thích nhiếp ảnh và du lịch 📸✈️",
  location: "Hà Nội",
  followers: [
    { _id: "mock_user_001", username: "vuly2024", fullname: "Vũ Ly", avatar: "https://i.pravatar.cc/150?img=1" },
    { _id: "f6", username: "nguyen_van_f", fullname: "Nguyễn Văn F", avatar: "https://i.pravatar.cc/150?img=7" },
    { _id: "f7", username: "le_thi_g", fullname: "Lê Thị G", avatar: "https://i.pravatar.cc/150?img=8" },
    { _id: "f8", username: "tran_van_h", fullname: "Trần Văn H", avatar: "https://i.pravatar.cc/150?img=9" },
  ],
  saved: [],
  createdAt: "2023-11-20T00:00:00.000Z",
};

// Mock user khác 2 - Nguyễn Minh Tuấn
const mockOtherUser2 = {
  _id: "mock_user_003",
  username: "minhtuan",
  fullname: "Nguyễn Minh Tuấn",
  email: "minhtuan@gmail.com",
  avatar: "https://i.pravatar.cc/300?img=12",
  coverPhoto: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200",
  bio: "Software Developer | Coffee Lover ☕",
  location: "Đà Nẵng",
  followers: [
    { _id: "f9", username: "user1", fullname: "User 1", avatar: "https://i.pravatar.cc/150?img=13" },
    { _id: "f10", username: "user2", fullname: "User 2", avatar: "https://i.pravatar.cc/150?img=14" },
  ],
  saved: [],
  createdAt: "2023-08-10T00:00:00.000Z",
};

// Map users để dễ tìm
const mockUsers = {
  "mock_user_001": mockCurrentUser,
  "mock_user_002": mockOtherUser,
  "mock_user_003": mockOtherUser2,
};

const mockPosts = [
  {
    _id: "post_001",
    content: "Hôm nay thời tiết đẹp quá! 🌞",
    images: [{ url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", publicId: "img_001" }],
    user: mockCurrentUser,
    likes: [{ _id: "f1" }, { _id: "f2" }],
    comments: [
      {
        _id: "c1",
        content: "Đẹp quá bạn ơi!",
        user: { _id: "f1", fullname: "Nguyễn Văn A", avatar: "https://i.pravatar.cc/150?img=2" },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    _id: "post_002",
    content: "Just finished my project! 🚀",
    images: [],
    user: mockCurrentUser,
    likes: [{ _id: "f3" }],
    comments: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: "post_003",
    content: "Học lập trình vui vô cùng! 💻",
    images: [
      { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", publicId: "img_003" },
      { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", publicId: "img_004" },
    ],
    user: mockCurrentUser,
    likes: [],
    comments: [
      {
        _id: "c2",
        content: "Cố lên nha!",
        user: { _id: "f2", fullname: "Trần Thị B", avatar: "https://i.pravatar.cc/150?img=3" },
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

// Posts của user khác (Phạm Gia Linh)
const mockOtherUserPosts = [
  {
    _id: "post_101",
    content: "Chuyến đi Sa Pa tuyệt vời! 🏔️",
    images: [
      { url: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800", publicId: "img_101" },
      { url: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800", publicId: "img_102" },
    ],
    user: mockOtherUser,
    likes: [{ _id: "mock_user_001" }, { _id: "f6" }],
    comments: [
      {
        _id: "c101",
        content: "Đẹp quá! Mình cũng muốn đi",
        user: { _id: "mock_user_001", fullname: "Vũ Ly", avatar: "https://i.pravatar.cc/150?img=1" },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    _id: "post_102",
    content: "Golden hour 🌅",
    images: [{ url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", publicId: "img_103" }],
    user: mockOtherUser,
    likes: [{ _id: "f7" }],
    comments: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: "post_103",
    content: "Coffee and code ☕💻",
    images: [],
    user: mockOtherUser,
    likes: [],
    comments: [],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

// Posts của user khác 2 (Nguyễn Minh Tuấn)
const mockOtherUser2Posts = [
  {
    _id: "post_201",
    content: "Debugging is like being a detective 🕵️",
    images: [{ url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800", publicId: "img_201" }],
    user: mockOtherUser2,
    likes: [],
    comments: [],
    createdAt: new Date(Date.now() - 28800000).toISOString(),
    updatedAt: new Date(Date.now() - 28800000).toISOString(),
  },
];

// Map posts theo user
const mockUserPosts = {
  "mock_user_001": mockPosts,
  "mock_user_002": mockOtherUserPosts,
  "mock_user_003": mockOtherUser2Posts,
};

// ============= INTERCEPT FETCH =============
const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  const urlStr = typeof url === "string" ? url : url.toString();
  const method = options.method || "GET";

  console.log("🎭 Mock API:", method, urlStr);

  // Delay giả lập network
  await new Promise((resolve) => setTimeout(resolve, 300));

  // ========== LOGIN ==========
  if (urlStr.includes("/api/login") || urlStr.includes("/api/admin_login")) {
    return new Response(
      JSON.stringify({
        access_token: "mock_token_" + Date.now(),
        user: mockCurrentUser,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== GET CURRENT USER ==========
  if (urlStr.includes("/api/user/me")) {
    return new Response(
      JSON.stringify({ user: mockCurrentUser }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== GET USER BY ID ==========
  if (urlStr.match(/\/api\/user\/[^/]+$/) && method === "GET") {
    const userId = urlStr.split("/api/user/")[1];
    
    // Nếu là "me", trả về current user
    if (userId === "me") {
      return new Response(
        JSON.stringify({ user: mockCurrentUser }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Tìm user trong mock data
    const user = mockUsers[userId];
    if (user) {
      return new Response(
        JSON.stringify({ user }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // User không tồn tại
    return new Response(
      JSON.stringify({ msg: "User not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== GET USER POSTS ==========
  if (urlStr.includes("/api/user_posts/")) {
    const userId = urlStr.split("/api/user_posts/")[1];
    const posts = mockUserPosts[userId] || [];
    
    return new Response(
      JSON.stringify({ posts }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== GET ALL POSTS ==========
  if (urlStr.includes("/api/posts") && method === "GET") {
    // Merge tất cả posts từ các users
    const allPosts = [...mockPosts, ...mockOtherUserPosts, ...mockOtherUser2Posts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return new Response(
      JSON.stringify({ posts: allPosts }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== CREATE POST ==========
  if (urlStr.includes("/api/posts") && method === "POST") {
    const formData = options.body;
    const content = formData.get("content");
    const files = formData.getAll("files");

    const newPost = {
      _id: `post_${Date.now()}`,
      content: content || "",
      images: files.map((file) => ({
        url: URL.createObjectURL(file),
        publicId: `img_${Date.now()}`,
      })),
      user: mockCurrentUser,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockPosts.unshift(newPost);

    return new Response(
      JSON.stringify({ msg: "Đăng bài thành công!", newPost }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== UPDATE POST ==========
  if (urlStr.includes("/api/post/") && method === "PATCH") {
    const postId = urlStr.split("/api/post/")[1];
    const formData = options.body;
    const content = formData.get("content");

    const postIndex = mockPosts.findIndex((p) => p._id === postId);
    if (postIndex !== -1) {
      mockPosts[postIndex].content = content;
      mockPosts[postIndex].updatedAt = new Date().toISOString();

      return new Response(
        JSON.stringify({ msg: "Cập nhật thành công!", newPost: mockPosts[postIndex] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ========== DELETE POST ==========
  if (urlStr.includes("/api/post/") && method === "DELETE") {
    const postId = urlStr.split("/api/post/")[1].split("/")[0];
    const index = mockPosts.findIndex((p) => p._id === postId);
    if (index !== -1) {
      mockPosts.splice(index, 1);
      return new Response(
        JSON.stringify({ msg: "Đã xóa bài viết!" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ========== LIKE POST ==========
  if (urlStr.includes("/like") && method === "PATCH") {
    const postId = urlStr.split("/api/post/")[1].split("/")[0];
    
    // Tìm post trong tất cả các mảng
    let post = mockPosts.find((p) => p._id === postId);
    if (!post) post = mockOtherUserPosts.find((p) => p._id === postId);
    if (!post) post = mockOtherUser2Posts.find((p) => p._id === postId);
    
    if (post) {
      post.likes.push({ _id: mockCurrentUser._id });
      return new Response(
        JSON.stringify({ msg: "Liked!" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ========== UNLIKE POST ==========
  if (urlStr.includes("/unlike") && method === "PATCH") {
    const postId = urlStr.split("/api/post/")[1].split("/")[0];
    
    // Tìm post trong tất cả các mảng
    let post = mockPosts.find((p) => p._id === postId);
    if (!post) post = mockOtherUserPosts.find((p) => p._id === postId);
    if (!post) post = mockOtherUser2Posts.find((p) => p._id === postId);
    
    if (post) {
      post.likes = post.likes.filter((like) => like._id !== mockCurrentUser._id);
      return new Response(
        JSON.stringify({ msg: "Unliked!" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ========== CREATE COMMENT ==========
  if (urlStr.includes("/api/comment") && method === "POST") {
    const body = JSON.parse(options.body);
    const { postId, content } = body;

    // Tìm post trong tất cả các mảng
    let post = mockPosts.find((p) => p._id === postId);
    if (!post) post = mockOtherUserPosts.find((p) => p._id === postId);
    if (!post) post = mockOtherUser2Posts.find((p) => p._id === postId);

    if (post) {
      const newComment = {
        _id: `comment_${Date.now()}`,
        content,
        user: {
          _id: mockCurrentUser._id,
          fullname: mockCurrentUser.fullname,
          avatar: mockCurrentUser.avatar,
        },
        createdAt: new Date().toISOString(),
      };
      post.comments.push(newComment);

      return new Response(
        JSON.stringify({ newComment }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ========== DELETE COMMENT ==========
  if (urlStr.includes("/api/comment/") && method === "DELETE") {
    return new Response(
      JSON.stringify({ msg: "Đã xóa comment!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== GET FRIENDS ==========
  if (urlStr.includes("/api/user/friends")) {
    return new Response(
      JSON.stringify({ friends: mockCurrentUser.followers }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== SAVE/UNSAVE POST ==========
  if (urlStr.includes("/savePost") || urlStr.includes("/unSavePost")) {
    return new Response(
      JSON.stringify({ msg: "Success!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== HIDE/REPORT POST ==========
  if (urlStr.includes("/hide") || urlStr.includes("/report")) {
    return new Response(
      JSON.stringify({ msg: "Success!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== LOGOUT ==========
  if (urlStr.includes("/api/logout")) {
    return new Response(
      JSON.stringify({ msg: "Đăng xuất thành công!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ========== MẶC ĐỊNH: GỌI API THẬT ==========
  console.log("➡️ Calling real API:", urlStr);
  return originalFetch(url, options);
};

console.log("✅ Mock API đã được bật! Tất cả request sẽ trả về mock data.");
console.log("🎭 Current Mock User:", mockCurrentUser.fullname);
console.log("📝 Mock Posts:", mockPosts.length, "posts");
console.log("👥 Available Mock Users:");
console.log("   - mock_user_001 (Vũ Ly) - Current User");
console.log("   - mock_user_002 (Phạm Gia Linh)");
console.log("   - mock_user_003 (Nguyễn Minh Tuấn)");
console.log("💡 Test URLs:");
console.log("   - /profile/me (Your profile)");
console.log("   - /profile/mock_user_002 (Phạm Gia Linh's profile)");
console.log("   - /profile/mock_user_003 (Nguyễn Minh Tuấn's profile)");