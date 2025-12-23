// src/api/story.js
import { request } from "./request";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ✅ Tạo story mới
export const createStory = async (formData) => {
  try {
    const token = localStorage.getItem("access_token");
    
    const response = await fetch(`${API_URL}/api/story`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || "Failed to create story");
    }

    return data;
  } catch (error) {
    console.error("Create story error:", error);
    throw error;
  }
};

// ✅ Lấy stories feed (following + own)
export const getStoriesFeed = async () => {
  return request("/api/stories/feed", {
    method: "GET",
  });
};

// ✅ Lấy stories của 1 user
export const getUserStories = async (userId) => {
  return request(`/api/stories/user/${userId}`, {
    method: "GET",
  });
};

// ✅ Xem story
export const viewStory = async (storyId) => {
  return request(`/api/story/${storyId}/view`, {
    method: "POST",
  });
};

// ✅ Reply story (gửi tin nhắn trực tiếp) - CHỈ GIỮ CÁI NÀY
export const replyToStory = async (storyId, text, recipientId) => {
  const token = localStorage.getItem("access_token");
  
  const response = await fetch(`${API_URL}/api/message/story-reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      recipient: recipientId,
      text: text,
      storyId: storyId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to send reply");
  }

  return data;
};

// ✅ Like/Unlike story
export const likeStory = async (storyId) => {
  return request(`/api/story/${storyId}/like`, {
    method: "POST",
  });
};

// ✅ Get story likes (owner only)
export const getStoryLikes = async (storyId) => {
  return request(`/api/story/${storyId}/likes`, {
    method: "GET",
  });
};

// ✅ Xóa story
export const deleteStory = async (storyId) => {
  return request(`/api/story/${storyId}`, {
    method: "DELETE",
  });
};

// ✅ Thêm vào highlights
export const addToHighlight = async (storyId, highlightName) => {
  return request(`/api/story/${storyId}/highlight`, {
    method: "POST",
    body: JSON.stringify({ highlightName }),
  });
};

// ✅ Lấy highlights
export const getHighlights = async (userId) => {
  return request(`/api/stories/highlights/${userId}`, {
    method: "GET",
  });
};

// ✅ Lấy views của story
export const getStoryViews = async (storyId) => {
  return request(`/api/story/${storyId}/views`, {
    method: "GET",
  });
};