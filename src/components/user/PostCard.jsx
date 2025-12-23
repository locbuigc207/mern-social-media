import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiMoreHorizontal,
  FiTrash2,
  FiBookmark,
  FiFlag,
  FiEyeOff,
  FiSend,
  FiX,
  FiImage,
  FiAlertTriangle,
} from "react-icons/fi";
import {
  likePost,
  unLikePost,
  deletePost,
  savePost,
  unSavePost,
  updatePost,
} from "../../api/post";
import { createComment } from "../../api/comment";
import { getCurrentUser } from "../../api/user";
import ConfirmModal from "../user/ConfirmModal";
import CommentItem from "./CommentItem";
import ReportPostModal from "./ReportPostModal";
import SharePostModal from "./SharePostModal";

export default function PostCard({ post, onUpdate, onDelete, onUnSave }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const fileInputRef = useRef(null);

  // State
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [isSaved, setIsSaved] = useState(false);

  const [comments, setComments] = useState(post.comments || []);
  const [commentContent, setCommentContent] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [keptImages, setKeptImages] = useState(post.images || []);
  const [newImages, setNewImages] = useState([]);
  const [newImagesPreview, setNewImagesPreview] = useState([]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // Menu & Modals
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  //STATE CHO REPORT
  const [isReportPostModalOpen, setIsReportPostModalOpen] = useState(false);

  // Lấy thông tin User hiện tại và check trạng thái Like/Save
  useEffect(() => {
    const fetchUserAndStatus = async () => {
      try {
        const res = await getCurrentUser();
        const user = res.user || res;
        setCurrentUser(user);
        const likesArray = post.likes || [];

        const isLiked = likesArray.some((like) => {
          const likeId = like._id ? like._id : like;

          return String(likeId) === String(user._id);
        });
        if (isLiked) {
          setLiked(true);
        }
        if (user.saved && user.saved.includes(post._id)) {
          setIsSaved(true);
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin user:", err);
      }
    };
    if (post && post.likes) {
      fetchUserAndStatus();
    }
  }, [post._id, post.likes]);

  //Đồng bộ khi post thay đổi (content, image hoặc comment)
  useEffect(() => {
    if (post.comments) {
      setComments(post.comments);
    }
    if (!isEditing) {
      setEditContent(post.content);
      setKeptImages(post.images || []);
      setNewImages([]);
      setNewImagesPreview([]);
    }
  }, [post, isEditing]);

  const isOwner = currentUser && post.user._id === currentUser._id;

  //! CÁC HÀM XỬ LÝ
  //TODO UPDATE
  //1. XỬ lý ảnh (chọn ảnh mới)
  const handleSelectNewImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Lưu file để gửi lên server
    setNewImages((prev) => [...prev, ...files]);

    // Tạo preview URL
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setNewImagesPreview((prev) => [...prev, ...newPreviews]);
  };

  //2. Xoá ảnh cũ
  const handleRemoveOldImage = (indexToRemove) => {
    setKeptImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };
  //3. Xoá ảnh mới
  const handleRemoveNewImage = (indexToRemove) => {
    setNewImages((prev) => prev.filter((_, i) => i !== indexToRemove));
    setNewImagesPreview((prev) => {
      // Revoke URL để tránh leak memory
      URL.revokeObjectURL(prev[indexToRemove]);
      return prev.filter((_, i) => i !== indexToRemove);
    });
  };
  const handleUpdatePost = async () => {
    if (
      !editContent.trim() &&
      keptImages.length === 0 &&
      newImages.length === 0
    ) {
      return alert("Bài viết phải có nội dung hoặc hình ảnh!");
    }

    setIsUpdating(true); //Bắt đầu loading
    try {
      //FormData để gửi file+text
      const formData = new FormData();
      formData.append("content", editContent);

      formData.append("existingImages", JSON.stringify(keptImages));

      // Gửi file ảnh MỚI
      newImages.forEach((file) => {
        formData.append("files", file);
      });
      //Gọi API Update
      const res = await updatePost(post._id, formData);

      const updatedPostData = res.newPost || res.data?.newPost || res;

      if (onUpdate) {
        onUpdate(updatedPostData);
      }
      setIsEditing(false);

      // Reset state ảnh mới để tránh bị lưu đè lần sau
      setNewImages([]);
      setNewImagesPreview([]);
    } catch (err) {
      alert(err.response?.data?.msg || "Lỗi khi cập nhật bài viết");
    } finally {
      setIsUpdating(true);
    }
  };
  //TODO LIKE
  const handleLike = async () => {
    if (!currentUser) return alert("Vui lòng đăng nhập!");

    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);

    try {
      if (liked) {
        await unLikePost(post._id);
        console.log("Unlike thành công");
      } else {
        await likePost(post._id);
        console.log("Like thành công");
      }
    } catch (err) {
      setLiked(liked);
      setLikesCount(liked ? likesCount : likesCount);
      alert(err.response?.data?.msg || "Lỗi tương tác");
    }
  };

  //TODO DELETE
  const confirmDelete = async () => {
    try {
      await deletePost(post._id);
      setIsDeleteModalOpen(false);
      onDelete?.(post._id);
    } catch (err) {
      alert(err.response?.data?.msg || "Lỗi khi xóa bài");
    }
  };

  //TODO SAVE
  const handleSave = async () => {
    try {
      if (isSaved) {
        await unSavePost(post._id);
        setIsSaved(false);
        alert("Đã bỏ lưu bài viết.");
        if (onUnSave) {
          onUnSave(post._id);
        }
      } else {
        await savePost(post._id);
        setIsSaved(true);
        alert("Đã lưu bài viết vào bộ sưu tập.");
      }
      setShowMenu(false);
    } catch (err) {
      alert(err.response?.data?.msg || "Lỗi khi lưu bài");
    }
  };

  //TODO COMMENT
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    console.log("Check Post Info:", {
      id: post?._id,
      user: post?.user?._id,
      content: commentContent,
    });
    if (!post?._id) {
      return alert("Lỗi: Không tìm thấy ID bài viết!");
    }
    setIsSubmitting(true);
    try {
      // Gọi API
      const res = await createComment({
        postId: post._id,
        content: commentContent,
        postUserId: post.user._id,
      });

      if (res.newComment) {
        const commentWithUserInfo = {
          ...res.newComment,
          user: currentUser,
        };
        setComments([...comments, commentWithUserInfo]);
        setCommentContent("");
        setShowAllComments(true);
      } else {
        console.warn("API không trả về newComment:", res);
      }
    } catch (err) {
      alert(err.response?.data?.msg || "Lỗi khi bình luận");
    } finally {
      setIsSubmitting(false);
    }
  };
  //TODO DELETE COMMENT
  const handleDeleteCommentSuccess = (deletedCommentId) => {
    setComments(comments.filter((c) => c._id !== deletedCommentId));
  };
  const commentsToShow = showAllComments ? comments : comments.slice(0, 2);

  //TODO RENDER ẢNH
  const renderImages = (images) => {
    if (!images || images.length === 0) return null;
    return (
      <div
        className={`grid gap-1 mt-2 rounded-lg overflow-hidden ${
          images.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {images.map((img, i) => (
          <img
            key={img.publicId || img.url || `img-${i}`}
            src={img.url}
            alt=""
            className="w-full h-64 object-cover bg-gray-100 border border-gray-100"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={post.user.avatar || "/avatar.png"}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-gray-100"
          />
          <div>
            <p className="font-semibold text-gray-900">{post.user.fullname}</p>
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
        {/* MENU 3 CHẤM */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <FiMoreHorizontal />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              ></div>
              <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 w-56 z-20 overflow-hidden py-1">
                {/* Nút Lưu bài viết */}
                <button
                  onClick={handleSave}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 transition text-sm"
                >
                  <FiBookmark className={isSaved ? "fill-current" : ""} />
                  {isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
                </button>

                {/* Nút Báo cáo */}
                <button
                  onClick={() => {
                    setIsReportPostModalOpen(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 transition text-sm"
                >
                  <FiFlag /> Báo cáo vi phạm
                </button>

                {/* Nút Xóa + Sửa(Chỉ Owner mới thấy) */}
                {isOwner && (
                  <div>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 transition text-sm border-t"
                    >
                      <FiTrash2 /> Sửa bài viết
                    </button>
                    <button
                      onClick={() => {
                        setIsDeleteModalOpen(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 transition text-sm border-t"
                    >
                      <FiTrash2 /> Xóa bài viết
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nội dung */}
      <div className="mt-3">
        {isEditing ? (
          // Giao diện khi đang sửa
          <div className="animate-fadeIn">
            <textarea
              className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              rows="4"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Bạn đang nghĩ gì?"
            />
            {/* 2. Quản lý ảnh */}
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Hình ảnh:</p>

              {/* Grid hiển thị ảnh */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                {/* Ảnh cũ (keptImages) */}
                {keptImages.map((img, idx) => (
                  <div
                    key={img.publicId || img.url || idx}
                    className="relative group aspect-square"
                  >
                    <img
                      src={img.url}
                      alt="old"
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => handleRemoveOldImage(idx)}
                      className="absolute top-1 right-1 bg-gray-800/70 text-white p-1 rounded-full hover:bg-red-600 transition"
                      title="Xóa ảnh này"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}

                {/* Ảnh mới (newImagesPreview) */}
                {newImagesPreview.map((src, idx) => (
                  <div
                    key={`new-${idx}`}
                    className="relative group aspect-square"
                  >
                    <img
                      src={src}
                      alt="new"
                      className="w-full h-full object-cover rounded-lg border border-blue-300"
                    />
                    <button
                      onClick={() => handleRemoveNewImage(idx)}
                      className="absolute top-1 right-1 bg-gray-800/70 text-white p-1 rounded-full hover:bg-red-600 transition"
                      title="Hủy ảnh này"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}

                {/* Nút thêm ảnh */}
                <div
                  onClick={() => fileInputRef.current.click()}
                  className="flex flex-col items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 aspect-square transition"
                >
                  <FiImage className="text-2xl text-gray-500" />
                  <span className="text-xs text-gray-500 mt-1">Thêm ảnh</span>
                </div>
              </div>

              {/* Input file ẩn */}
              <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                onChange={handleSelectNewImages}
                className="hidden"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(post.content); // Reset về nội dung cũ
                  setKeptImages(post.images || []);
                  setNewImages([]);
                  setNewImagesPreview([]);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdatePost}
                disabled={isUpdating}
                className={`px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition flex items-center gap-2 ${
                  isUpdating ? "opacity-70 cursor-wait" : ""
                }`}
              >
                {isUpdating ? (
                  <>
                    {/* quá trình loading */}
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* TRƯỜNG HỢP 1: BÀI VIẾT ĐƯỢC CHIA SẺ */}
            {post.isShared && post.originalPost ? (
              <div className="space-y-3">
                {/* 1. Caption của người share */}
                {post.shareCaption && (
                  <p className="text-gray-800 whitespace-pre-wrap text-[15px]">
                    {post.shareCaption}
                  </p>
                )}

                {/* 2. Khung chứa bài gốc (Clickable) */}
                <div
                  className="border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Chuyển hướng đến bài viết gốc
                    navigate(`/post/${post.originalPost._id}`);
                  }}
                >
                  {/* Header bài gốc */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50/50 border-b border-gray-100">
                    <img
                      src={post.originalPost.user?.avatar || "/avatar.png"}
                      className="w-8 h-8 rounded-full object-cover"
                      alt=""
                    />
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        {post.originalPost.user?.fullname}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(
                          post.originalPost.createdAt
                        ).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {/* Nội dung bài gốc */}
                  <div className="p-3">
                    <p className="text-gray-800 text-sm whitespace-pre-wrap mb-2">
                      {post.originalPost.content}
                    </p>
                    {/* Ảnh bài gốc */}
                    {renderImages(post.originalPost.images)}
                  </div>
                </div>
              </div>
            ) : (
              // TRƯỜNG HỢP 2: BÀI VIẾT THƯỜNG
              <>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {post.content}
                </p>
                {renderImages(post.images)}
              </>
            )}
          </>
        )}
      </div>

      {/* Thống kê */}
      <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          {likesCount > 0 && (
            <>
              <div className="bg-blue-500 p-1 rounded-full">
                <FiHeart className="text-white fill-white text-[10px]" />
              </div>
              <span className="ml-1">{likesCount} lượt thích</span>
            </>
          )}
        </div>
        <div>
          <span>{post.comments.length} bình luận</span>
        </div>
      </div>

      {/* Hành động */}
      <div className="flex justify-around mt-3 pt-3 border-t">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            liked
              ? "text-blue-600 font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FiHeart className={liked ? "fill-blue-600" : ""} />
          Thích
        </button>

        <button
          onClick={() => setShowCommentInput(!showCommentInput)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            showCommentInput
              ? "text-blue-600 bg-blue-50"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FiMessageCircle />
          Bình luận
        </button>

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
        >
          <FiShare2 />
          Chia sẻ
        </button>
      </div>

      {/* FORM nhập bình luận */}
      {showCommentInput && (
        <form
          onSubmit={handleCommentSubmit}
          className="mt-4 flex items-start gap-2 animate-fadeIn"
        >
          <img
            src={currentUser?.avatar || "/avatar.png"}
            className="w-8 h-8 rounded-full border border-gray-200 object-cover"
            alt="my avatar"
          />
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Viết bình luận..."
              className="w-full bg-gray-100 rounded-full py-2 px-4 pr-10 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent focus:border-blue-500 transition-all"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                commentContent.trim()
                  ? "text-blue-600 hover:bg-blue-100"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              disabled={!commentContent.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FiSend className="transform rotate-0" />
              )}
            </button>
          </div>
        </form>
      )}

      {/* Bình luận preview */}
      {comments.length > 0 && (
        <div className="mt-3 space-y-2">
          {commentsToShow.map((c, index) => (
            <div key={c._id} className="flex gap-2">
              <CommentItem
                key={c?._id || index}
                comment={c}
                post={post}
                currentUser={currentUser}
                onDeleteSuccess={handleDeleteCommentSuccess}
              />
            </div>
          ))}
          {comments.length > 2 && (
            <p
              onClick={() => setShowAllComments(!showAllComments)}
              className="text-sm text-gray-500 cursor-pointer hover:underline ml-10 font-medium select-none"
            >
              {showAllComments
                ? "Ẩn bớt bình luận"
                : `Xem thêm ${comments.length - 2} bình luận`}
            </p>
          )}
        </div>
      )}

      {/* --- HIỂN THỊ MODAL --- */}
      {/* Modal Xóa */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Xóa bài viết?"
        message="Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        isDanger={true}
      />

      {/* Modal Report */}
      <ReportPostModal
        isOpen={isReportPostModalOpen}
        onClose={() => setIsReportPostModalOpen(false)}
        postId={post._id}
      />
      <SharePostModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={post}
        currentUser={currentUser}
      />
    </div>
  );
}
