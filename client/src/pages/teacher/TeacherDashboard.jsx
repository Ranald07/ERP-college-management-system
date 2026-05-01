import { useState, useEffect } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { getMySubjects, getStudentsForSubject } from "../../services/teacherService";
import { saveBulkMarks } from "../../services/marksService";

const TeacherDashboard = () => {
  const [subjects, setSubjects]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [studentsData, setStudentsData] = useState(null);
  const [marks, setMarks]               = useState({});
  const [loading, setLoading]           = useState(true);
  const [subLoading, setSubLoading]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);
  const [saveMsg, setSaveMsg]           = useState("");

  useEffect(() => {
    getMySubjects()
      .then(res => {
        // res is already { success, data, message } — extract .data
        setSubjects(res.data || []);
      })
      .catch(err => setError(err.response?.data?.message || "Failed to load subjects"))
      .finally(() => setLoading(false));
  }, []);

  const loadStudents = async (subjectId) => {
    setSubLoading(true);
    setSaveMsg("");
    setStudentsData(null);
    try {
      const res = await getStudentsForSubject(subjectId);
      // res.data = { subject: {...}, students: [...] }
      const payload = res.data;
      setStudentsData(payload);
      setSelected(subjectId);
      const m = {};
      (payload.students || []).forEach(s => {
        m[s.id] = {
          internal1: Number(s.internal1) || 0,
          internal2: Number(s.internal2) || 0,
          internal3: Number(s.internal3) || 0,
          ext_marks: Number(s.ext_marks)  || 0,
        };
      });
      setMarks(m);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load students");
    } finally { setSubLoading(false); }
  };

  const handleMarkChange = (studentId, field, value) => {
    const maxMap = { internal1: 50, internal2: 50, internal3: 50, ext_marks: 60 };
    const val = Math.min(Math.max(0, Number(value) || 0), maxMap[field]);
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: val } }));
  };

  const handleSave = async () => {
    if (!studentsData) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await saveBulkMarks({
        subject_id: selected,
        semester:   studentsData.subject.semester,
        marks: Object.entries(marks).map(([student_id, m]) => ({
          student_id: Number(student_id),
          internal1:  m.internal1,
          internal2:  m.internal2,
          internal3:  m.internal3,
          ext_marks:  m.ext_marks,
        })),
      });
      if (res.success) {
        setSaveMsg("✓ Marks saved successfully.");
        // Reload to show updated totals
        await loadStudents(selected);
      } else {
        setSaveMsg("✗ " + res.message);
      }
    } catch (err) {
      setSaveMsg("✗ " + (err.response?.data?.message || "Failed to save marks."));
    } finally { setSaving(false); }
  };

  if (loading) return <CollegeLayout pageTitle="Marks Entry"><LoadingSpinner /></CollegeLayout>;
  if (error)   return <CollegeLayout pageTitle="Marks Entry"><ErrorMessage message={error} /></CollegeLayout>;

  return (
    <CollegeLayout pageTitle="Marks Entry">
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Select a subject to view enrolled students and enter marks.
      </p>

      {subjects.length === 0 ? (
        <p className="empty-state">No subjects assigned to you yet. Contact admin.</p>
      ) : (
        <div className="erp-marks-subject-grid">
          {subjects.map(s => (
            <div
              key={s.id}
              className={`erp-subject-card ${selected === s.id ? "erp-subject-card--active" : ""}`}
              onClick={() => loadStudents(s.id)}
            >
              <p className="erp-subject-card__code">{s.code}</p>
              <p className="erp-subject-card__name">{s.name}</p>
              <p className="erp-subject-card__meta">
                {s.dept_code} · Sem {s.semester} · Year {s.year}
                {s.marks_locked === 1 && (
                  <span style={{ marginLeft:6, fontSize:10, background:"#f1f5f9",
                    color:"#64748b", padding:"1px 6px", borderRadius:10, fontWeight:600 }}>
                    🔒 Locked
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {subLoading && <LoadingSpinner />}

      {!subLoading && studentsData && (
        <div style={{ marginTop: 24 }}>
          <div className="dash-section__header" style={{ marginBottom: 14 }}>
            <span className="dash-section__title">
              {studentsData.subject.name}
              <span style={{ color: "#64748b", fontWeight: 400, marginLeft: 8 }}>
                — Semester {studentsData.subject.semester}
              </span>
            </span>
            <span className="dash-section__count">
              {studentsData.students.length} student{studentsData.students.length !== 1 ? "s" : ""}
            </span>
          </div>

          {studentsData.students.length === 0 ? (
            <p className="empty-state">
              No students found for this subject's department (Year {studentsData.subject.year}).
            </p>
          ) : (
            <>
              {studentsData.subject.marks_locked === 1 && (
                <div style={{
                  background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8,
                  padding:"10px 16px", marginBottom:14, fontSize:13, color:"#991b1b",
                  display:"flex", alignItems:"center", gap:8,
                }}>
                  🔒 <strong>Marks are locked for this subject by admin.</strong> Contact admin to unlock.
                </div>
              )}
              <div className="erp-marks-wrapper">
                <table className="erp-marks-table">
                  <thead>
                    <tr>
                      <th>Reg No</th>
                      <th>Student Name</th>
                      <th>Internal 1 <small style={{ fontWeight: 400 }}>/50</small></th>
                      <th>Internal 2 <small style={{ fontWeight: 400 }}>/50</small></th>
                      <th>Internal 3 <small style={{ fontWeight: 400 }}>/50</small></th>
                      <th>External <small style={{ fontWeight: 400 }}>/60</small></th>
                      <th>Converted /40</th>
                      <th>Total /100</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsData.students.map(s => {
                      const m = marks[s.id] || { internal1: 0, internal2: 0, internal3: 0, ext_marks: 0 };
                      const converted = parseFloat(((m.internal1 + m.internal2 + m.internal3) * 40 / 150).toFixed(2));
                      const total     = parseFloat((converted + m.ext_marks).toFixed(2));
                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600, color: "#1e40af" }}>{s.reg_no}</td>
                          <td style={{ textAlign: "left" }}>{s.name}</td>
                          {[
                            { field: "internal1", max: 50 },
                            { field: "internal2", max: 50 },
                            { field: "internal3", max: 50 },
                            { field: "ext_marks", max: 60 },
                          ].map(({ field, max }) => (
                            <td key={field}>
                              <input
                                type="number"
                                min="0"
                                max={max}
                                value={m[field]}
                                onChange={e => handleMarkChange(s.id, field, e.target.value)}
                                style={{
                                  width: 64, padding: "4px 6px",
                                  border: "1px solid #d1d5db", borderRadius: 4,
                                  textAlign: "center", fontSize: 13,
                                }}
                              />
                            </td>
                          ))}
                          <td style={{ fontWeight: 600, color: "#7c3aed" }}>{converted}</td>
                          <td style={{ fontWeight: 700, color: total >= 50 ? "#16a34a" : "#dc2626" }}>
                            {total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
                <button
                  className="erp-btn erp-btn--primary"
                  onClick={handleSave}
                  disabled={saving || studentsData.subject.marks_locked === 1}
                  title={studentsData.subject.marks_locked === 1 ? "Marks locked by admin" : ""}
                >
                  {saving ? "Saving…" : "Save All Marks"}
                </button>
                {saveMsg && (
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: saveMsg.startsWith("✓") ? "#16a34a" : "#dc2626",
                  }}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </CollegeLayout>
  );
};

export default TeacherDashboard;
