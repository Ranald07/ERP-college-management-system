import apiClient from "./apiClient";
export const getAdminStats        = ()   => apiClient.get("/stats/admin").then(r => r.data);
export const getStudentStats      = (id) => apiClient.get(`/stats/student/${id}`).then(r => r.data);
export const getSubjectAnalysis   = ()   => apiClient.get("/stats/subject-analysis").then(r => r.data);
export const getTeacherPerformance= ()   => apiClient.get("/stats/teacher-performance").then(r => r.data);
export const getStudentRank       = (id) => apiClient.get(`/stats/student/${id}/rank`).then(r => r.data);
