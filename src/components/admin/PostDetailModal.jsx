import { FiX, FiUser, FiAlertTriangle, FiClock, FiGlobe } from "react-icons/fi";

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

export default function PostDetailModal({ isOpen, onClose, postData }) {
  if (!isOpen || !postData) return null;

  const post = postData;
  const author = post.user || { username: "Người dùng ẩn" };
  const images = (post.images || []).map((img) => img.url || img);

  // Ưu tiên dùng dữ liệu chi tiết mới
  const detailedReports = post.detailedReports || [];
  // Fallback nếu chưa có dữ liệu chi tiết (dùng logic cũ)
  const hasLegacyReports =
    !detailedReports.length && post.reportReasons?.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0 z-10">
          <h3 className="text-lg font-bold text-gray-800 text-center flex-1">
            Chi tiết bài viết & Báo cáo
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors absolute right-4"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto p-0 scroll-smooth custom-scrollbar">
          {/* --- PHẦN 1: DANH SÁCH BÁO CÁO CHI TIẾT (QUAN TRỌNG) --- */}
          {(detailedReports.length > 0 || hasLegacyReports) && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-100 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-red-100/50 border-b border-red-100 flex items-center gap-2">
                <FiAlertTriangle className="text-red-600" />
                <p className="text-sm font-bold text-red-700 uppercase">
                  Danh sách tố cáo (
                  {post.reportCountReal || post.reports?.length || 0})
                </p>
              </div>

              <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-red-100/50">
                {/* CASE 1: Có dữ liệu chi tiết (Sau khi sửa Backend) */}
                {detailedReports.length > 0 ? (
                  detailedReports.map((report, idx) => (
                    <div
                      key={idx}
                      className="p-3 hover:bg-white/60 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              report.reporter?.avatar ||
                              "https://via.placeholder.com/30"
                            }
                            className="w-6 h-6 rounded-full object-cover border border-gray-200"
                            alt=""
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-800">
                                {report.reporter?.username || "Ẩn danh"}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {new Date(report.createdAt).toLocaleString(
                                  "vi-VN"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200">
                          {getReasonLabel(report.reason)}
                        </span>
                      </div>

                      {/* Hiển thị Description */}
                      <div className="mt-1 pl-8">
                        <p className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-100 italic">
                          "{report.description || "Không có mô tả chi tiết"}"
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  /* CASE 2: Fallback dữ liệu cũ (Nếu backend chưa cập nhật kịp) */
                  <div className="p-4 text-sm text-gray-600">
                    <p>
                      Lý do:{" "}
                      {post.reportReasons
                        .map((r) => getReasonLabel(r))
                        .join(", ")}
                    </p>
                    <p className="text-xs mt-1 text-gray-400">
                      (Chưa có chi tiết từng người báo cáo)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- PHẦN 2: NỘI DUNG BÀI VIẾT --- */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                <img
                  src={
                    author.avatar ||
                    `https://ui-avatars.com/api/?name=${author.username}&background=random`
                  }
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-[15px]">
                  {author.username}
                </h4>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <FiClock className="w-3 h-3" />
                  <span>
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString("vi-VN")
                      : "Vừa xong"}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-1 pb-2">
              <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                {post.content || (
                  <span className="italic text-gray-400">
                    Không có nội dung văn bản
                  </span>
                )}
              </p>
            </div>

            {images.length > 0 && (
              <div
                className={`grid gap-1 mt-2 rounded-lg overflow-hidden ${
                  images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {images.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={img}
                      alt={`post-img-${index}`}
                      className="w-full h-full object-cover max-h-[400px]"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://via.placeholder.com/400x300?text=Lỗi+Ảnh";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors text-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
