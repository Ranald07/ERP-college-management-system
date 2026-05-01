import apiClient from "./apiClient";
export const getAnnouncements   = ()        => apiClient.get("/announcements").then(r => r.data);
export const markRead           = (id)      => apiClient.patch(`/announcements/${id}/read`).then(r => r.data);
export const getUnreadCount     = ()        => apiClient.get("/announcements/unread-count").then(r => r.data);
export const createAnnouncement = (payload) => apiClient.post("/announcements", payload).then(r => r.data);
