import { useState, useEffect } from "react";
import { FiEye, FiCheck, FiX, FiFlag, FiSearch } from "react-icons/fi";
import { reportsApi } from "../../api/admin";
import { toast } from "react-hot-toast";
import UserReportDetailModal from "./UserReportDetailModal";

export default function ReportsTable() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filter
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("pending");

  const [selectedReport, setSelectedReport] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Hàm xử lý khi bấm nút "Xem chi tiết"
  const handleViewDetail = async (reportId) => {
    try {
      // Gọi API lấy chi tiết (Backend: adminCtrl.getReportDetails)
      const res = await reportsApi.getOne(reportId);

      // Backend trả về: { report, relatedReports, reporterHistory, ... }
      // Ta dùng relatedReports làm lịch sử vi phạm của User này
      setSelectedReport(res.report);
      setReportHistory(res.relatedReports || []);

      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải chi tiết báo cáo.");
    }
  };
  // Fetch Reports (CHỈ LẤY USER)
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getAll({
        page,
        limit: 10,
        status: filterStatus,
        reportType: "user", // <--- QUAN TRỌNG: Chỉ lấy báo cáo user
      });

      setReports(res.reports);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách báo cáo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, filterStatus]);

  // Xử lý Chấp nhận (Cảnh cáo/Ban)
  const handleResolve = async (id) => {
    const confirm = window.confirm(
      "Bạn có chắc muốn XỬ LÝ người dùng này (Cảnh cáo)?"
    );
    if (!confirm) return;

    const note = window.prompt(
      "Ghi chú xử lý (Admin Note):",
      "Vi phạm tiêu chuẩn cộng đồng"
    );

    try {
      await reportsApi.accept(id, {
        actionTaken: "warning",
        adminNote: note || "Đã xử lý",
        blockUser: false,
      });

      toast.success("Đã xử lý thành công!");
      // Refresh hoặc xóa dòng
      if (filterStatus === "pending") {
        setReports((prev) => prev.filter((r) => r._id !== id));
      } else {
        fetchReports();
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || "Lỗi xử lý");
    }
  };

  // Xử lý Từ chối (Bỏ qua)
  const handleReject = async (id) => {
    const reason = window.prompt(
      "Nhập lý do từ chối (Bắt buộc, >10 ký tự):",
      ""
    );
    if (reason === null) return;

    if (reason.trim().length < 10) {
      toast.error("Lý do từ chối phải dài hơn 10 ký tự!");
      return;
    }

    try {
      await reportsApi.decline(id, { adminNote: reason.trim() });
      toast.success("Đã từ chối báo cáo.");

      if (filterStatus === "pending") {
        setReports((prev) => prev.filter((r) => r._id !== id));
      } else {
        fetchReports();
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || "Lỗi xử lý");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* --- HEADER --- */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2 rounded-full">
            <FiFlag className="text-orange-500 text-lg" />
          </div>
          <div>
            {/* Tiêu đề cụ thể hơn */}
            <h3 className="text-lg font-bold text-gray-900">
              Báo cáo Người dùng
            </h3>
            <div className="flex gap-2 mt-1 text-xs">
              <button
                onClick={() => setFilterStatus("pending")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterStatus === "pending"
                    ? "bg-orange-100 text-orange-700 font-bold"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Chờ xử lý
              </button>
              <button
                onClick={() => setFilterStatus("resolved")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterStatus === "resolved"
                    ? "bg-green-100 text-green-700 font-bold"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Đã xử lý
              </button>
              <button
                onClick={() => setFilterStatus("declined")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterStatus === "declined"
                    ? "bg-red-100 text-red-700 font-bold"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Đã từ chối
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm người dùng..."
            className="pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-[#0866FF] transition-all w-64"
          />
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Người báo cáo
              </th>
              {/* Cột này giờ chuyên biệt cho User */}
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Người bị báo cáo
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Lý do & Mô tả
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Độ ưu tiên
              </th>
              {filterStatus === "pending" && (
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan="5" className="px-6 py-4">
                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <FiCheck className="w-12 h-12 text-green-500 bg-green-50 p-2 rounded-full mb-3" />
                    <p>Không có báo cáo người dùng nào.</p>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr
                  key={report._id}
                  className="group hover:bg-[#F9FAFB] transition-colors"
                >
                  {/* Cột 1: Người đi báo cáo */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <img
                        src={report.reportedBy?.avatar || "/avatar.png"}
                        alt=""
                        className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {report.reportedBy?.username || "Ẩn danh"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Cột 2: Người BỊ báo cáo (Target User) */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img
                          src={report.targetId?.avatar || "/avatar.png"}
                          className="w-9 h-9 rounded-full border border-red-200 object-cover p-0.5 bg-red-50"
                          alt=""
                        />
                        {/* Icon cảnh báo nhỏ */}
                        <div className="absolute -bottom-1 -right-1 bg-red-100 text-red-600 rounded-full p-0.5 border border-white">
                          <FiFlag size={10} />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {report.targetId?.username || "Unknown User"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {report.targetId?.email}
                        </p>
                        {report.targetId?.isBlocked && (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1 rounded border border-red-100">
                            ĐANG KHÓA
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cột 3: Lý do */}
                  <td className="px-6 py-4 align-top max-w-[250px]">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase mb-1">
                      {report.reason}
                    </span>
                    <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded border border-gray-100">
                      "{report.description || "Không có mô tả"}"
                    </p>
                  </td>

                  {/* Cột 4: Priority */}
                  <td className="px-6 py-4 align-top">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        report.priority === "critical" ||
                        report.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : report.priority === "medium"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {report.priority}
                    </span>
                  </td>

                  {/* Cột 5: Thao tác */}
                  {filterStatus === "pending" && (
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewDetail(report._id)} // <--- GỌI HÀM NÀY
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Xem chi tiết"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={() => handleResolve(report._id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Xử lý (Cảnh cáo)"
                        >
                          <FiCheck size={18} />
                        </button>
                        <button
                          onClick={() => handleReject(report._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Từ chối"
                        >
                          <FiX size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION --- */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex justify-center items-center gap-4 bg-white">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium transition"
          >
            Trước
          </button>
          <span className="text-sm text-gray-600">
            Trang <b>{page}</b> / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium transition"
          >
            Sau
          </button>
        </div>
      )}
      <UserReportDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        reportData={selectedReport}
        historyData={reportHistory}
      />
    </div>
  );
}
