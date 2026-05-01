import apiClient from "./apiClient";

export const getStudents    = (params)    => apiClient.get("/students", { params }).then(r => r.data);
export const getStudentById = (id)        => apiClient.get(`/students/${id}`).then(r => r.data);
export const createStudent  = (data)      => apiClient.post("/students", data).then(r => r.data);
export const updateStudent  = (id, data)  => apiClient.put(`/students/${id}`, data).then(r => r.data);
