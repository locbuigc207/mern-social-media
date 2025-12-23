import { request } from "./request";

const COMMENT_API = "/api/comment";

//TODO CREATE COMMENT
export const createComment = (data) => {
  // { postId, content, tag, reply, postUserId }
  return request(`${COMMENT_API}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

//TODO UPDATE
export const updateComment = ({ commentId, content }) => {
  return request(`${COMMENT_API}/${commentId}`, {
    method: "PATCH",
    data: { content },
  });
};

//TODO LIKE
export const likeComment = (commentId) => {
  return request(`${COMMENT_API}/${commentId}/like`, {
    method: "PATCH",
  });
};

//TODO UNLIKE
export const unLikeComment = (commentId) => {
  return request(`${COMMENT_API}/${commentId}/unlike`, {
    method: "PATCH",
  });
};

//TODO DELETE
export const deleteComment = (commentId) => {
  return request(`${COMMENT_API}/${commentId}`, {
    method: "DELETE",
  });
};
