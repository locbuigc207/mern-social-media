// src/components/admin/SpamPostsTable.jsx
import { useState } from "react";
import { FiTrash2, FiEye, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { useAdmin } from "./AdminProvider";
import PostDetailModal from "./PostDetailModal";

// Hàm helper để tô màu cho lý do
const getReasonColor = (reason) => {
  switch (reason) {
    case "child_exploitation":
    case "terrorism":
    case "self_harm":
      return "bg-red-100 text-red-800 border-red-200"; // Nghiêm trọng
    case "nudity":
    case "violence":
      return "bg-orange-100 text-orange-800 border-orange-200"; // Cao
    case "spam":
    case "scam":
      return "bg-gray-100 text-gray-800 border-gray-200"; // Thấp
    default:
      return "bg-blue-50 text-blue-700 border-blue-100";
  }
};

const getReasonLabel = (reason) => {
  const map = {
    spam: "Spam",
    harassment: "Quấy rối",
    hate_speech: "Thù ghét",
    violence: "Bạo lực",
    nudity: "Khỏa thân",
    false_information: "Tin giả",
    scam: "Lừa đảo",
    copyright: "Bản quyền",
    self_harm: "Tự hại",
    terrorism: "Khủng bố",
    child_exploitation: "Bóc lột trẻ em",
    other: "Khác",
  };
  return map[reason] || reason;
};

export default function SpamPostsTable() {
  const { spamPosts, loading, actions } = useAdmin();
  console.log("Spam Posts received:", spamPosts);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hàm mở modal xem chi tiết bài viết
  const handleViewPost = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  // Xử lý Xóa bài viết
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết vi phạm này?"))
      return;

    const result = await actions.deleteSpamPost(postId);
    if (!result.success) {
      alert("Lỗi: " + result.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2 rounded-full">
            <FiAlertCircle className="text-red-500 w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Kiểm duyệt bài viết
            </h2>
            <p className="text-xs text-gray-500">
              Cần xử lý:{" "}
              <span className="font-bold text-red-600">
                {spamPosts?.length || 0}
              </span>{" "}
              vi phạm
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Người đăng
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Lí do báo cáo
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Người báo cáo
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">
                Nội dung
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan="4" className="px-6 py-4">
                    <div className="h-8 bg-gray-100 rounded"></div>
                  </td>
                </tr>
              ))
            ) : !spamPosts || spamPosts.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-16 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <FiCheckCircle className="text-green-500 text-4xl mb-2" />
                    <span>Không có bài viết nào bị báo cáo.</span>
                  </div>
                </td>
              </tr>
            ) : (
              spamPosts.map((post) => (
                <tr
                  key={post._id}
                  className="group hover:bg-red-50/30 transition-colors"
                >
                  {/* CỘT 1: USER */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-9 w-9 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                        <img
                          src={
                            post.user?.avatar ||
                            "https://res.cloudinary.com/douy56nkf/image/upload/v1596643249/avatar/avatar_cugq40.png"
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-bold text-gray-900">
                          {post.user?.username || "Đã xóa"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {post.user?.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* CỘT 2: LÝ DO */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {post.reportReasons && post.reportReasons.length > 0 ? (
                        post.reportReasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getReasonColor(
                              reason
                            )}`}
                          >
                            {getReasonLabel(reason)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Chưa rõ lý do
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 font-medium">
                      Tổng cộng:{" "}
                      <span className="text-red-600">
                        {post.reportCountReal || post.reports?.length || 0}
                      </span>{" "}
                      phiếu tố cáo
                    </div>
                  </td>
                  {/* --- CỘT 3: NGƯỜI BÁO CÁO  --- */}
                  <td className="px-6 py-4">
                    <div className="flex -space-x-2 overflow-hidden">
                      {post.reporters && post.reporters.length > 0 ? (
                        post.reporters.slice(0, 3).map((reporter, idx) => (
                          <img
                            key={reporter._id}
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                            src={
                              reporter.avatar ||
                              "https://res.cloudinary.com/douy56nkf/image/upload/v1596643249/avatar/avatar_cugq40.png"
                            }
                            alt={reporter.username}
                            title={reporter.username} // Hover hiện tên
                          />
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Ẩn danh</span>
                      )}
                      {/* Nếu nhiều hơn 3 người thì hiện số dư */}
                      {post.reporters && post.reporters.length > 3 && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-xs font-medium text-gray-500">
                          +{post.reporters.length - 3}
                        </div>
                      )}
                    </div>
                    {post.reporters && post.reporters.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        {post.reporters[0].username}
                        {post.reporters.length > 1 &&
                          ` và ${post.reporters.length - 1} người khác`}
                      </div>
                    )}
                  </td>
                  {/* CỘT 3: NỘI DUNG */}
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                      {post.content || (
                        <em className="text-gray-400">Không có văn bản</em>
                      )}
                    </p>
                    {post.images?.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <FiEye /> {post.images.length} hình ảnh đính kèm
                      </div>
                    )}
                  </td>

                  {/* CỘT 4: ACTIONS */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewPost(post)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Xem chi tiết"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Xóa bài & Ban"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PostDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        postData={selectedPost}
      />
    </div>
  );
}
