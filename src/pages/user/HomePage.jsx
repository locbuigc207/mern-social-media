import { useState, useEffect } from "react";
import Header from "../../components/user/Header";
import LeftSidebar from "../../components/user/LeftSidebar";
import CreatePost from "../../components/user/CreatePost";
import RightSidebar from "../../components/user/RightSidebar";
import PostCard from "../../components/user/PostCard";
import ChatPopup from "../../components/user/ChatPopup";
import StoriesBar from "../../components/user/story/StoriesBar"; 
import { getPosts } from "../../api/post";
import { getCurrentUser , getUserById} from "../../api/user";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openChatUser, setOpenChatUser] = useState(null); // User đang chat
  const [isMinimized, setIsMinimized] = useState(false); // Trạng thái thu nhỏ

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const data = await getCurrentUser();
        setCurrentUser(data.user || data);
      } catch (error) {
        console.error("Get user error:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    // [THÊM] Hàm xử lý khi resize màn hình
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false); // Mobile: Mặc định đóng
      } else {
        setSidebarOpen(true); // Desktop: Mặc định mở
      }
    };

    // Set state ban đầu
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // TODO Khi tạo bài viết mới
  const handleNewPost = (newPost) => {
    setPosts((prevPosts) => {
      return [newPost, ...prevPosts];
    });
  };

  const handleUpdate = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post
      )
    );
  };

  const handleDelete = (postId) => {
    setPosts(posts.filter((p) => p._id !== postId));
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await getPosts();
        setPosts(res.posts);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F2F5] overflow-hidden">
      {/* 1. Header */}
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex w-full justify-center">
        {/* 2. LeftSidebar*/}
        <LeftSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* 3. Nội dung chính */}
        <div className="flex-1 min-w-0 px-2 md:px-4 py-4 max-w-3xl mx-auto w-full">
           {/* Stories Bar */}
          <StoriesBar currentUser={currentUser} />
          <div className="-mt-15">
            {/* Tạo bài viết */}
            <CreatePost onNewPost={handleNewPost} />
          </div>
          

          {/* Danh sách bài viết */}
          <div className="space-y-4 mt-4">
            {loading ? (
              <p className="text-center py-4 text-gray-500">Đang tải...</p>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))
            )}
          </div>
        </div>

        {/* 4. Sidebar phải - Ẩn trên mobile */}
        <div className="hidden xl:block w-80 sticky top-16 h-[calc(100vh-64px)]">
          <RightSidebar
            onOpenChat={(user) => {
              setOpenChatUser(user);
              setIsMinimized(false);
            }}
          />
        </div>
      </div>
      {/* 1. Cửa sổ Chat chính */}
      {openChatUser && !isMinimized && (
        <div className="fixed bottom-0 right-20 z-50">
          <ChatPopup
            recipient={openChatUser}
            onClose={() => setOpenChatUser(null)}
            onMinimize={() => setIsMinimized(true)}
          />
        </div>
      )}

      {/* 2. Bong bóng chat khi thu nhỏ */}
      {isMinimized && openChatUser && (
        <div
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 cursor-pointer shadow-lg hover:scale-110 transition animate-bounce"
          title={`Chat với ${openChatUser.fullname}`}
        >
          <img
            src={openChatUser.avatar || "/avatar.png"}
            className="w-full h-full object-cover"
            alt="chat head"
          />
        </div>
      )}
    </div>
  );
}
