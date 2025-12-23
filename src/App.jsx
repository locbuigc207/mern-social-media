// src/App.jsx - UPDATED with all new routes
import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Auth Pages
import SignUpPage from "./pages/auth/SignUpPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import SignInPage from "./pages/auth/SignInPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Protected Route Component
import ProtectedRoute from "./components/auth/ProtectedRoute";

// User Pages
import HomePage from "./pages/user/HomePage";
import SettingsPage from "./pages/user/SettingsPage";
import EnhancedPrivacyPage from "./pages/user/EnhancedPrivacyPage";
import FollowPage from "./pages/user/FollowPage";
import FollowingTab from "./components/user/FollowingTab";
import FollowersTab from "./components/user/FollowerTab";
import SuggestionsTab from "./components/user/SuggestionsTab";
import SavedPostsPage from "./pages/user/SavedPostsPage";
import UserProfilePage from "./pages/user/UserProfilePage";
import PostDetailPage from "./pages/user/PostDetailPage";
import DraftsPage from "./pages/user/DraftsPage";
import ScheduledPostsPage from "./pages/user/ScheduledPostsPage";
import HashtagPage from "./pages/user/HashtagPage";
import ErrorPage from "./pages/ErrorPage";

// Chat Component
import ChatPopupManager from "./components/user/ChatPopupManager";

// Socket Context
import { SocketProvider } from "./context/SocketContext";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersTable from "./components/admin/UsersTable";
import SpamPostsTable from "./components/admin/SpamPostsTable";
import AdminOverView from "./components/admin/AdminOverView";
import ReportsTable from "./components/admin/ReportsTable";

function App() {
  return (
    <SocketProvider>
      <>
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Routes>
          {/* ==== Public Routes ==== */}
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          
          {/* ==== Protected User Routes ==== */}
          <Route element={<ProtectedRoute allowedRoles={["user", "admin"]} />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            
            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/privacy" element={<EnhancedPrivacyPage />} />
            
            {/* Follow System */}
            <Route element={<FollowPage />}>
              <Route path="/following" element={<FollowingTab />} />
              <Route path="/followers" element={<FollowersTab />} />
              <Route path="/suggestions" element={<SuggestionsTab />} />
            </Route>
            
            {/* Posts */}
            <Route path="/saved" element={<SavedPostsPage />} />
            <Route path="/drafts" element={<DraftsPage />} />
            <Route path="/scheduled" element={<ScheduledPostsPage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
            
            {/* Hashtags */}
            <Route path="/hashtag/:tag" element={<HashtagPage />} />
            
            {/* Profile */}
            <Route path="/profile/me" element={<UserProfilePage />} />
            <Route path="/profile/:id" element={<UserProfilePage />} />
          </Route>
          
          {/* ==== Admin Routes ==== */}
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

          {/* ==== Error Handling ==== */}
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<Navigate to="/error?code=404&message=Page not found" replace />} />
        </Routes>
        
        {/* Chat Popup Manager - Global */}
        <ChatPopupManager />
      </>
    </SocketProvider>
  );
}

export default App;