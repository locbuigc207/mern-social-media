// src/api/admin.js
import { request } from "./request";

const ADMIN_API = "/api";

// DASHBOARD STATS - Gọi song song các API để thống kê
export const getDashboardStats = async () => {
  try {
    const [users, posts, comments, likes, spam] = await Promise.all([
      request(`${ADMIN_API}/get_total_users`),
      request(`${ADMIN_API}/get_total_posts`),
      request(`${ADMIN_API}/get_total_comments`),
      request(`${ADMIN_API}/get_total_likes`),
      request(`${ADMIN_API}/get_total_spam_posts`),
    ]);

    return {
      total_users: users.total_users,
      total_posts: posts.total_posts,
      total_comments: comments.total_comments,
      total_likes: likes.total_likes,
      total_spam_posts: spam.total_spam_posts,
    };
  } catch (error) {
    throw error;
  }
};

// USERS MANAGEMENT
export const usersApi = {
  // Lấy danh sách users (có phân trang, search)
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${ADMIN_API}/users?${query}`);
  },

  // Lấy 1 user
  getOne: (userId) => request(`${ADMIN_API}/user/${userId}`),

  // Block user
  block: (userId, reason) =>
    request(`${ADMIN_API}/admin/user/${userId}/block`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  //Unblock user
  unblock: (userId) =>
    request(`${ADMIN_API}/admin/user/${userId}/unblock`, {
      method: "POST",
    }),
};

//  SPAM POSTS
export const spamPostsApi = {
  // Lấy danh sách spam posts
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${ADMIN_API}/get_spam_posts?${query}`);
  },
  // Xóa spam post
  delete: (postId) =>
    request(`${ADMIN_API}/delete_spam_posts/${postId}`, {
      method: "DELETE",
    }),

  // Xem chi tiết post
  getOne: (postId) => request(`${ADMIN_API}/spam_post/${postId}`),
};

//Thông báo
export const notificationsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${ADMIN_API}/notifications?${query}`);
  },
  getOne: (id) => request(`${ADMIN_API}/notification/${id}`),
};

// SPAM COMMENTS
export const spamCommentsApi = {
  getAll: () => request(`${ADMIN_API}/get_spam-comments`),
  delete: (commentId) =>
    request(`${ADMIN_API}/spam-comments/${commentId}`, {
      method: "DELETE",
    }),
};

// REPORTS
export const reportsApi = {
  // params:
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${ADMIN_API}/reports?${query}`);
  },

  getOne: (reportId) => request(`${ADMIN_API}/report/${reportId}`),

  accept: (reportId, data) =>
    request(`${ADMIN_API}/report/${reportId}/accept`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  decline: (reportId, data) =>
    request(`${ADMIN_API}/report/${reportId}/decline`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ANALYTICS
export const analyticsApi = {
  // params: { startDate, endDate }
  getSiteAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();

    return request(`${ADMIN_API}/analytics?${query}`);
  },
};

// RECENT ACTIVITIES
export const activitiesApi = {
  // params: { limit }
  getRecent: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`${ADMIN_API}/recent_activities?${query}`);
  },
};

export default {
  getDashboardStats,
  usersApi,
  spamPostsApi,
  spamCommentsApi,
  reportsApi,
  notificationsApi,
};
