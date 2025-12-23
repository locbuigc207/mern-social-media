import { request } from "./request";
import { isDevelopment } from "../config";

// Mock user cho giai đoạn development
const mockCurrentUser = {
  _id: "dev_user_001",
  username: "dev_user",
  fullname: "Developer User",
  avatar: "https://i.pravatar.cc/150?img=1",
  email: "dev@example.com",
};

// Mock danh sách bạn bè
const mockFriends = [
  {
    _id: "friend_001",
    username: "nguyen_van_a",
    fullname: "Nguyễn Văn A",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    _id: "friend_002",
    username: "tran_thi_b",
    fullname: "Trần Thị B",
    avatar: "https://i.pravatar.cc/150?img=3",
  },
  {
    _id: "friend_003",
    username: "le_van_c",
    fullname: "Lê Văn C",
    avatar: "https://i.pravatar.cc/150?img=4",
  },
  {
    _id: "friend_004",
    username: "pham_thi_d",
    fullname: "Phạm Thị D",
    avatar: "https://i.pravatar.cc/150?img=5",
  },
  {
    _id: "friend_005",
    username: "hoang_van_e",
    fullname: "Hoàng Văn E",
    avatar: "https://i.pravatar.cc/150?img=6",
  },
];

// Mock lời mời kết bạn
const mockFriendRequests = [
  {
    _id: "request_001",
    username: "do_thi_f",
    fullname: "Đỗ Thị F",
    avatar: "https://i.pravatar.cc/150?img=7",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "request_002",
    username: "vu_van_g",
    fullname: "Vũ Văn G",
    avatar: "https://i.pravatar.cc/150?img=8",
    createdAt: new Date().toISOString(),
  },
];

// Mock response cho sendFriendRequest
const mockSendFriendRequestResponse = {
  success: true,
  message: "Lời mời đã được gửi!",
  data: {
    _id: "mock_request_001",
    sender: mockCurrentUser,
    receiverId: "target_user_id",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
};

//LẤY USER HIỆN TẠI
export const getCurrentUser = async () => {
  return request("/api/user/me");
};
//GET USER BY ID
export const getUserById = async (id) => {
  return request(`/api/user/${id}`);
};

// TÌM KIẾM
export const searchUsers = (query) => {
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "");
  return request(`/api/search?username=${encodeURIComponent(safeQuery)}`);
};

//! FOLLOW
// LẤY DANH SÁCH NGƯỜI MÌNH THEO DÕI
export const getFollowing = async (userId) => {
  // return { friends: mockFriends };
  const url = userId ? `/api/user/${userId}/following` : `/api/user/following`;
  return request(url);
};

export const getFollowers = async (userId) => {
  const url = userId ? `/api/user/${userId}/followers` : `/api/user/followers`;
  return request(url);
};

export const followUser = async (userId) => {
  return request(`/api/user/${userId}/follow`, {
    method: "PATCH",
  });
};

// 4. Hủy theo dõi
export const unfollowUser = async (userId) => {
  return request(`/api/user/${userId}/unfollow`, {
    method: "PATCH",
  });
};

export const getSuggestions = async (num = 10) => {
  return request(`/api/suggestionsUser?num=${num}`);
};

// CHẶN NGƯỜI DÙNG
export const blockUser = async (userId) => {
  return request(`/api/user/${userId}/block`, {
    method: "POST",
  });
};

// BỎ CHẶN NGƯỜI DÙNG
export const unblockUser = async (userId) => {
  return request(`/api/user/${userId}/unblock`, {
    method: "DELETE",
  });
};

// LẤY DANH SÁCH NGƯỜI BỊ CHẶN
export const getBlockedUsers = async () => {
  return request("/api/blocked-users");
};

// KIỂM TRA ĐÃ CHẶN NGƯỜI DÙNG CHƯA
export const checkBlocked = async (userId) => {
  return request(`/api/user/${userId}/check-blocked`);
};

// BÁO CÁO NGƯỜI DÙNG
export const reportUser = async (userId, reason, description) => {
  return request(`/api/user/${userId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason, description }),
  });
};

//UPDATE THÔNG TIN USER
export const updateUser = async (formData) => {
  return request("/api/user", {
    method: "PATCH",
    headers: {
      "Content-Type": undefined,
    },
    body: formData,
  });
};

//PRIVACY SETTING
export const getPrivacySettings = async () => {
  return request("/api/privacy-settings");
};
export const updatePrivacySettings = async (settings) => {
  return request("/api/privacy-settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
};
