import apiClient from "./apiClient";
export const login          = (credentials) => apiClient.post("/auth/login", credentials).then(r => r.data);
export const changePassword = (payload)     => apiClient.put("/auth/change-password", payload).then(r => r.data);
