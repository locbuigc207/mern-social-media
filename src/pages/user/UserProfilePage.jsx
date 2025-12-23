import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiCamera,
  FiEdit,
  FiUserPlus,
  FiUserCheck,
  FiMoreHorizontal,
  FiMapPin,
  FiCalendar,
  FiGrid,
  FiList,
  FiMessageCircle,
  FiHeart,
  FiHome,
  FiBookOpen,
  FiChevronDown,
} from "react-icons/fi";
import Header from "../../components/user/Header";
import PostCard from "../../components/user/PostCard";
import CreatePost from "../../components/user/CreatePost";
import MessageButton from "../../components/user/MessageButton";
import { getCurrentUser, getUserById } from "../../api/user";
import EditProfileModal from "../../components/user/EditProfileModal";

import { getUserPosts } from "../../api/post";
import UserActionsMenu from "../../components/user/UserActionsMenu";
import { blockUser, reportUser } from "../../api/user";
import { toast } from "react-hot-toast";

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [viewMode, setViewMode] = useState("list");
  const [isFriend, setIsFriend] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isOwnProfile = currentUser?._id === profileUser?._id || id === "me";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const currentUserRes = await getCurrentUser();
        const user = currentUserRes.user || currentUserRes;
        setCurrentUser(user);

        if (id === "me" || id === user._id) {
          setProfileUser(user);
          const postsRes = await getUserPosts(user._id);
          setPosts(postsRes.posts || []);
        } else {
          const profileUserRes = await getUserById(id);
          const targetUser = profileUserRes.user || profileUserRes;
          setProfileUser(targetUser);

          const postsRes = await getUserPosts(id);
          setPosts(postsRes.posts || []);

          // Kiểm tra quan hệ bạn bè
          const isAlreadyFriend =
            user.followers?.some((f) => f._id === id) || false;
          setIsFriend(isAlreadyFriend);
        }
      } catch (err) {
        console.error("Lỗi tải profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleNewPost = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handleUpdatePost = (updatedPost) => {
    setPosts(posts.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handleDeletePost = (postId) => {
    setPosts(posts.filter((p) => p._id !== postId));
  };

  const handleBlock = async (userId) => {
    try {
      await blockUser(userId);
      toast.success("Đã chặn người dùng thành công");
      navigate("/");
    } catch (err) {
      toast.error(err.message || "Không thể chặn người dùng");
    }
  };

  const handleReport = async (userId, reason, description) => {
    try {
      await reportUser(userId, reason, description);
      toast.success("Báo cáo đã được gửi. Chúng tôi sẽ xem xét trong 24-48h");
    } catch (err) {
      toast.error(err.message || "Không thể gửi báo cáo");
    }
  };
  const handleUpdateSuccess = (updatedUser) => {
    setProfileUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="max-w-6xl mx-auto pt-20 px-4">
          <div className="animate-pulse">
            <div className="bg-gray-300 h-96 rounded-b-2xl mb-4"></div>
            <div className="bg-white rounded-lg p-6">
              <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="max-w-6xl mx-auto pt-20 px-4 text-center">
          <p className="text-gray-600">Không tìm thấy người dùng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="max-w-6xl mx-auto pt-14">
        {/* Cover Photo */}
        <div className="relative bg-linear-to-br from-blue-500 to-purple-600 h-80  overflow-hidden">
          {profileUser.coverPhoto ? (
            <img
              src={profileUser.coverPhoto}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full"></div>
          )}
          {isOwnProfile && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition shadow-md"
            >
              <FiCamera />
              <span className="font-medium">Chỉnh sửa ảnh bìa</span>
            </button>
          )}
        </div>

        {/* Profile Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between -mt-8 pb-4">
              {/* Avatar & Name */}
              <div className="flex items-end gap-4">
                <div className="relative">
                  <img
                    src={profileUser.avatar || "/avatar.png"}
                    alt={profileUser.fullname}
                    className="w-40 h-40 rounded-full border-4 border-white object-cover shadow-lg"
                  />
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="absolute bottom-2 right-2 bg-gray-200 p-2.5 rounded-full hover:bg-gray-300 transition"
                    >
                      <FiCamera className="text-xl" />
                    </button>
                  )}
                </div>

                <div className="text-center md:text-left mb-4 md:mb-0">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profileUser.fullname}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {profileUser.followers?.length || 0} người bạn
                  </p>
                  <div className="flex gap-2 mt-2 justify-center md:justify-start">
                    {profileUser.followers?.slice(0, 5).map((friend, idx) => (
                      <img
                        key={idx}
                        src={friend.avatar || "/avatar.png"}
                        className="w-8 h-8 rounded-full border-2 border-white"
                        alt=""
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-center md:justify-end">
                {isOwnProfile ? (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition font-medium"
                  >
                    <FiEdit />
                    Chỉnh sửa trang cá nhân
                  </button>
                ) : (
                  <>
                    {isFriend ? (
                      <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition font-medium">
                        <FiUserCheck />
                        Bạn bè
                      </button>
                    ) : (
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition font-medium">
                        <FiUserPlus />
                        Thêm bạn bè
                      </button>
                    )}
                    <MessageButton user={profileUser} />
                  </>
                )}
                <UserActionsMenu
                  user={profileUser}
                  onBlock={handleBlock}
                  onReport={handleReport}
                  isCurrentUser={isOwnProfile}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t">
              <div className="flex gap-1 -mb-px">
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`px-6 py-4 font-semibold transition relative ${
                    activeTab === "posts"
                      ? "text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Bài viết
                  {activeTab === "posts" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("about")}
                  className={`px-6 py-4 font-semibold transition relative ${
                    activeTab === "about"
                      ? "text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Giới thiệu
                  {activeTab === "about" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("friends")}
                  className={`px-6 py-4 font-semibold transition relative ${
                    activeTab === "friends"
                      ? "text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Bạn bè
                  {activeTab === "friends" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("photos")}
                  className={`px-6 py-4 font-semibold transition relative ${
                    activeTab === "photos"
                      ? "text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Ảnh
                  {activeTab === "photos" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 py-4">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-bold text-lg mb-3">Giới thiệu</h3>
              {profileUser.bio && (
                <p className="text-gray-700 mb-3">{profileUser.bio}</p>
              )}
              {isOwnProfile && !profileUser.bio && (
                <button className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition">
                  Thêm tiểu sử
                </button>
              )}
              <div className="space-y-2 mt-3">
                {profileUser.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiMapPin />
                    <span>Đến từ {profileUser.location}</span>
                  </div>
                )}
                {profileUser.createdAt && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiCalendar />
                    <span>
                      Tham gia{" "}
                      {new Date(profileUser.createdAt).toLocaleDateString(
                        "vi-VN"
                      )}
                    </span>
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition mt-3"
                >
                  Chỉnh sửa chi tiết
                </button>
              )}
            </div>

            {/* Friends Preview */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">
                  Bạn bè
                  <span className="text-gray-500 ml-2">
                    ({profileUser.followers?.length || 0})
                  </span>
                </h3>
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => navigate("/friends")}
                >
                  Xem tất cả
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {profileUser.followers?.slice(0, 9).map((friend, idx) => (
                  <div key={idx} className="text-center">
                    <img
                      src={friend.avatar || "/avatar.png"}
                      className="w-full aspect-square object-cover rounded-lg"
                      alt={friend.fullname}
                    />
                    <p className="text-xs mt-1 truncate">{friend.fullname}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Create Post */}
            {isOwnProfile && activeTab === "posts" && (
              <div className="-mt-20">
                <CreatePost onNewPost={handleNewPost} />
              </div>
            )}

            {/* View Toggle */}
            {activeTab === "posts" && posts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-3 flex justify-between items-center">
                <h3 className="font-bold text-lg">Bài viết</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition ${
                      viewMode === "list"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <FiList />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition ${
                      viewMode === "grid"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <FiGrid />
                  </button>
                </div>
              </div>
            )}

            {/* Posts */}
            {activeTab === "posts" && (
              <div
                className={
                  viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-4"
                }
              >
                {posts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <p className="text-gray-500">Chưa có bài viết nào</p>
                  </div>
                ) : viewMode === "list" ? (
                  posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onUpdate={handleUpdatePost}
                      onDelete={handleDeletePost}
                    />
                  ))
                ) : (
                  posts.map((post) => (
                    <div
                      key={post._id}
                      className="aspect-square bg-white rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition"
                    >
                      {post.images?.[0] ? (
                        <img
                          src={post.images[0].url}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="w-full h-full p-4 flex items-center justify-center bg-gray-50">
                          <p className="text-sm text-gray-600 line-clamp-6">
                            {post.content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* About Tab */}
            {activeTab === "about" && (
              <div className="bg-white rounded-lg shadow-sm p-5 ">
                <h3 className="font-bold text-xl mb-4">Giới thiệu</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Thông tin cơ bản
                    </h4>
                    <div className="space-y-2 text-gray-600">
                      <p>Email: {profileUser.email}</p>
                      <p>Username: @{profileUser.username}</p>
                    </div>
                  </div>
                  {profileUser.bio && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Tiểu sử
                      </h4>
                      <p className="text-gray-600">{profileUser.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === "friends" && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h3 className="font-bold text-xl mb-4">
                  Bạn bè ({profileUser.followers?.length || 0})
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {profileUser.followers?.map((friend, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition cursor-pointer"
                    >
                      <img
                        src={friend.avatar || "/avatar.png"}
                        className="w-16 h-16 rounded-lg object-cover"
                        alt={friend.fullname}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{friend.fullname}</p>
                        <p className="text-sm text-gray-500">
                          @{friend.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === "photos" && (
              <div className="bg-white rounded-lg shadow-sm p-5 ">
                <h3 className="font-bold text-xl mb-4">Ảnh</h3>
                <div className="grid grid-cols-3 gap-2">
                  {posts
                    .flatMap((post) => post.images || [])
                    .map((img, idx) => (
                      <img
                        key={idx}
                        src={img.url}
                        className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                        alt=""
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={profileUser}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </div>
  );
}
