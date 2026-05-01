import { useEffect, useState } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { useAuth } from "../../context/AuthContext";
import { getStudentById } from "../../services/studentService";
import { getStudentStats, getStudentRank } from "../../services/statsService";
import { changePassword } from "../../services/authService";

const Row = ({ label, value }) => (
  <tr>
    <td className="erp-profile-label">{label}</td>
    <td className="erp-profile-colon">:</td>
    <td className="erp-profile-value">{value ?? "—"}</td>
  </tr>
);

const MyProfile = () => {
  const { auth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats]     = useState(null);
  const [rank, setRank]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [pwForm, setPwForm]   = useState({ current_password:"", new_password:"", confirm_password:"" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwMsg, setPwMsg]     = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!auth?.roleId) return;
    Promise.all([
      getStudentById(auth.roleId),
      getStudentStats(auth.roleId),
      getStudentRank(auth.roleId),
    ])
      .then(([pRes, sRes, rRes]) => {
        setProfile(pRes.data);
        setStats(sRes.data);
        setRank(rRes.data);
      })
      .catch(err => setError(err.response?.data?.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [auth]);

  const handlePwChange = e => {
    setPwForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setPwErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const handlePwSubmit = async e => {
    e.preventDefault();
    setPwMsg("");
    const errs = {};
    if (!pwForm.current_password) errs.current_password = "Required";
    if (!pwForm.new_password)     errs.new_password     = "Required";
    if (pwForm.new_password.length < 6) errs.new_password = "Min 6 characters";
    if (pwForm.new_password !== pwForm.confirm_password) errs.confirm_password = "Passwords do not match";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwSaving(true);
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwMsg("Password changed successfully.");
      setPwForm({ current_password:"", new_password:"", confirm_password:"" });
    } catch (err) {
      setPwMsg(err.response?.data?.message || "Failed to change password.");
    } finally { setPwSaving(false); }
  };

  if (loading) return <CollegeLayout pageTitle="Student Profile"><LoadingSpinner /></CollegeLayout>;
  if (error)   return <CollegeLayout pageTitle="Student Profile"><ErrorMessage message={error} /></CollegeLayout>;

  return (
    <CollegeLayout pageTitle="Student Profile">
      <div className="erp-profile-wrap">
        <div className="erp-profile-photo-wrap">
          {profile.photo_url
            ? <img src={profile.photo_url} alt={profile.name} className="erp-profile-photo" />
            : <div className="erp-profile-photo erp-profile-photo--placeholder">👤</div>}
        </div>
        <table className="erp-profile-table"><tbody>
          <Row label="Name of the Student"    value={profile.name} />
          <Row label="Gender"                 value={profile.gender} />
          <Row label="Date of Birth"          value={profile.dob} />
          <Row label="Registration Number"    value={profile.reg_no} />
          <Row label="Department"             value={`${profile.dept} — ${profile.dept_name}`} />
          <Row label="Year"                   value={`Year ${profile.year}`} />
          <Row label="Email"                  value={profile.email} />
          <Row label="Phone"                  value={profile.phone || "—"} />
          <Row label="Hosteller / Dayscholar" value={profile.accommodation_type} />
          <Row label="Room Number"            value={profile.room_no || "NA"} />
          <Row label="Staff Advisor"          value={profile.advisor_name || <span style={{ color:"#94a3b8" }}>Not assigned</span>} />
        </tbody></table>

        <div className="erp-section-heading">Academic Performance</div>
        <table className="erp-profile-table"><tbody>
          <Row label="CGPA (10 scale)"        value={stats?.cgpa ?? "—"} />
          <Row label="Performance Trend"      value={stats?.trend ?? "—"} />
          <Row label="Semesters Completed"    value={stats?.semesterData?.length ?? 0} />
          {rank && (
            <Row label="Department Rank"
              value={`Rank ${rank.rank} of ${rank.total_in_dept_year} in ${rank.dept_code} Year ${rank.year}`} />
          )}
        </tbody></table>
      </div>

      {/* Rank stat card */}
      {rank && (
        <div style={{ display:"flex", gap:16, margin:"20px 0" }}>
          <div className="kpi-card" style={{ maxWidth:260 }}>
            <div className="kpi-card__accent" style={{ background:"#7c3aed" }} />
            <div className="kpi-card__body">
              <p className="kpi-card__label">Department Rank</p>
              <p className="kpi-card__value" style={{ color:"#7c3aed" }}>
                {rank.rank} <span style={{ fontSize:16, fontWeight:400, color:"#94a3b8" }}>/ {rank.total_in_dept_year}</span>
              </p>
              <p className="kpi-card__sub">{rank.dept_code} · Year {rank.year}</p>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="erp-section-heading" style={{ marginTop:24 }}>Change Password</div>
      <form className="erp-form" onSubmit={handlePwSubmit} noValidate style={{ maxWidth:420, marginTop:12 }}>
        <div className="erp-form-group" style={{ marginBottom:12 }}>
          <label>Current Password *</label>
          <input type="password" name="current_password" value={pwForm.current_password} onChange={handlePwChange} />
          {pwErrors.current_password && <span className="erp-form-error">{pwErrors.current_password}</span>}
        </div>
        <div className="erp-form-group" style={{ marginBottom:12 }}>
          <label>New Password *</label>
          <input type="password" name="new_password" value={pwForm.new_password} onChange={handlePwChange} />
          {pwErrors.new_password && <span className="erp-form-error">{pwErrors.new_password}</span>}
        </div>
        <div className="erp-form-group" style={{ marginBottom:12 }}>
          <label>Confirm New Password *</label>
          <input type="password" name="confirm_password" value={pwForm.confirm_password} onChange={handlePwChange} />
          {pwErrors.confirm_password && <span className="erp-form-error">{pwErrors.confirm_password}</span>}
        </div>
        {pwMsg && (
          <p style={{ fontSize:13, color: pwMsg.includes("success") ? "#16a34a" : "#dc2626", marginBottom:10 }}>
            {pwMsg}
          </p>
        )}
        <button type="submit" className="erp-btn erp-btn--primary" disabled={pwSaving}>
          {pwSaving ? "Saving…" : "Change Password"}
        </button>
      </form>
    </CollegeLayout>
  );
};

export default MyProfile;
