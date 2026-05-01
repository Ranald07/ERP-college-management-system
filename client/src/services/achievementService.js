import apiClient from "./apiClient";

export const getAchievements = (studentId) => apiClient.get(`/achievements/${studentId}`).then(r => r.data);
export const addAchievement  = (data)      => apiClient.post("/achievements", data).then(r => r.data);
