import apiClient from "./apiClient";

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const exportStudents = async (params = {}) => {
  const res = await apiClient.get("/export/students", { params, responseType: "blob" });
  const date = new Date().toISOString().slice(0,10);
  download(res.data, `apr_students_${params.dept||"all"}_${params.year||"all"}_${date}.xlsx`);
};

export const exportMarks = async (subjectId, subjectCode = "marks") => {
  const res = await apiClient.get(`/export/marks/${subjectId}`, { responseType: "blob" });
  const date = new Date().toISOString().slice(0,10);
  download(res.data, `apr_marks_${subjectCode}_${date}.xlsx`);
};

export const exportSubjectAnalysis = async () => {
  const res = await apiClient.get("/export/subject-analysis", { responseType: "blob" });
  const date = new Date().toISOString().slice(0,10);
  download(res.data, `apr_subject_analysis_${date}.xlsx`);
};
