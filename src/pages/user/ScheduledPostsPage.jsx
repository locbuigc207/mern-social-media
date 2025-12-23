// src/pages/user/ScheduledPostsPage.jsx
import { useState, useEffect } from 'react';
import { getScheduledPosts, cancelScheduledPost, updateScheduledPost } from '../../api/post';
import { FiClock, FiX, FiEdit, FiCalendar } from 'react-icons/fi';
import { useSocket } from '../../context/SocketContext';
import Header from '../../components/user/Header';
import toast from 'react-hot-toast';

export default function ScheduledPostsPage() {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  // Listen for scheduledPostPublished event
  useEffect(() => {
    if (!socket) return;

    socket.on('scheduledPostPublished', (data) => {
      toast.success(`Bài viết đã được đăng: ${data.post.content.substring(0, 30)}...`);
      setScheduledPosts(prev => prev.filter(p => p._id !== data.post._id));
    });

    return () => {
      socket.off('scheduledPostPublished');
    };
  }, [socket]);

  const fetchScheduledPosts = async () => {
    try {
      setLoading(true);
      const res = await getScheduledPosts();
      setScheduledPosts(res.scheduledPosts || []);
    } catch (err) {
      toast.error('Không thể tải danh sách bài đã lên lịch');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (postId) => {
    if (!confirm('Bạn muốn hủy lên lịch bài viết này?')) return;

    try {
      await cancelScheduledPost(postId);
      toast.success('Đã hủy lên lịch');
      setScheduledPosts(scheduledPosts.filter(p => p._id !== postId));
    } catch (err) {
      toast.error('Hủy lịch thất bại');
    }
  };

  const getTimeRemaining = (scheduledAt) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diff = scheduled - now;

    if (diff <= 0) return 'Đang xử lý...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Còn ${days} ngày`;
    }
    
    return `Còn ${hours}h ${minutes}p`;
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiCalendar className="text-blue-600" />
            Bài viết đã lên lịch
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {scheduledPosts.length} bài đang chờ đăng
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : scheduledPosts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FiClock className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Chưa có bài viết nào được lên lịch
            </h3>
            <p className="text-gray-500">
              Sử dụng tính năng lên lịch khi tạo bài viết mới
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledPosts.map((post) => (
              <div
                key={post._id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-gray-800 mb-3 line-clamp-3">
                      {post.content}
                    </p>
                    
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2 text-blue-600 font-semibold">
                        <FiClock />
                        <span>{getTimeRemaining(post.scheduledAt)}</span>
                      </div>
                      
                      <div className="text-gray-600">
                        Sẽ đăng lúc: {new Date(post.scheduledAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  {post.images && post.images.length > 0 && (
                    <img
                      src={post.images[0].url}
                      className="w-24 h-24 object-cover rounded-lg ml-4"
                      alt="preview"
                    />
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => {/* Open edit modal */}}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                  >
                    <FiEdit />
                    Chỉnh sửa
                  </button>
                  
                  <button
                    onClick={() => handleCancel(post._id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                  >
                    <FiX />
                    Hủy lịch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}