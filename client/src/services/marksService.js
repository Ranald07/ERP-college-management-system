import apiClient from "./apiClient";

export const saveBulkMarks    = (data)      => apiClient.post("/marks/bulk", data).then(r => r.data);
export const getMarksByStudent = (studentId) => apiClient.get(`/marks/${studentId}`).then(r => r.data);
