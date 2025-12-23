// src/components/admin/AdminProvider.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { getDashboardStats, usersApi, spamPostsApi } from "../../api/admin";
import { toast } from "react-hot-toast";

const AdminContext = createContext();

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within AdminProvider");
  return context;
}

export default function AdminProvider({ children }) {
  // --- STATE ---
  const [stats, setStats] = useState({
    total_users: 0,
    total_posts: 0,
    total_comments: 0,
    total_likes: 0,
    total_spam_posts: 0,
  });
  const [spamPosts, setSpamPosts] = useState([]);
  const [users, setUsers] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  // --- API CALLS ---
  //1. Load Dashboard Stats
  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  //2.Load Spam Posts
  const loadSpamPosts = useCallback(async () => {
    try {
      const data = await spamPostsApi.getAll();
      //Backend return {spamPosts, total, page, totalPage}
      setSpamPosts(data.spamPosts || []);
    } catch (error) {
      console.error("Spam posts error:", error);
    }
  }, []);

  //3.Load Users
  const loadUsers = useCallback(async (params = { page: 1, limit: 10 }) => {
    try {
      setLoadingTable(true);
      const data = await usersApi.getAll(params);
      setUsers(data.users || data);
    } catch (error) {
      console.error("Users error:", error);
      toast.error("Lỗi tải danh sách người dùng");
    } finally {
      setLoadingTable(false);
    }
  }, []);

  //Refresh, gọi khi mới vào trang hoặc nút refresh
  const refresh = useCallback(() => {
    setLoadingStats(true);
    // Gọi song song
    Promise.all([loadDashboard(), loadSpamPosts(), loadUsers()]).finally(() => {
      setLoadingStats(false);
    });
  }, [loadDashboard, loadSpamPosts, loadUsers]);

  //Tự động load khi component mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // CÁC THAO TÁC
  //1. Xoá SpamPost
  const deleteSpamPost = useCallback(
    async (postId) => {
      //Lưu lại state cũ nếu có lỗi
      const prevPosts = [...spamPosts];
      // Update UI trước
      setSpamPosts((prev) => prev.filter((p) => p._id !== postId));
      setStats((prev) => ({
        ...prev,
        total_spam_posts: Math.max(0, prev.total_spam_posts - 1),
      }));

      try {
        await spamPostsApi.delete(postId);
        toast.success("Đã xóa bài viết");
        return { success: true };
      } catch (error) {
        // Revert UI nếu lỗi
        setSpamPosts(prevPosts);
        setStats((prev) => ({
          ...prev,
          total_spam_posts: prev.total_spam_posts + 1,
        }));
        toast.error("Xóa thất bại: " + error.message);
        return { success: false, message: error.message };
      }
    },
    [spamPosts]
  );
  //2.Block User
  const blockUser = useCallback(
    async (userId, reason = "Vi phạm tiêu chuẩn cộng đồng") => {
      const prevUsers = [...users];
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isBlocked: true } : u))
      );
      try {
        console.log(`[AdminProvider] Calling API block for user: ${userId}`);
        await usersApi.block(userId, reason);

        toast.success("Đã khóa tài khoản người dùng");
        return { success: true };
      } catch (error) {
        const serverMsg = error.response?.data?.msg || error.message;
        if (serverMsg === "User is already blocked.") {
          toast.success("User đã bị khóa trước đó");
          return { success: true };
        }
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isBlocked: false } : u))
        );
        toast.error("Khoá thất bại");
        return { success: true };
      }
    },
    []
  );
  //3.Unblock User
  const unblockUser = useCallback(async (userId) => {
    const prevUsers = [...users];
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, isBlocked: false } : u))
    );
    try {
      console.log(`[AdminProvider] Calling API unblock for user: ${userId}`);
      await usersApi.unblock(userId);
      toast.success("Đã mở khóa tài khoản");
      return { success: true };
    } catch (error) {
      toast.error("Mở khóa thất bại: " + error.message);
      return { success: false, message: error.message };
    }
  }, []);

  // --- CONTEXT VALUE ---
  const value = useMemo(
    () => ({
      // Data States
      stats,
      users,
      spamPosts,
      //Loading states
      loading: loadingStats || loadingTable,
      loadingStats,
      loadingTable,
      //Action
      actions: {
        deleteSpamPost,
        blockUser,
        unblockUser,
        refresh,
        loadUsers,
      },
      reloaders: {
        loadDashboard,
        loadSpamPosts,
        loadUsers,
      },
    }),
    [
      stats,
      users,
      spamPosts,
      loadingStats,
      loadingTable,
      deleteSpamPost,
      blockUser,
      unblockUser,
      refresh,
      loadDashboard,
      loadSpamPosts,
      loadUsers,
    ]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}
