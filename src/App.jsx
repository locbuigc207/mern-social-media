import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import SignUpPage from "./pages/auth/SignUpPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import SignInPage from "./pages/auth/SignInPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import HomePage from "./pages/user/HomePage";
import SettingsPage from "./pages/user/SettingsPage";
import FollowPage from "./pages/user/FollowPage";
import FollowingTab from "./components/user/FollowingTab";
import FollowersTab from "./components/user/FollowerTab";
import SuggestionsTab from "./components/user/SuggestionsTab";
import SavedPostsPage from "./pages/user/SavedPostsPage";
import UserProfilePage from "./pages/user/UserProfilePage";
import ChatPopupManager from "./components/user/ChatPopupManager";
import PostDetailPage from "./pages/user/PostDetailPage";

import { SocketProvider } from "./context/SocketContext";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersTable from "./components/admin/UsersTable";
import SpamPostsTable from "./components/admin/SpamPostsTable";
import AdminOverView from "./components/admin/AdminOverView";
import ReportsTable from "./components/admin/ReportsTable";

//mock, cmt khi không dùng nữa
//import './MockSetup';

// TODO: Bật lại ProtectedRoute khi deploy production
const isDevelopment = false; // Đổi thành false khi deploy

function App() {
  const token = localStorage.getItem("accessToken");

  return (
    <SocketProvider>
      <>
        <Toaster position="top-center" />
        <Routes>
          {/* Auth */}
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          <Route path="/signin" element={<SignInPage />} />
          {/* User */}
          <Route element={<ProtectedRoute allowedRoles={["user", "admin"]} />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<FollowPage />}>
              <Route path="/following" element={<FollowingTab />} />
              <Route path="/followers" element={<FollowersTab />} />
              <Route path="/suggestions" element={<SuggestionsTab />} />
            </Route>
            <Route path="/saved" element={<SavedPostsPage />} />
            <Route path="/profile/me" element={<UserProfilePage />} />
            <Route path="/profile/:id" element={<UserProfilePage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
          </Route>
          {/* Admin */}
          <Route
            path="/admin"
            element={<ProtectedRoute allowedRoles={["admin"]} />}
          >
            <Route element={<AdminDashboard />}>
              <Route index element={<AdminOverView />} />
              <Route path="users" element={<UsersTable />} />
              <Route path="posts" element={<SpamPostsTable />} />
              <Route path="spam" element={<SpamPostsTable />} />
              <Route path="analytics" element={<ReportsTable />} />
              <Route path="reports" element={<ReportsTable />} />
            </Route>
          </Route>
        </Routes>
        <ChatPopupManager />
      </>
    </SocketProvider>
  );
}

export default App;
