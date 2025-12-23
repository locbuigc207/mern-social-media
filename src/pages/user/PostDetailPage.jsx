// src/pages/PostDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost } from "../../api/post";
import PostCard from "../../components/user/PostCard";
import { FiArrowLeft } from "react-icons/fi";

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const res = await getPost(id);
        // Kiểm tra cấu trúc trả về của API getPost
        setPost(res.post || res);
      } catch (err) {
        console.error(err);
        setError("Không tìm thấy bài viết hoặc bài viết đã bị xóa.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPost();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;

  if (error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline"
        >
          Quay lại
        </button>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-4 transition"
      >
        <FiArrowLeft /> Quay lại
      </button>

      {post && <PostCard post={post} />}
    </div>
  );
}
