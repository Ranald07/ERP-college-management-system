import { useState, useEffect } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { useAuth } from "../../context/AuthContext";
import { getAchievements } from "../../services/achievementService";

const catStyle = {
  Technical: { bg:"#eff6ff", color:"#1e40af", border:"#bfdbfe" },
  Sports:    { bg:"#f0fdf4", color:"#166534", border:"#bbf7d0" },
  Cultural:  { bg:"#fdf4ff", color:"#7e22ce", border:"#e9d5ff" },
  Academic:  { bg:"#fffbeb", color:"#92400e", border:"#fde68a" },
  Other:     { bg:"#f8fafc", color:"#475569", border:"#e2e8f0" },
};
const catIcon = { Technical:"💻", Sports:"🏅", Cultural:"🎭", Academic:"📚", Other:"🏆" };

const StudentAchievements = () => {
  const { auth } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!auth?.roleId) return;
    getAchievements(auth.roleId)
      .then(res => setAchievements(res.data || []))
      .catch(err => setError(err.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [auth]);

  if (loading) return <CollegeLayout pageTitle="Achievements"><LoadingSpinner /></CollegeLayout>;
  if (error)   return <CollegeLayout pageTitle="Achievements"><ErrorMessage message={error} /></CollegeLayout>;

  return (
    <CollegeLayout pageTitle="Achievements">
      {achievements.length === 0
        ? <p className="empty-state">No achievements recorded yet.</p>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {achievements.map(a => {
              const s = catStyle[a.category] || catStyle.Other;
              return (
                <div key={a.id} style={{ display:"flex", gap:16, padding:"16px 20px",
                  background:s.bg, border:`1px solid ${s.border}`, borderRadius:10 }}>
                  <div style={{ fontSize:28, flexShrink:0 }}>{catIcon[a.category]||"🏆"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                      <strong style={{ fontSize:15, color:"#0f172a" }}>{a.title}</strong>
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20,
                        background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>{a.category}</span>
                      <span style={{ fontSize:12, color:"#64748b", marginLeft:"auto" }}>{a.year}</span>
                    </div>
                    {a.description && <p style={{ fontSize:13, color:"#475569", margin:0 }}>{a.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </CollegeLayout>
  );
};

export default StudentAchievements;
