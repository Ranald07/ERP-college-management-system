import apiClient from "./apiClient";
export const importStudentsCSV = (file) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient.post("/students/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};
