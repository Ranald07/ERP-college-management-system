import apiClient from "./apiClient";
export const getAuditLogs = (params) => apiClient.get("/audit", { params }).then(r => r.data);
