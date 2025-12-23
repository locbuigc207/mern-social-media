// src/pages/user/HashtagPage.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiHash, FiTrendingUp } from 'react-icons/fi';
import Header from '../../components/user/Header';
import PostCard from '../../components/user/PostCard';
import toast from 'react-hot-toast';

export default function HashtagPage() {
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [hashtagInfo, setHashtagInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHashtagPosts();
  }, [tag]);

  const fetchHashtagPosts = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_URL}/api/hashtag/${encodeURIComponent(tag)}`, {
        headers: {
          'Authorization': token,
        },
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.msg);
      
      setPosts(data.posts || []);
      setHashtagInfo(data.hashtag);
    } catch (err) {
      toast.error('Không thể tải bài viết');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = (postId) => {
    setPosts(posts.filter(p => p._id !== postId));
  };

  const handleUpdatePost = (updatedPost) => {
    setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Hashtag Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 mb-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <FiHash className="text-3xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">#{tag}</h1>
              {hashtagInfo && (
                <p className="text-white/90 mt-1">
                  {hashtagInfo.count} bài viết
                </p>
              )}
            </div>
          </div>
          
          {hashtagInfo?.trending && (
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 w-fit">
              <FiTrendingUp className="text-yellow-300" />
              <span className="text-sm font-medium">Đang thịnh hành</span>
            </div>
          )}
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 mt-4">Đang tải...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FiHash className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Chưa có bài viết nào
            </h3>
            <p className="text-gray-500">
              Hãy là người đầu tiên đăng bài với #{tag}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onDelete={handleDeletePost}
                onUpdate={handleUpdatePost}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}