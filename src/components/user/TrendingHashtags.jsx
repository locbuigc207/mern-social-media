// src/components/user/TrendingHashtags.jsx
import { useState, useEffect } from 'react';
import { FiHash, FiTrendingUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function TrendingHashtags() {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

  const fetchTrendingHashtags = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_URL}/api/hashtags/trending?limit=10`, {
        headers: {
          'Authorization': token,
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setHashtags(data.hashtags || []);
      }
    } catch (err) {
      console.error('Fetch trending hashtags error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        {[1,2,3].map(i => (
          <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  if (hashtags.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600">
        <h3 className="font-bold text-white flex items-center gap-2">
          <FiTrendingUp />
          Hashtag thịnh hành
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {hashtags.map((hashtag, index) => (
          <Link
            key={hashtag._id || index}
            to={`/hashtag/${hashtag.tag}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shrink-0">
                <FiHash className="text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition">
                  #{hashtag.tag}
                </p>
                <p className="text-xs text-gray-500">
                  {hashtag.count} bài viết
                </p>
              </div>
            </div>

            <div className="text-2xl font-bold text-gray-300 group-hover:text-blue-500 transition shrink-0">
              {index + 1}
            </div>
          </Link>
        ))}
      </div>

      <Link
        to="/hashtags/explore"
        className="block px-4 py-3 text-center text-blue-600 hover:bg-blue-50 font-medium text-sm border-t transition"
      >
        Xem tất cả
      </Link>
    </div>
  );
}