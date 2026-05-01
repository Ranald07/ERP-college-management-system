import apiClient from "./apiClient";

export const getDepartments = () => apiClient.get("/departments").then(r => r.data);
export const getSubjects    = () => apiClient.get("/subjects").then(r => r.data);
