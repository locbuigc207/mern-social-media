import { request } from "./request";
import { isDevelopment } from "../config";
import { mockPosts } from "../data/mockData";

const POST_API = "/api";

//!==============================================================
//! -------------------THÊM SỬA XOÁ ĐỌC-------------------------
//!==============================================================
// TODO (CREATE POST)
export const createPost = async (postData) => {
  // if (isDevelopment) {
  //   const content = postData.get("content");
  //   const files = postData.getAll("files");
  //   const newPost = {
  //     _id: `post_${Date.now()}`,
  //     content: content,
  //     images: files.map((file) => ({
  //       url: URL.createObjectURL(file),
  //       publicId: `mock_img_${Date.now()}`,
  //     })),
  //     user: {
  //       _id: "dev_user_001",
  //       username: "dev_user",
  //       fullname: "Developer User",
  //       avatar: "https://i.pravatar.cc/150?img=1",
  //     },
  //     likes: [],
  //     comments: [],
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //   };
  //   mockPosts.unshift(newPost);
  //   return { msg: "Đăng bài thành công!", newPost };
  // }

  return request(`${POST_API}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": undefined,
    },
    body: postData,
  });
};

// TODO (UPDATE POST)
export const updatePost = async (id, postData) => {
  return request(`${POST_API}/post/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": undefined,
    },
    body: postData,
  });
};

// TODO (GET ALL POSTS)
export const getPosts = async () => {
  return request(`${POST_API}/posts`, {
    method: "GET",
  });
};

// TODO (GET USER POSTS)
export const getUserPosts = (userId) =>
  request(`${POST_API}/user_posts/${userId}`, {
    method: "GET",
  });

// TODO (GET 1 POST)
export const getPost = (id) =>
  request(`${POST_API}/post/${id}`, {
    method: "GET",
  });
// TODO (DELETE POST)
export const deletePost = async (id) => {
  // if (isDevelopment) {
  //   const index = mockPosts.findIndex((p) => p._id === id);
  //   if (index !== -1) {
  //     mockPosts.splice(index, 1);
  //   }
  //   return { msg: "Đã xóa bài viết!" };
  // }

  return request(`${POST_API}/post/${id}`, {
    method: "DELETE",
  });
};
//!==============================================================
//! -------------------LIKE, COMMENT ----------------------------
//!==============================================================
// TODO LIKE POST
export const likePost = async (id) => {
  return request(`${POST_API}/post/${id}/like`, {
    method: "PATCH",
  });
};

// TODO UNLIKE POST
export const unLikePost = async (id) => {
  return request(`${POST_API}/post/${id}/unlike`, {
    method: "PATCH",
  });
};
export const sharePost = (id, shareCaption) => {
  return request(`/api/post/${id}/share`, {
    method: "POST",

    body: JSON.stringify({ shareCaption }),
  });
};
//!==============================================================
//! -------------------SAVE, HIDE, REPORT -----------------------
//!==============================================================
// TODO SAVE POST
export const savePost = (id) =>
  request(`${POST_API}/savePost/${id}`, {
    method: "PATCH",
  });

// TODO UNSAVE POST
export const unSavePost = (id) =>
  request(`${POST_API}/unSavePost/${id}`, {
    method: "PATCH",
  });

// TODO GET SAVED POSTS
export const getSavedPosts = () =>
  request(`${POST_API}/getSavePosts`, {
    method: "GET",
  });

// TODO REPORT POST
export const reportPost = (id, data) =>
  request(`${POST_API}/post/${id}/report`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

//!==============================================================
//! ------------------- DISCOVER POST ----------------------------
//!==============================================================
// TODO DISCOVER POSTS
export const getDiscoverPosts = (num = 8) =>
  request(`${POST_API}/post_discover?num=${num}`, {
    method: "GET",
  });

//!==============================================================
//! ------------------- DRAFTS & SCHEDULE ----------------------------
//!==============================================================
// TODO DRAFT
export const getDrafts = () =>
  request(`${POST_API}/drafts`, {
    method: "GET",
  });

export const saveDraft = (postData) =>
  request(`${POST_API}/draft`, {
    method: "POST",
    headers: { "Content-Type": undefined },
    body: postData,
  });

export const updateDraft = (id, postData) =>
  request(`${POST_API}/draft/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": undefined },
    body: postData,
  });

export const deleteDraft = (id) =>
  request(`${POST_API}/draft/${id}`, {
    method: "DELETE",
  });

export const publishDraft = (id) =>
  request(`${POST_API}/draft/${id}/publish`, {
    method: "POST",
  });
//TODO SCHEDULED POST
export const getScheduledPosts = () =>
  request(`${POST_API}/scheduled-posts`, {
    method: "GET",
  });

export const schedulePost = (postData) =>
  request(`${POST_API}/schedule-post`, {
    method: "POST",
    headers: { "Content-Type": undefined },
    body: postData,
  });

export const updateScheduledPost = (id, postData) =>
  request(`${POST_API}/scheduled-post/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": undefined },
    body: postData,
  });

export const cancelScheduledPost = (id) =>
  request(`${POST_API}/scheduled-post/${id}/cancel`, {
    method: "POST",
  });
