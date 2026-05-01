import apiClient from "./apiClient";
export const createQuery     = (payload) => apiClient.post("/queries", payload).then(r => r.data);
export const getMyQueries    = ()        => apiClient.get("/queries/my").then(r => r.data);
export const getQueryDetail  = (id)      => apiClient.get(`/queries/${id}`).then(r => r.data);
export const replyToQuery    = (id, payload) => apiClient.post(`/queries/${id}/reply`, payload).then(r => r.data);
export const closeQuery      = (id)      => apiClient.patch(`/queries/${id}/close`).then(r => r.data);
export const getTeacherInbox = ()        => apiClient.get("/queries/teacher/inbox").then(r => r.data);
