import apiClient from "./apiClient";
export const applyLeave      = (payload)     => apiClient.post("/leaves", payload).then(r => r.data);
export const getMyLeaves     = ()            => apiClient.get("/leaves/my").then(r => r.data);
export const getAdviseeLeaves= ()            => apiClient.get("/leaves/advisees").then(r => r.data);
export const reviewLeave     = (id, payload) => apiClient.patch(`/leaves/${id}/review`, payload).then(r => r.data);
