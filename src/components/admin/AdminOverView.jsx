import StatsCards from "../../components/admin/StatsCards";
import AnalyticsChart from "../../components/admin/AnalyticsChart";
import RecentActivity from "./RecentActivity";

export default function AdminOverView() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Thẻ thống kê (Số lượng user, bài viết...) */}
      <StatsCards />

      {/* 2. Biểu đồ và Hoạt động gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ chiếm 2 phần */}
        <div className="lg:col-span-2">
          <AnalyticsChart />
        </div>

        {/* Hoạt động gần đây chiếm 1 phần */}
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
