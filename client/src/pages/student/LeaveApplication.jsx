import { useState } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import StatusBadge from "../../components/StatusBadge";
import useFetch from "../../hooks/useFetch";
import { getMyLeaves, applyLeave } from "../../services/leaveService";
import { getStudentById } from "../../services/studentService";
import { useAuth } from "../../context/AuthContext";

const daysBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / 86400000) + 1;

const LeaveApplication = () => {
  const { auth } = useAuth();
  const { data: leaves, loading, error, refetch } = useFetch(getMyLeaves);
  const { data: profile } = useFetch(() => getStudentById(auth?.roleId), [auth?.roleId]);

  const [form, setForm]           = useState({ leave_type:"Medical", from_date:"", to_date:"", reason:"" });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setFormErrors(p => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.from_date) e.from_date = "Required";
    if (!form.to_date)   e.to_date   = "Required";
    if (form.from_date && form.from_date < today) e.from_date = "Cannot be in the past";
    if (form.from_date && form.to_date && form.to_date < form.from_date) e.to_date = "Must be after from date";
    if (!form.reason.trim()) e.reason = "Required";
    if (form.reason.trim().length < 20) e.reason = "Minimum 20 characters";
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaveMsg("");
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      await applyLeave(form);
      setSaveMsg("Leave application submitted successfully.");
      setForm({ leave_type:"Medical", from_date:"", to_date:"", reason:"" });
      refetch();
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "Failed to submit.");
    } finally { setSaving(false); }
  };

  // Get advisor name from profile — useFetch already unwraps, profile is the object directly
  const advisorName = profile?.advisor_name || null;

  return (
    <CollegeLayout pageTitle="Leave Application">
      {/* Advisor info */}
      <div style={{
        background: advisorName ? "#f0fdf4" : "#fffbeb",
        border: `1px solid ${advisorName ? "#bbf7d0" : "#fde68a"}`,
        borderRadius:8, padding:"10px 16px", marginBottom:20, fontSize:13,
        color: advisorName ? "#166534" : "#92400e",
      }}>
        {advisorName
          ? `Your staff advisor: ${advisorName}`
          : "No staff advisor assigned. Contact admin to assign one before applying for leave."
        }
      </div>

      {/* Leave history */}
      <div style={{ marginBottom:28 }}>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12, color:"#1e293b" }}>Leave History</h3>
        {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
          (!leaves || leaves.length === 0)
            ? <p className="empty-state">No leave applications found.</p>
            : (
              <table className="data-table">
                <thead>
                  <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Applied On</th><th>Remarks</th></tr>
                </thead>
                <tbody>
                  {(leaves || []).map(l => (
                    <tr key={l.id}>
                      <td>{l.leave_type}</td>
                      <td>{l.from_date}</td>
                      <td>{l.to_date}</td>
                      <td>{daysBetween(l.from_date, l.to_date)}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td style={{ fontSize:12, color:"#64748b" }}>{new Date(l.applied_at).toLocaleDateString()}</td>
                      <td style={{ fontSize:12, color:"#64748b", fontStyle:"italic" }}>
                        {l.advisor_remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        )}
      </div>

      {/* Apply form */}
      <div>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12, color:"#1e293b" }}>Apply for Leave</h3>
        <form className="erp-form" onSubmit={handleSubmit} noValidate style={{ maxWidth:560 }}>
          <div className="erp-form-grid">
            <div className="erp-form-group">
              <label>Leave Type *</label>
              <select name="leave_type" value={form.leave_type} onChange={handleChange}>
                {["Medical","Personal","Family","Academic","Other"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="erp-form-group">
              <label>From Date *</label>
              <input type="date" name="from_date" value={form.from_date} min={today} onChange={handleChange} />
              {formErrors.from_date && <span className="erp-form-error">{formErrors.from_date}</span>}
            </div>
            <div className="erp-form-group">
              <label>
                To Date *
                {form.from_date && form.to_date && form.to_date >= form.from_date &&
                  <span style={{ color:"#64748b", fontWeight:400, marginLeft:8 }}>
                    ({daysBetween(form.from_date, form.to_date)} day{daysBetween(form.from_date, form.to_date)>1?"s":""})
                  </span>
                }
              </label>
              <input type="date" name="to_date" value={form.to_date} min={form.from_date || today} onChange={handleChange} />
              {formErrors.to_date && <span className="erp-form-error">{formErrors.to_date}</span>}
            </div>
            <div className="erp-form-group" style={{ gridColumn:"1/-1" }}>
              <label>Reason * <span style={{ color:"#94a3b8", fontWeight:400 }}>(min 20 chars)</span></label>
              <textarea name="reason" value={form.reason} onChange={handleChange} rows={4}
                placeholder="Describe the reason for leave…" />
              {formErrors.reason && <span className="erp-form-error">{formErrors.reason}</span>}
            </div>
          </div>
          {saveMsg && (
            <p style={{ fontSize:13, color: saveMsg.includes("success") ? "#16a34a" : "#dc2626", marginBottom:10 }}>
              {saveMsg}
            </p>
          )}
          <div className="erp-form-actions">
            <button type="submit" className="erp-btn erp-btn--primary" disabled={saving}>
              {saving ? "Submitting…" : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </CollegeLayout>
  );
};

export default LeaveApplication;
