import apiClient from "./apiClient";
export const assignAdvisor  = (studentId, teacherId) => apiClient.put(`/students/${studentId}/advisor`, { teacher_id: teacherId }).then(r => r.data);
export const getMyAdvisees  = ()                      => apiClient.get("/teachers/my-advisees").then(r => r.data);
