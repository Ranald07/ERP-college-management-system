import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { getTeacherById, updateTeacher, updateSubjectAssign } from "../../services/teacherService";
import { getDepartments, getSubjects } from "../../services/departmentService";

const DESIGNATIONS = ["Professor","Associate Professor","Assistant Professor","Lecturer"];

const EditTeacher = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher]           = useState(null);
  const [allSubjects, setAllSubjects]   = useState([]);
  const [depts, setDepts]               = useState([]);
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [form, setForm]                 = useState({});
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);
  const [serverError, setServerError]   = useState("");

  useEffect(() => {
    Promise.all([getTeacherById(id), getSubjects(), getDepartments()])
      .then(([tRes, sRes, dRes]) => {
        const t = tRes.data;
        setTeacher(t);
        setForm({ name:t.name, email:t.email, dept_id:t.dept_id, designation:t.designation, phone:t.phone||"" });
        setSelectedSubs((t.subjects||[]).map(s => s.id));
        setAllSubjects(sRes.data || []);
        setDepts(dRes.data || []);
      })
      .catch(err => setError(err.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleSubject = sid =>
    setSelectedSubs(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]);

  const handleSubmit = async e => {
    e.preventDefault();
    setServerError("");
    setSaving(true);
    try {
      await updateTeacher(id, form);
      await updateSubjectAssign(id, { subject_ids: selectedSubs });
      navigate("/admin/teachers");
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  };

  if (loading) return <CollegeLayout pageTitle="Edit Teacher"><LoadingSpinner /></CollegeLayout>;
  if (error)   return <CollegeLayout pageTitle="Edit Teacher"><ErrorMessage message={error} /></CollegeLayout>;

  const subjectsByDept = allSubjects.reduce((acc, s) => {
    if (!acc[s.dept_code]) acc[s.dept_code] = [];
    acc[s.dept_code].push(s);
    return acc;
  }, {});

  return (
    <CollegeLayout pageTitle="Edit Teacher">
      <form className="erp-form" onSubmit={handleSubmit} noValidate>
        <div className="erp-form-grid">
          <div className="erp-form-group">
            <label>Employee ID</label>
            <input value={teacher.employee_id} disabled />
          </div>
          <div className="erp-form-group">
            <label>Full Name *</label>
            <input name="name" value={form.name} onChange={e => setForm(p => ({ ...p, name:e.target.value }))} />
          </div>
          <div className="erp-form-group">
            <label>Email *</label>
            <input type="email" name="email" value={form.email} onChange={e => setForm(p => ({ ...p, email:e.target.value }))} />
          </div>
          <div className="erp-form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone:e.target.value }))} />
          </div>
          <div className="erp-form-group">
            <label>Department *</label>
            <select name="dept_id" value={form.dept_id} onChange={e => setForm(p => ({ ...p, dept_id:e.target.value }))}>
              {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </div>
          <div className="erp-form-group">
            <label>Designation</label>
            <select name="designation" value={form.designation} onChange={e => setForm(p => ({ ...p, designation:e.target.value }))}>
              {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop:24 }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:12, color:"#1e293b" }}>Subject Assignments</p>
          {Object.entries(subjectsByDept).map(([dept, subs]) => (
            <div key={dept} style={{ marginBottom:14 }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{dept}</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {subs.map(s => {
                  const active = selectedSubs.includes(s.id);
                  return (
                    <label key={s.id} style={{
                      display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                      padding:"5px 12px", borderRadius:6, fontSize:13, fontWeight:500,
                      background: active ? "#ede9fe" : "#f8fafc",
                      border: `1.5px solid ${active ? "#7c3aed" : "#e2e8f0"}`,
                      color: active ? "#7c3aed" : "#374151",
                    }}>
                      <input type="checkbox" checked={active} onChange={() => toggleSubject(s.id)}
                        style={{ accentColor:"#7c3aed" }} />
                      {s.name}
                      <span style={{ color:"#94a3b8", fontSize:11 }}>(Sem {s.semester})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {serverError && <p className="erp-form-error" style={{ marginTop:12 }}>{serverError}</p>}
        <div className="erp-form-actions">
          <button type="button" className="erp-btn erp-btn--outline" onClick={() => navigate("/admin/teachers")}>Cancel</button>
          <button type="submit" className="erp-btn erp-btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </CollegeLayout>
  );
};

export default EditTeacher;
