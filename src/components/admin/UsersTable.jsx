// src/components/admin/UsersTableMock.jsx
import { useState, useEffect } from "react";
import {
  FiEdit,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiLock,
  FiUnlock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import AdminModal from "./AdminModal";
import { useAdmin } from "./AdminProvider";
import toast from "react-hot-toast";

export default function UsersTable() {
  // Lấy dữ liệu và actions từ Context
  const { users, loadingTable, actions } = useAdmin();

  // Local state cho UI
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);

  //Gọi API khi Search hoặc Page thay đổi
  useEffect(() => {
    const timer = setTimeout(() => {
      actions.loadUsers({ page: page, limit: 10, search: searchTerm });
    }, 500);
    return () => clearTimeout(timer);
  }, [page, searchTerm, actions.loadUsers]);

  // Hàm xử lý Block/Unblock nhanh
  const handleToggleBlock = async (user) => {
    if (user.role === "admin") {
      toast.error("Không thể khóa tài khoản Admin");
      return;
    }

    if (user.isBlocked) {
      // Mở khóa
      await actions.unblockUser(user._id);
    } else {
      // Khóa (Mặc định lý do)
      const confirm = window.confirm(
        `Bạn có chắc muốn khóa tài khoản ${user.username}?`
      );
      if (confirm) {
        await actions.blockUser(user._id, "Vi phạm điều khoản");
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* --- HEADER --- */}
      <div className="p-5 border-b border-gray-100 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-800">
            Quản lý người dùng
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Trang {page}
            </span>
          </h2>

          <div className="flex items-center gap-3">
            {/* Search Bar  */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-[#0866FF] w-64 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                #
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Người dùng
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Vai trò
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Xác thực Email
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ngày tham gia
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Hành động
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {loadingTable ? (
              // --- SKELETON LOADING ---
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        <div className="h-3 w-20 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-8 w-24 bg-gray-200 rounded ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FiSearch className="text-gray-400 text-xl" />
                  </div>
                  Không tìm thấy người dùng nào
                </td>
              </tr>
            ) : (
              // --- REAL DATA ---
              users.map((user, index) => (
                <tr
                  key={user._id}
                  className="group hover:bg-[#F0F2F5] transition-colors"
                >
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {index + 1 + (page - 1) * 10}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          user.avatar ||
                          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png"
                        }
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        onError={(e) =>
                          (e.target.src =
                            "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png")
                        }
                      />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${
                        user.role === "admin"
                          ? "bg-purple-50 text-purple-700 border-purple-100"
                          : "bg-blue-50 text-blue-600 border-blue-100"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isVerified ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100 flex items-center w-fit gap-1">
                        <FiCheckCircle size={12} /> Đã xác thực
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100 flex items-center w-fit gap-1">
                        <FiAlertCircle size={12} /> Chưa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center w-fit gap-1
                      ${
                        !user.isBlocked
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-red-50 text-red-700 border-red-100"
                      }`}
                    >
                      {!user.isBlocked ? (
                        <FiUnlock size={10} />
                      ) : (
                        <FiLock size={10} />
                      )}
                      {!user.isBlocked ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Nút Khóa / Mở khóa nhanh */}
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleToggleBlock(user)}
                          title={user.isBlocked ? "Mở khóa" : "Khóa tài khoản"}
                          className={`p-2 rounded-lg transition-all ${
                            user.isBlocked
                              ? "text-green-600 hover:bg-green-50"
                              : "text-red-500 hover:bg-red-50"
                          }`}
                        >
                          {user.isBlocked ? (
                            <FiUnlock size={18} />
                          ) : (
                            <FiLock size={18} />
                          )}
                        </button>
                      )}

                      {/* Nút Xem chi tiết */}
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setModalOpen(true);
                        }}
                        title="Xem chi tiết"
                        className="p-2 text-gray-400 hover:text-[#0866FF] hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <FiEdit size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* --- PAGINATION FOOTER --- */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
        <button
          disabled={page === 1 || loadingTable}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiChevronLeft /> Trước
        </button>

        <span className="text-sm text-gray-500">Trang {page}</span>

        <button
          disabled={users.length < 10 || loadingTable}
          onClick={() => setPage((p) => p + 1)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sau <FiChevronRight />
        </button>
      </div>
      {/* Modal Mock */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type="user"
        data={selectedUser || {}}
      />
    </div>
  );
}
