import React, { useState } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import StatusBadge from "../../components/StatusBadge";
import useFetch from "../../hooks/useFetch";
import { getAdviseeLeaves, reviewLeave } from "../../services/leaveService";

const daysBetween = (from, to) => {
  const d = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  return d > 0 ? d : 1;
};

const AdviseeLeaves = () => {
  const { data: leaves, loading, error, refetch } = useFetch(getAdviseeLeaves);
  const [filter, setFilter]     = useState("All");
  const [reviewing, setReviewing] = useState({}); // { [id]: { open, remarks, saving, msg } }

  const filtered = (leaves || []).filter(l => filter === "All" || l.status === filter);

  const openReview = (id) => setReviewing(prev => ({
    ...prev, [id]: { open: true, remarks: "", saving: false, msg: "" }
  }));

  const handleReview = async (id, status) => {
    const r = reviewing[id];
    setReviewing(prev => ({ ...prev, [id]: { ...prev[id], saving: true } }));
    try {
      await reviewLeave(id, { status, advisor_remarks: r.remarks });
      setReviewing(prev => ({ ...prev, [id]: { open: false, remarks: "", saving: false, msg: "" } }));
      refetch();
    } catch (err) {
      setReviewing(prev => ({ ...prev, [id]: { ...prev[id], saving: false,
        msg: err.response?.data?.message || "Failed" } }));
    }
  };

  const pendingCount   = (leaves||[]).filter(l => l.status === "Pending").length;
  const approvedMonth  = (leaves||[]).filter(l => l.status === "Approved" &&
    new Date(l.reviewed_at) > new Date(Date.now() - 30*86400000)).length;
  const rejectedMonth  = (leaves||[]).filter(l => l.status === "Rejected" &&
    new Date(l.reviewed_at) > new Date(Date.now() - 30*86400000)).length;

  return (
    <CollegeLayout pageTitle="Advisee Leave Requests">
      {/* Stats */}
      <div className="kpi-row" style={{ marginBottom:20 }}>
        {[
          { label:"Total Pending",       value: pendingCount,  accent:"#d97706" },
          { label:"Approved This Month", value: approvedMonth, accent:"#16a34a" },
          { label:"Rejected This Month", value: rejectedMonth, accent:"#dc2626" },
        ].map(c => (
          <div key={c.label} className="kpi-card">
            <div className="kpi-card__accent" style={{ background: c.accent }} />
            <div className="kpi-card__body">
              <p className="kpi-card__label">{c.label}</p>
              <p className="kpi-card__value" style={{ color: c.accent }}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom:16 }}>
        {["All","Pending","Approved","Rejected"].map(f => (
          <button key={f} className={`tab ${filter===f?"tab--active":""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
        filtered.length === 0
          ? <p className="empty-state">No leave applications found.</p>
          : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th><th>Dept/Year</th><th>Type</th>
                  <th>From</th><th>To</th><th>Days</th>
                  <th>Status</th><th>Applied On</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <React.Fragment key={l.id}>
                    <tr>
                      <td>
                        <div style={{ fontWeight:600 }}>{l.student_name}</div>
                        <div style={{ fontSize:12, color:"#64748b" }}>{l.reg_no}</div>
                      </td>
                      <td>{l.dept} / Year {l.year}</td>
                      <td>{l.leave_type}</td>
                      <td>{l.from_date}</td>
                      <td>{l.to_date}</td>
                      <td>{daysBetween(l.from_date, l.to_date)}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td style={{ fontSize:12, color:"#64748b" }}>
                        {new Date(l.applied_at).toLocaleDateString()}
                      </td>
                      <td>
                        {l.status === "Pending" && !reviewing[l.id]?.open && (
                          <button className="erp-btn erp-btn--sm erp-btn--outline" onClick={() => openReview(l.id)}>
                            Review
                          </button>
                        )}
                        {l.advisor_remarks && l.status !== "Pending" && (
                          <span style={{ fontSize:12, color:"#64748b", fontStyle:"italic" }}>
                            "{l.advisor_remarks}"
                          </span>
                        )}
                      </td>
                    </tr>
                    {reviewing[l.id]?.open && (
                      <tr key={`${l.id}-review`}>
                        <td colSpan={9} style={{ background:"#f8fafc", padding:"12px 16px" }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:8, maxWidth:500 }}>
                            <label style={{ fontSize:12, fontWeight:600, color:"#64748b" }}>
                              Advisor Remarks (optional)
                            </label>
                            <textarea rows={2} value={reviewing[l.id].remarks}
                              onChange={e => setReviewing(prev => ({ ...prev, [l.id]: { ...prev[l.id], remarks: e.target.value } }))}
                              style={{ padding:"8px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:13 }}
                              placeholder="Add remarks for the student…" />
                            <div style={{ display:"flex", gap:8 }}>
                              <button className="erp-btn erp-btn--sm erp-btn--primary"
                                disabled={reviewing[l.id].saving}
                                onClick={() => handleReview(l.id, "Approved")}>
                                {reviewing[l.id].saving ? "…" : "Approve"}
                              </button>
                              <button className="erp-btn erp-btn--sm erp-btn--danger"
                                disabled={reviewing[l.id].saving}
                                onClick={() => handleReview(l.id, "Rejected")}>
                                Reject
                              </button>
                              <button className="erp-btn erp-btn--sm erp-btn--outline"
                                onClick={() => setReviewing(prev => ({ ...prev, [l.id]: { open:false } }))}>
                                Cancel
                              </button>
                            </div>
                            {reviewing[l.id].msg && (
                              <span style={{ fontSize:12, color:"#dc2626" }}>{reviewing[l.id].msg}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )
      )}
    </CollegeLayout>
  );
};

export default AdviseeLeaves;
