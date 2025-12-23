import { useState, useEffect } from "react";
import { FiHeart, FiTrash2 } from "react-icons/fi";
import { likeComment, unLikeComment, deleteComment } from "../../api/comment";
import { Link } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";

//TODO Xử lý thời gian (<24h: hiện giờ; quá 24h: hiện ngày)
const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000;

  if (diff < 60) {
    return "Vừa xong";
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} phút trước`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} giờ trước`;
  } else {
    return date.toLocaleDateString("vi-VN");
  }
};

export default function CommentItem({
  comment,
  post,
  currentUser,
  onDeleteSuccess,
}) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likes?.length || 0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  //TODO Kiểm tra quyền xóa: Chủ comment HOẶC Chủ bài viết đều xóa được
  const isOwner =
    currentUser?._id === comment.user?._id ||
    currentUser?._id === post.user?._id;

  useEffect(() => {
    if (comment.likes && currentUser) {
      setLiked(comment.likes.includes(currentUser._id));
    }
  }, [comment.likes, currentUser]);

  //TODO Like/Unlike Comment
  const handleLike = async () => {
    if (!currentUser) return alert("Vui lòng đăng nhập");

    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(newLiked ? likesCount + 1 : likesCount - 1);

    try {
      if (newLiked) {
        await likeComment(comment._id);
      } else {
        await unLikeComment(comment._id);
      }
    } catch (err) {
      setLiked(!newLiked);
      setLikesCount(newLiked ? likesCount - 1 : likesCount + 1);
      console.error(err);
    }
  };

  //TODO DELETE Comment
  const handleDelete = async () => {
    try {
      await deleteComment(comment._id);
      onDeleteSuccess(comment._id);
      setIsDeleteModalOpen(false);
    } catch (err) {
      alert(err.message || "Lỗi khi xóa bình luận");
    }
  };

  return (
    <div className="flex gap-2 items-start group">
      <Link to={`/profile/${comment.user?._id}`}>
        <img
          src={comment.user?.avatar || "/avatar.png"}
          className="w-8 h-8 rounded-full object-cover mt-1 cursor-pointer"
          alt="avatar"
        />
      </Link>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          {/* Nội dung comment */}
          <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block relative pr-8">
            <Link to={`/profile/${comment.user?._id}`}>
              <p className="font-semibold text-sm text-gray-900 hover:underline cursor-pointer">
                {comment.user?.fullname || "Người dùng"}
              </p>
            </Link>
            <p className="text-sm text-gray-800 wrap-break-word">
              {comment.content}
            </p>

            {/* Nút Like nhỏ bên cạnh */}
            <div
              className="absolute -right-4 bottom-1 bg-white rounded-full p-1 shadow-sm border text-[10px] flex items-center gap-1 cursor-pointer"
              onClick={handleLike}
            >
              <FiHeart
                className={
                  liked ? "fill-red-500 text-red-500" : "text-gray-400"
                }
              />
              {likesCount > 0 && <span>{likesCount}</span>}
            </div>
          </div>
        </div>

        {/* Footer: Time, Delete */}
        <div className="flex items-center gap-4 mt-1 ml-2 text-xs text-gray-500">
          <span>{formatTime(comment.createdAt)}</span>

          <button
            onClick={handleLike}
            className={`font-semibold hover:underline ${
              liked ? "text-red-500" : ""
            }`}
          >
            Thích
          </button>

          {isOwner && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-gray-500 hover:text-red-600 flex items-center gap-1"
            >
              <FiTrash2 /> Xóa
            </button>
          )}
        </div>
      </div>

      {/* Modal xác nhận xóa  */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xóa bình luận?"
        message="Bạn có chắc chắn muốn xóa bình luận này không?"
        confirmText="Xóa"
        cancelText="Hủy"
        isDanger={true}
      />
    </div>
  );
}
