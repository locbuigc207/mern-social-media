// Mock data for development/testing

export const mockFriendRequests = [
  {
    id: 1,
    user: {
      id: "user1",
      fullname: "Nguyễn Văn A",
      username: "nguyenvana",
      avatar: "https://i.pravatar.cc/150?img=1",
    },
    mutualFriends: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    user: {
      id: "user2",
      fullname: "Trần Thị B",
      username: "tranthib",
      avatar: "https://i.pravatar.cc/150?img=2",
    },
    mutualFriends: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    user: {
      id: "user3",
      fullname: "Lê Văn C",
      username: "levanc",
      avatar: "https://i.pravatar.cc/150?img=3",
    },
    mutualFriends: 8,
    createdAt: new Date().toISOString(),
  },
];

export const mockFriends = [
  {
    id: "friend1",
    fullname: "Phạm Thị D",
    username: "phamthid",
    avatar: "https://i.pravatar.cc/150?img=4",
  },
  {
    id: "friend2",
    fullname: "Hoàng Văn E",
    username: "hoangvane",
    avatar: "https://i.pravatar.cc/150?img=5",
  },
];

export const mockSuggestions = [
  {
    id: "sug1",
    fullname: "Vũ Thị F",
    username: "vuthif",
    avatar: "https://i.pravatar.cc/150?img=6",
    mutualFriends: 12,
  },
  {
    id: "sug2",
    fullname: "Đặng Văn G",
    username: "dangvang",
    avatar: "https://i.pravatar.cc/150?img=7",
    mutualFriends: 7,
  },
];

export const mockPosts = [
  {
    _id: "post_001",
    content: "Hôm nay trời đẹp quá! 🌞 Đi cafe với bạn bè thật vui.",
    images: ["https://picsum.photos/seed/post1/600/400"],
    user: {
      _id: "dev_user_001",
      username: "dev_user",
      fullname: "Developer User",
      avatar: "https://i.pravatar.cc/150?img=1",
    },
    likes: ["friend_001", "friend_002"],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 phút trước
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    _id: "post_002",
    content: "Vừa hoàn thành dự án mới! 🎉 Cảm ơn team đã cùng nhau cố gắng.",
    images: [],
    user: {
      _id: "friend_001",
      username: "nguyen_van_a",
      fullname: "Nguyễn Văn A",
      avatar: "https://i.pravatar.cc/150?img=2",
    },
    likes: ["dev_user_001"],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 giờ trước
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    _id: "post_003",
    content: "Review quán ăn mới gần công ty, đồ ăn ngon và giá cả hợp lý 👍",
    images: [
      "https://picsum.photos/seed/food1/600/400",
      "https://picsum.photos/seed/food2/600/400",
    ],
    user: {
      _id: "friend_002",
      username: "tran_thi_b",
      fullname: "Trần Thị B",
      avatar: "https://i.pravatar.cc/150?img=3",
    },
    likes: ["dev_user_001", "friend_001", "friend_003"],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 giờ trước
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    _id: "post_004",
    content: "Cuối tuần rồi! Ai có plan gì chưa? 🎈",
    images: [],
    user: {
      _id: "friend_003",
      username: "le_van_c",
      fullname: "Lê Văn C",
      avatar: "https://i.pravatar.cc/150?img=4",
    },
    likes: [],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 ngày trước
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    _id: "post_005",
    content: "Chia sẻ một số tips học lập trình hiệu quả:\n1. Code mỗi ngày\n2. Đọc code người khác\n3. Làm project thực tế\n4. Tham gia cộng đồng",
    images: ["https://picsum.photos/seed/coding/600/400"],
    user: {
      _id: "friend_004",
      username: "pham_thi_d",
      fullname: "Phạm Thị D",
      avatar: "https://i.pravatar.cc/150?img=5",
    },
    likes: ["dev_user_001", "friend_001", "friend_002", "friend_003", "friend_005"],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 ngày trước
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const mockNotifications = [
  {
    _id: "notif_001",
    type: "like",
    sender: {
      _id: "friend_001",
      username: "nguyen_van_a",
      fullname: "Nguyễn Văn A",
      avatar: "https://i.pravatar.cc/150?img=2",
    },
    post: { _id: "post_001" },
    text: "đã thích bài viết của bạn",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 phút trước
  },
  {
    _id: "notif_002",
    type: "comment",
    sender: {
      _id: "friend_002",
      username: "tran_thi_b",
      fullname: "Trần Thị B",
      avatar: "https://i.pravatar.cc/150?img=3",
    },
    post: { _id: "post_001" },
    text: "đã bình luận về bài viết của bạn",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 phút trước
  },
  {
    _id: "notif_003",
    type: "friend_request",
    sender: {
      _id: "request_001",
      username: "do_thi_f",
      fullname: "Đỗ Thị F",
      avatar: "https://i.pravatar.cc/150?img=7",
    },
    text: "đã gửi lời mời kết bạn",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 phút trước
  },
  {
    _id: "notif_004",
    type: "friend_accept",
    sender: {
      _id: "friend_003",
      username: "le_van_c",
      fullname: "Lê Văn C",
      avatar: "https://i.pravatar.cc/150?img=4",
    },
    text: "đã chấp nhận lời mời kết bạn",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 giờ trước
  },
  {
    _id: "notif_005",
    type: "like",
    sender: {
      _id: "friend_004",
      username: "pham_thi_d",
      fullname: "Phạm Thị D",
      avatar: "https://i.pravatar.cc/150?img=5",
    },
    post: { _id: "post_003" },
    text: "đã thích bài viết của bạn",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 giờ trước
  },
  {
    _id: "notif_006",
    type: "mention",
    sender: {
      _id: "friend_005",
      username: "hoang_van_e",
      fullname: "Hoàng Văn E",
      avatar: "https://i.pravatar.cc/150?img=6",
    },
    post: { _id: "post_002" },
    text: "đã nhắc đến bạn trong một bình luận",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 ngày trước
  },
];