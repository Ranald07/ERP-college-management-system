import apiClient from "./apiClient";

export const getTeachers           = ()           => apiClient.get("/teachers").then(r => r.data);
export const getTeacherById        = (id)         => apiClient.get(`/teachers/${id}`).then(r => r.data);
export const createTeacher         = (data)       => apiClient.post("/teachers", data).then(r => r.data);
export const updateTeacher         = (id, data)   => apiClient.put(`/teachers/${id}`, data).then(r => r.data);
export const deleteTeacher         = (id)         => apiClient.delete(`/teachers/${id}`).then(r => r.data);
export const updateSubjectAssign   = (id, data)   => apiClient.put(`/teachers/${id}/subjects`, data).then(r => r.data);
export const getMySubjects         = ()           => apiClient.get("/teachers/my-subjects").then(r => r.data);
export const getStudentsForSubject = (subjectId)  => apiClient.get(`/teachers/subject/${subjectId}/students`).then(r => r.data);
