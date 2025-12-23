import { useState, useEffect } from "react";
import Header from "../../components/user/Header";
import LeftSidebar from "../../components/user/LeftSidebar";
import PostCard from "../../components/user/PostCard";
import { getSavedPosts } from "../../api/post";
import { FiBookmark } from "react-icons/fi";

export default function SavedPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      try {
        const res = await getSavedPosts();
        setPosts(res.savePosts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSavedPosts();
  }, []);

  const handleUnsaveFromList = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((p) => p._id !== postId));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex max-w-7xl mx-auto pt-4">
        <div className="hidden lg:block w-64 fixed h-screen overflow-y-auto">
          <LeftSidebar />
        </div>

        <div className="flex-1 max-w-xl mx-auto px-2 lg:ml-[280px] xl:mr-[340px] pt-16">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <FiBookmark className="text-2xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Đã lưu</h1>
              <p className="text-sm text-gray-500">
                Các bài viết bạn đã lưu trữ
              </p>
            </div>
          </div>

          <div className="space-y-4 pb-10">
            {loading ? (
              <p className="text-center">Đang tải...</p>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onUnsave={handleUnsaveFromList}
                />
              ))
            ) : (
              <p className="text-center text-gray-500">
                Chưa có bài viết nào được lưu.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
