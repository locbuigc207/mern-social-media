// src/components/admin/AnalyticsChart.jsx
import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { analyticsApi } from "../../api/admin";
import { FiTrendingUp, FiCalendar } from "react-icons/fi";

export default function AnalyticsChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("30");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Tính ngày bắt đầu dựa trên filter
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(filter));

        // Gọi API
        const res = await analyticsApi.getSiteAnalytics({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        const formattedData = res.userGrowth.map((item) => ({
          name: new Date(item._id).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
          }),
          users: item.count,
        }));

        setData(formattedData);
      } catch (error) {
        console.error("Lỗi tải biểu đồ:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filter]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiTrendingUp className="text-blue-600" /> Tăng trưởng người dùng
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Số lượng đăng ký mới theo thời gian
          </p>
        </div>

        {/* Filter */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {["7", "30", "90"].map((days) => (
            <button
              key={days}
              onClick={() => setFilter(days)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                filter === days
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {days} ngày
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#F3F4F6"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#3B82F6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorUsers)"
                name="Người dùng mới"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <FiCalendar size={32} className="mb-2 opacity-50" />
            <p>Chưa có dữ liệu trong khoảng thời gian này</p>
          </div>
        )}
      </div>
    </div>
  );
}
