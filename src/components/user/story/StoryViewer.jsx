// src/components/user/story/StoryViewer.jsx
import { useState, useEffect, useRef } from "react";
import { FiX, FiChevronLeft, FiChevronRight, FiHeart, FiSend, FiEye } from "react-icons/fi";
import { viewStory, replyToStory, likeStory, getStoryLikes, deleteStory } from "../../../api/story";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "react-hot-toast";

export default function StoryViewer({ userStories, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [storyStats, setStoryStats] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const progressInterval = useRef(null);
  const currentStory = userStories.stories[currentIndex];
  const currentUserId = localStorage.getItem("userId");
  const isOwnStory = currentStory.user._id === currentUserId;

  // Initialize like state
  useEffect(() => {
    if (currentStory) {
      const liked = currentStory.likes?.some(
        like => like.user === currentUserId || like.user._id === currentUserId
      );
      setIsLiked(liked || false);
      setLikesCount(currentStory.likes?.length || 0);
    }
  }, [currentIndex, currentStory, currentUserId]);

  // Auto progress
  useEffect(() => {
    if (!currentStory || isPaused) return;

    viewStory(currentStory._id).catch(console.error);

    const duration = currentStory.media.type === 'video' ? 15000 : 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    if (currentIndex < userStories.stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error("Vui lòng nhập tin nhắn");
      return;
    }

    try {
     
      
      await replyToStory(currentStory._id, replyText, userStories.user._id);
      
      setReplyText("");
      toast.success("Đã gửi tin nhắn!", {
        duration: 2000,
        icon: "💬",
      });
    } catch (error) {
      console.error("Reply error:", error);
      toast.error(error.message || "Không thể gửi phản hồi");
    }
  };

  const handleLike = async () => {
    try {
      const result = await likeStory(currentStory._id);
      setIsLiked(result.liked);
      setLikesCount(result.likesCount);
      
      
    } catch (error) {
      console.error("Like error:", error);
      toast.error("Không thể thích story");
    }
  };

  const handleShowStats = async () => {
    if (!isOwnStory) return;
    
    try {
      setIsPaused(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem("access_token");
      
      const [viewsData, likesData] = await Promise.all([
        fetch(`${API_URL}/api/story/${currentStory._id}/views`, {
          headers: { Authorization: token }
        }).then(r => r.json()),
        getStoryLikes(currentStory._id)
      ]);
      
      setStoryStats({
        views: viewsData.views || [],
        likes: likesData.likes || [],
        totalViews: viewsData.totalViews || 0,
        totalLikes: likesData.totalLikes || 0,
      });
      setShowStats(true);
    } catch (error) {
      console.error("Get stats error:", error);
      toast.error("Không thể tải thống kê");
    }
  };

  const handleDeleteStory = async () => {
    try {
      await deleteStory(currentStory._id);
      toast.success("Đã xóa story!");
      
      setShowDeleteConfirm(false);
      setIsPaused(false);
      
      //  Đóng modal sau khi xóa (không reload trang)
      setTimeout(() => {
        onClose();
      }, 100);
      
    } catch (error) {
      console.error("Delete story error:", error);
      toast.error("Không thể xóa story");
      setShowDeleteConfirm(false);
      setIsPaused(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white p-2 hover:bg-white/20 rounded-full"
      >
        <FiX className="text-2xl" />
      </button>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 z-10 text-white p-3 bg-black/30 hover:bg-black/50 rounded-full"
        >
          <FiChevronLeft className="text-2xl" />
        </button>
      )}

      {currentIndex < userStories.stories.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 z-10 text-white p-3 bg-black/30 hover:bg-black/50 rounded-full"
        >
          <FiChevronRight className="text-2xl" />
        </button>
      )}

      {/* Story Container */}
      <div
        className="relative w-full max-w-md h-screen bg-black"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {userStories.stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* User Info */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
          <img
            src={userStories.user.avatar}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
            alt={userStories.user.fullname}
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{userStories.user.fullname}</p>
            <p className="text-white/70 text-xs">
              {formatDistanceToNow(new Date(currentStory.createdAt), {
                addSuffix: true,
                locale: vi,
              })}
            </p>
          </div>

          {/* Owner Controls */}
          {isOwnStory && (
            <div className="flex gap-2">
              <button
                onClick={handleShowStats}
                className="flex items-center gap-1 text-white bg-black/30 px-3 py-1 rounded-full text-sm font-bold hover:bg-black/50 transition"
              >
                Thống kê
              </button>
              <button
                onClick={() => {
                  setIsPaused(true);
                  setShowDeleteConfirm(true);
                }}
                className="text-white bg-red-500/80 px-3 py-1 rounded-full text-sm font-bold hover:bg-red-600 transition"
              >
                Xóa
              </button>
            </div>
          )}
        </div>

        {/* Story Content */}
        <div className="w-full h-full flex items-center justify-center">
          {currentStory.media.type === 'image' ? (
            <img
              src={currentStory.media.url}
              className="w-full h-full object-contain"
              alt="story"
            />
          ) : (
            <video
              src={currentStory.media.url}
              className="w-full h-full object-contain"
              autoPlay
              onEnded={handleNext}
            />
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-24 left-0 right-0 p-4">
            <p className="text-white text-center drop-shadow-lg">{currentStory.caption}</p>
          </div>
        )}

        {/* Reply Box */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleReply()}
              placeholder="Gửi tin nhắn..."
              className="flex-1 bg-white/20 text-white placeholder-white/70 px-4 py-2 rounded-full outline-none"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className={`p-2 rounded-full transition ${
                replyText.trim() ? 'text-blue-400 hover:text-blue-300' : 'text-white/50'
              }`}
            >
              <FiSend className="text-xl" />
            </button>
            <button 
              onClick={handleLike}
              className={`p-2 transition-all ${
                isLiked ? 'text-red-500 scale-110' : 'text-white hover:text-red-400'
              }`}
            >
              <FiHeart 
                className="text-xl" 
                fill={isLiked ? 'currentColor' : 'none'}
              />
            </button>
          </div>
          
        </div>
      </div>

      {/* Stats Modal */}
      {showStats && storyStats && (
        <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">Thống kê</h3>
              <button
                onClick={() => {
                  setShowStats(false);
                  setIsPaused(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Views */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <FiEye className="text-blue-500" />
                  <h4 className="font-semibold">Lượt xem ({storyStats.totalViews})</h4>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {storyStats.views.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có lượt xem</p>
                  ) : (
                    storyStats.views.map((view, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <img
                          src={view.user.avatar}
                          className="w-10 h-10 rounded-full"
                          alt={view.user.username}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{view.user.fullname}</p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(view.viewedAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Likes */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FiHeart className="text-red-500" />
                  <h4 className="font-semibold">Lượt thích ({storyStats.totalLikes})</h4>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {storyStats.likes.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có lượt thích</p>
                  ) : (
                    storyStats.likes.map((like, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <img
                          src={like.user.avatar}
                          className="w-10 h-10 rounded-full"
                          alt={like.user.username}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{like.user.fullname}</p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(like.likedAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4">Xóa story?</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc muốn xóa story này không? Hành động này không thể hoàn tác.</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setIsPaused(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteStory}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}