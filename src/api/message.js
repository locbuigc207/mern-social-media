// src/api/message.js
import { request } from "./request";

// Lấy danh sách conversations
export const getConversations = async (limit = 10) => {
  return request(`/api/conversations?limit=${limit}`);
};

// Lấy tin nhắn theo user ID
export const getMessages = async (userId, page = 1) => {
  return request(`/api/message/${userId}?page=${page}`);
};

// Tạo tin nhắn mới (text only - backward compatibility)
export const createMessage = async (recipient, text, media = []) => {
  return request("/api/message", {
    method: "POST",
    body: JSON.stringify({ recipient, text, media }),
  });
};

// Tạo tin nhắn với ảnh/video (sử dụng FormData)
export const createMessageWithMedia = async (formData) => {
  return request("/api/message", {
    method: "POST",
    headers: {
      "Content-Type": undefined, // Let browser set content-type for FormData
    },
    body: formData,
  });
};

// Đánh dấu tin nhắn đã đọc
export const markAsRead = async (messageId) => {
  return request(`/api/message/${messageId}/read`, {
    method: "PATCH",
  });
};

// Đánh dấu tất cả tin nhắn từ 1 user đã đọc
export const markAllAsRead = async (userId) => {
  return request(`/api/messages/${userId}/read-all`, {
    method: "PATCH",
  });
};

// Lấy số lượng tin nhắn chưa đọc tổng
export const getUnreadCount = async () => {
  return request("/api/messages/unread/count");
};

// Lấy số lượng tin nhắn chưa đọc theo conversation
export const getUnreadByConversation = async (userId) => {
  return request(`/api/messages/${userId}/unread`);
};

// Xóa tin nhắn
export const deleteMessage = async (messageId) => {
  return request(`/api/message/${messageId}`, {
    method: "DELETE",
  });
};

// Xóa conversation
export const deleteConversation = async (userId) => {
  return request(`/api/conversation/${userId}`, {
    method: "DELETE",
  });
};