import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { getStudentById } from "../../services/studentService";
import { getStudentStats } from "../../services/statsService";
import { getAchievements, addAchievement } from "../../services/achievementService";
import { getTeachers } from "../../services/teacherService";
import { assignAdvisor } from "../../services/advisorService";

const CATEGORIES = ["Technical","Sports","Cultural","Academic","Other"];
const catIcon    = { Technical:"💻", Sports:"🏅", Cultural:"🎭", Academic:"📚", Other:"🏆" };

const Row = ({ label, value }) => (
  <tr>
    <td className="erp-profile-label">{label}</td>
    <td className="erp-profile-colon">:</td>
    <td className="erp-profile-value">{value ?? "—"}</td>
  </tr>
);

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile]           = useState(null);
  const [stats, setStats]               = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeTab, setActiveTab]       = useState("profile");
  const [achForm, setAchForm]           = useState({ title:"", description:"", category:"Technical", year: new Date().getFullYear() });
  const [achError, setAchError]         = useState("");
  const [achSaving, setAchSaving]       = useState(false);

  // Advisor assignment
  const [teachers, setTeachers]         = useState([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState("");
  const [advisorSaving, setAdvisorSaving] = useState(false);
  const [advisorMsg, setAdvisorMsg]     = useState("");

  useEffect(() => {
    Promise.all([getStudentById(id), getStudentStats(id), getAchievements(id), getTeachers()])
      .then(([pRes, sRes, aRes, tRes]) => {
        setProfile(pRes.data);
        setStats(sRes.data);
        setAchievements(aRes.data || []);
        setTeachers(tRes.data || []);
        setSelectedAdvisor(pRes.data?.staff_advisor_id || "");
      })
      .catch(err => setError(err.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddAchievement = async e => {
    e.preventDefault();
    setAchError("");
    if (!achForm.title) { setAchError("Title required"); return; }
    setAchSaving(true);
    try {
      await addAchievement({ ...achForm, student_id: Number(id) });
      const aRes = await getAchievements(id);
      setAchievements(aRes.data || []);
      setAchForm({ title:"", description:"", category:"Technical", year: new Date().getFullYear() });
    } catch (err) {
      setAchError(err.response?.data?.message || "Failed");
    } finally { setAchSaving(false); }
  };

  if (loading) return <CollegeLayout pageTitle="Student Profile"><LoadingSpinner /></CollegeLayout>;
  if (error)   return <CollegeLayout pageTitle="Student Profile"><ErrorMessage message={error} /></CollegeLayout>;

  const chartData = {
    labels: stats.semesterData.map(s => `Sem ${s.semester}`),
    datasets: [{ label:"Avg", data: stats.semesterData.map(s => s.avg),
      backgroundColor:"#4472C4", borderRadius:4 }],
  };

  return (
    <CollegeLayout pageTitle="Student Profile">
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <button className="erp-btn erp-btn--outline" onClick={() => navigate(-1)}>← Back</button>
        <button className="erp-btn erp-btn--primary" onClick={() => navigate(`/admin/students/${id}/edit`)}>Edit Student</button>
      </div>

      <div className="erp-admin-tabs">
        {["profile","marks","achievements"].map(t => (
          <button key={t} className={`erp-admin-tab ${activeTab===t?"erp-admin-tab--active":""}`}
            onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="erp-profile-wrap">
          <div className="erp-profile-photo-wrap">
            {profile.photo_url
              ? <img src={profile.photo_url} alt={profile.name} className="erp-profile-photo" />
              : <div className="erp-profile-photo erp-profile-photo--placeholder">👤</div>}
          </div>
          <table className="erp-profile-table"><tbody>
            <Row label="Name"              value={profile.name} />
            <Row label="Registration No"   value={profile.reg_no} />
            <Row label="Department"        value={`${profile.dept} — ${profile.dept_name}`} />
            <Row label="Year"              value={`Year ${profile.year}`} />
            <Row label="Gender"            value={profile.gender} />
            <Row label="Date of Birth"     value={profile.dob} />
            <Row label="Email"             value={profile.email} />
            <Row label="Phone"             value={profile.phone || "—"} />
            <Row label="Accommodation"     value={profile.accommodation_type} />
            <Row label="Room No"           value={profile.room_no || "NA"} />
            <Row label="Staff Advisor"     value={profile.advisor_name || <span style={{ color:"#94a3b8" }}>Not assigned</span>} />
          </tbody></table>
          <div className="erp-section-heading">Academic Performance</div>
          <table className="erp-profile-table"><tbody>
            <Row label="CGPA (10 scale)"   value={stats.cgpa} />
            <Row label="Trend"             value={stats.trend} />
            <Row label="Semesters"         value={stats.semesterData.length} />
          </tbody></table>

          {/* Assign Advisor */}
          <div className="erp-section-heading" style={{ marginTop:16 }}>Assign Staff Advisor</div>
          <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:10 }}>
            <select className="erp-select" value={selectedAdvisor}
              onChange={e => setSelectedAdvisor(e.target.value)}>
              <option value="">— Not assigned —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.employee_id}) — {t.dept}</option>
              ))}
            </select>
            <button className="erp-btn erp-btn--primary erp-btn--sm"
              disabled={advisorSaving}
              onClick={async () => {
                setAdvisorSaving(true); setAdvisorMsg("");
                try {
                  await assignAdvisor(id, selectedAdvisor || null);
                  setAdvisorMsg("Advisor updated.");
                  const pRes = await getStudentById(id);
                  setProfile(pRes.data);
                } catch (e) {
                  setAdvisorMsg(e.response?.data?.message || "Failed.");
                } finally { setAdvisorSaving(false); }
              }}>
              {advisorSaving ? "Saving…" : "Save Advisor"}
            </button>
          </div>
          {advisorMsg && (
            <p style={{ fontSize:12, marginTop:6,
              color: advisorMsg.includes("updated") ? "#16a34a" : "#dc2626" }}>
              {advisorMsg}
            </p>
          )}
        </div>
      )}

      {activeTab === "marks" && (
        <div>
          {stats.semesterData.length === 0
            ? <p className="empty-state">No marks recorded yet. Marks are entered by subject teachers.</p>
            : <>
              <div style={{ maxWidth:560, margin:"0 auto 24px" }}>
                <Bar data={chartData} options={{ responsive:true, plugins:{ legend:{ display:false } } }} />
              </div>
              <table className="erp-marks-table">
                <thead><tr><th>Semester</th><th>Subjects</th><th>Average</th><th>Percentage</th></tr></thead>
                <tbody>
                  {stats.semesterData.map(s => (
                    <tr key={s.semester}>
                      <td className="erp-marks-sem">{s.semester}</td>
                      <td>{s.subjects.length}</td>
                      <td>{s.avg}</td>
                      <td>{s.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          }
        </div>
      )}

      {activeTab === "achievements" && (
        <div>
          {achievements.length === 0
            ? <p className="empty-state">No achievements yet.</p>
            : <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
              {achievements.map(a => (
                <div key={a.id} style={{ display:"flex", gap:12, background:"#f8fafc",
                  border:"1px solid #e2e8f0", borderRadius:8, padding:"12px 16px" }}>
                  <span style={{ fontSize:22 }}>{catIcon[a.category]||"🏆"}</span>
                  <div>
                    <strong style={{ fontSize:14 }}>{a.title}</strong>
                    <span style={{ fontSize:12, color:"#64748b", marginLeft:8 }}>{a.category} · {a.year}</span>
                    {a.description && <p style={{ fontSize:13, color:"#475569", margin:"4px 0 0" }}>{a.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          }
          <div className="erp-section-heading">Add Achievement</div>
          <form className="erp-form" onSubmit={handleAddAchievement}>
            <div className="erp-form-grid">
              <div className="erp-form-group">
                <label>Title *</label>
                <input value={achForm.title} onChange={e => setAchForm(p => ({ ...p, title:e.target.value }))} />
              </div>
              <div className="erp-form-group">
                <label>Category</label>
                <select value={achForm.category} onChange={e => setAchForm(p => ({ ...p, category:e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="erp-form-group">
                <label>Year</label>
                <input type="number" value={achForm.year} onChange={e => setAchForm(p => ({ ...p, year:Number(e.target.value) }))} />
              </div>
              <div className="erp-form-group" style={{ gridColumn:"1/-1" }}>
                <label>Description</label>
                <textarea value={achForm.description} onChange={e => setAchForm(p => ({ ...p, description:e.target.value }))} rows={3} />
              </div>
            </div>
            {achError && <p className="erp-form-error">{achError}</p>}
            <div className="erp-form-actions">
              <button type="submit" className="erp-btn erp-btn--primary" disabled={achSaving}>
                {achSaving ? "Adding…" : "Add Achievement"}
              </button>
            </div>
          </form>
        </div>
      )}
    </CollegeLayout>
  );
};

export default StudentProfile;
