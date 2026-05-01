import { useState } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import useFetch from "../../hooks/useFetch";
import { getAnnouncements, createAnnouncement } from "../../services/announcementService";
import { getDepartments } from "../../services/departmentService";

const Announcements = () => {
  const { data: announcements, loading, error, refetch } = useFetch(getAnnouncements);
  const { data: depts } = useFetch(getDepartments);

  const [form, setForm]           = useState({ title:"", body:"", target_role:"all", target_dept_id:"" });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaveMsg("");
    const errs = {};
    if (!form.title.trim()) errs.title = "Required";
    if (!form.body.trim())  errs.body  = "Required";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      await createAnnouncement({ ...form, target_dept_id: form.target_dept_id || null });
      setSaveMsg("Announcement created.");
      setForm({ title:"", body:"", target_role:"all", target_dept_id:"" });
      refetch();
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "Failed to create.");
    } finally { setSaving(false); }
  };

  return (
    <CollegeLayout pageTitle="Announcements">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:24 }}>
        {/* Left: list */}
        <div>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14, color:"#1e293b" }}>
            All Announcements
          </h3>
          {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {(!announcements || announcements.length === 0)
                ? <p className="empty-state">No announcements yet.</p>
                : (announcements || []).map(a => (
                  <div key={a.id} style={{
                    background:"#fff", border:"1px solid #e2e8f0", borderRadius:8,
                    padding:"14px 16px",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"#1e293b", flex:1 }}>{a.title}</span>
                      <span style={{
                        fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20,
                        background: a.target_role === "all" ? "#eff6ff" : a.target_role === "student" ? "#f0fdf4" : "#fdf4ff",
                        color: a.target_role === "all" ? "#1e40af" : a.target_role === "student" ? "#166534" : "#7e22ce",
                      }}>
                        {a.target_role}
                      </span>
                      <span style={{ fontSize:11, color:"#94a3b8" }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontSize:13, color:"#475569", margin:0, lineHeight:1.5 }}>{a.body}</p>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Right: create form */}
        <div>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14, color:"#1e293b" }}>
            Create Announcement
          </h3>
          <form className="erp-form" onSubmit={handleSubmit} noValidate>
            <div className="erp-form-group" style={{ marginBottom:14 }}>
              <label>Title *</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="Announcement title" />
              {formErrors.title && <span className="erp-form-error">{formErrors.title}</span>}
            </div>
            <div className="erp-form-group" style={{ marginBottom:14 }}>
              <label>Body *</label>
              <textarea name="body" value={form.body} onChange={handleChange} rows={5}
                placeholder="Announcement details…" />
              {formErrors.body && <span className="erp-form-error">{formErrors.body}</span>}
            </div>
            <div className="erp-form-group" style={{ marginBottom:14 }}>
              <label>Target Role</label>
              <select name="target_role" value={form.target_role} onChange={handleChange}>
                <option value="all">All</option>
                <option value="student">Students Only</option>
                <option value="teacher">Teachers Only</option>
              </select>
            </div>
            <div className="erp-form-group" style={{ marginBottom:14 }}>
              <label>Target Department (optional)</label>
              <select name="target_dept_id" value={form.target_dept_id} onChange={handleChange}>
                <option value="">All Departments</option>
                {(depts || []).map(d => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>
            {saveMsg && (
              <p style={{ fontSize:13, color: saveMsg.includes("created") ? "#16a34a" : "#dc2626", marginBottom:10 }}>
                {saveMsg}
              </p>
            )}
            <button type="submit" className="erp-btn erp-btn--primary" disabled={saving} style={{ width:"100%" }}>
              {saving ? "Publishing…" : "Publish Announcement"}
            </button>
          </form>
        </div>
      </div>
    </CollegeLayout>
  );
};

export default Announcements;
