import { request } from "./request";
import { isDevelopment } from "../config";
import { mockNotifications } from "../data/mockData";
//Lấy danh sách thông báo
export const getNotifications = async () => {
  return request("/api/notifies?limit=10");
};
// Đánh dấu tất cả đã đọc
export const markAllNotificationsAsRead = async () => {
  return request("/api/notifies/read-all", {
    method: "PATCH",
  });
};
//Đánh dấu 1 thông báo là đã đọc
export const markNotificationAsRead = async (id) => {
  if (!id) throw new Error("Missing ID"); // Kiểm tra an toàn
  return request(`/api/notify/${id}/read`, {
    method: "PATCH",
  });
};
//Xoá thông báo
export const deleteNotification = async (notificationId) => {
  return request(`/api/notify/${id}`, {
    method: "DELETE",
  });
};
//Xoá all thông báo
export const deleteAllNotifications = async () => {
  return request("/api/notifies", {
    method: "DELETE",
  });
};
