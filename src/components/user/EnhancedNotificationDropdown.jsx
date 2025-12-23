// src/components/user/EnhancedNotificationDropdown.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FiBell,
  FiHeart,
  FiMessageCircle,
  FiUserPlus,
  FiShare2,
  FiBookmark,
  FiTag,
  FiAtSign,
  FiVideo,
  FiImage,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiStar,
  FiAward,
  FiTrendingUp,
  FiCalendar,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../api/notification";
import { useRealtimeUpdates } from "../../hooks/useRealtimeUpdates";
import { Link } from "react-router-dom";

// 28 notification types with icons
const NOTIFICATION_CONFIG = {
  // Interactions
  like: { icon: FiHeart, color: 'text-red-500', bgColor: 'bg-red-50' },
  comment: { icon: FiMessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  reply: { icon: FiMessageCircle, color: 'text-green-500', bgColor: 'bg-green-50' },
  mention: { icon: FiAtSign, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  tag: { icon: FiTag, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  share: { icon: FiShare2, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  
  // Follow
  follow: { icon: FiUserPlus, color: 'text-green-500', bgColor: 'bg-green-50' },
  follow_request: { icon: FiUserPlus, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  follow_accepted: { icon: FiCheckCircle, color: 'text-green-500', bgColor: 'bg-green-50' },
  
  // Posts
  post_scheduled: { icon: FiClock, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  post_published: { icon: FiCheckCircle, color: 'text-green-500', bgColor: 'bg-green-50' },
  post_liked: { icon: FiHeart, color: 'text-red-500', bgColor: 'bg-red-50' },
  post_milestone: { icon: FiAward, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  
  // Story
  story_view: { icon: FiVideo, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  story_like: { icon: FiHeart, color: 'text-red-500', bgColor: 'bg-red-50' },
  story_reply: { icon: FiMessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  story_mention: { icon: FiAtSign, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  
  // Messages
  message: { icon: FiMessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  message_group: { icon: FiMessageCircle, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  
  // Reports & Moderation
  report_received: { icon: FiAlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50' },
  report_resolved: { icon: FiCheckCircle, color: 'text-green-500', bgColor: 'bg-green-50' },
  report_declined: { icon: FiXCircle, color: 'text-gray-500', bgColor: 'bg-gray-50' },
  content_removed: { icon: FiAlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50' },
  warning: { icon: FiAlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  
  // Achievements & Events
  achievement: { icon: FiAward, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  milestone: { icon: FiStar, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  trending: { icon: FiTrendingUp, color: 'text-red-500', bgColor: 'bg-red-50' },
  
  // Default
  default: { icon: FiBell, color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

export default function EnhancedNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread, interactions, follows
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Real-time updates
  useRealtimeUpdates({
    onNewNotification: (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      setNotifications(res.notifies || []);
      setUnreadCount(res.result || 0);
    } catch (err) {
      console.error("Lỗi load thông báo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((noti) => ({ ...noti, isRead: true }))
      );
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification._id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
      } catch (err) {
        console.error("Mark read error:", err);
      }
    }
  };

  const getNotificationIcon = (type) => {
    const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.default;
    const IconComponent = config.icon;
    return (
      <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
        <IconComponent className={`${config.color} text-lg`} />
      </div>
    );
  };

  const getNotificationAction = (notification) => {
    // Return action button based on notification type
    switch (notification.type) {
      case 'report_received':
        return (
          <Link
            to={`/admin/reports/${notification.reportId}`}
            className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200 transition"
          >
            Xem báo cáo
          </Link>
        );
      case 'follow_request':
        return (
          <div className="flex gap-2">
            <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition">
              Chấp nhận
            </button>
            <button className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition">
              Từ chối
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'interactions') return ['like', 'comment', 'reply', 'share'].includes(n.type);
    if (filter === 'follows') return ['follow', 'follow_request', 'follow_accepted'].includes(n.type);
    return true;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key;
    if (date.toDateString() === today.toDateString()) {
      key = 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Hôm qua';
    } else {
      key = 'Cũ hơn';
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(notification);
    return groups;
  }, {});

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <div className="relative cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <FiBell className="text-2xl text-gray-600 hover:text-gray-800 transition" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Thông báo</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Đánh dấu tất cả
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'unread', label: 'Chưa đọc' },
                { key: 'interactions', label: 'Tương tác' },
                { key: 'follows', label: 'Theo dõi' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    filter === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : Object.keys(groupedNotifications).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiBell className="text-4xl mx-auto mb-2 opacity-50" />
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              Object.entries(groupedNotifications).map(([group, notifs]) => (
                <div key={group}>
                  <div className="px-4 py-2 bg-gray-50 border-b sticky top-0 z-10">
                    <p className="text-xs font-semibold text-gray-600 uppercase">
                      {group}
                    </p>
                  </div>
                  {notifs.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition cursor-pointer border-b border-gray-50 ${
                        !notification.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {getNotificationIcon(notification.type)}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-snug">
                          <span className="font-semibold">
                            {notification.user?.fullname}
                          </span>{" "}
                          {notification.text}
                        </p>

                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </p>

                          {getNotificationAction(notification)}
                        </div>
                      </div>

                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0"></div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}