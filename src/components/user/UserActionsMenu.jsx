import { useState } from "react";
import { FiFlag, FiXCircle, FiAlertCircle } from "react-icons/fi";
import ConfirmModal from "./ConfirmModal";
import ReportUserModal from "./ReportUserModal";

export default function UserActionsMenu({ 
  user, 
  onBlock, 
  onReport,
  isCurrentUser = false 
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  if (isCurrentUser) return null; // Không hiển thị với chính mình

  const handleBlock = async () => {
    if (onBlock) {
      await onBlock(user._id);
    }
    setShowBlockModal(false);
    setShowMenu(false);
  };

  const handleReport = async (reason, description) => {
    if (onReport) {
      await onReport(user._id, reason, description);
    }
    setShowReportModal(false);
    setShowMenu(false);
  };

  return (
    <>
      {/* Button 3 chấm */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden">
              {/* Report User */}
              <button
                onClick={() => {
                  setShowReportModal(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition text-left"
              >
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiFlag className="text-gray-700 text-lg" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Báo cáo trang cá nhân</p>
                  <p className="text-xs text-gray-500">
                    Báo cáo nội dung không phù hợp
                  </p>
                </div>
              </button>

              {/* Block User */}
              <button
                onClick={() => {
                  setShowBlockModal(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition text-left border-t"
              >
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiXCircle className="text-gray-700 text-lg" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Chặn {user?.fullname}</p>
                  <p className="text-xs text-gray-500">
                    Họ sẽ không thể nhìn thấy bạn
                  </p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Block Confirmation Modal */}
      <ConfirmModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={handleBlock}
        title={`Chặn ${user?.fullname}?`}
        message={`${user?.fullname} sẽ không thể: Xem nội dung của bạn trên trang cá nhân - Gắn thẻ bạn - Mời bạn tham gia sự kiện hoặc nhóm - Bắt đầu cuộc trò chuyện với bạn - Thêm bạn làm bạn bè`}
        confirmText="Chặn"
      />

      {/* Report Modal */}
      <ReportUserModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
        userName={user?.fullname}
      />
    </>
  );
}
