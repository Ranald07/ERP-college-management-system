import { useState } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import StatusBadge from "../../components/StatusBadge";
import useFetch from "../../hooks/useFetch";
import { getMyQueries, getQueryDetail, replyToQuery, createQuery } from "../../services/queryService";
import { getMarksByStudent } from "../../services/marksService";
import { useAuth } from "../../context/AuthContext";

const timeAgo = (dt) => {
  const diff = Date.now() - new Date(dt);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};

const QueryCenter = () => {
  const { auth } = useAuth();
  const { data: queries, loading, error, refetch } = useFetch(getMyQueries);
  const { data: marksData } = useFetch(() => getMarksByStudent(auth?.roleId), [auth?.roleId]);

  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply]         = useState("");
  const [sending, setSending]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [newForm, setNewForm]     = useState({ subject_id:"", type:"Doubt", title:"", body:"" });
  const [newErrors, setNewErrors] = useState({});
  const [newSaving, setNewSaving] = useState(false);
  const [newMsg, setNewMsg]       = useState("");

  // Extract unique subjects from marks
  const subjects = [];
  const seen = new Set();
  (marksData || []).forEach(sem => {
    (sem.subjects || []).forEach(s => {
      if (!seen.has(s.subject_id)) {
        seen.add(s.subject_id);
        subjects.push({ id: s.subject_id, code: s.subject_code, name: s.subject_name });
      }
    });
  });

  const loadDetail = async (id) => {
    setSelected(id);
    setDetailLoading(true);
    try {
      const res = await getQueryDetail(id);
      setDetail(res.data);
    } catch (e) { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyToQuery(selected, { message: reply });
      setReply("");
      const res = await getQueryDetail(selected);
      setDetail(res.data);
      refetch();
    } catch (e) {}
    finally { setSending(false); }
  };

  const handleNewSubmit = async e => {
    e.preventDefault();
    setNewMsg("");
    const errs = {};
    if (!newForm.subject_id) errs.subject_id = "Required";
    if (!newForm.title.trim()) errs.title = "Required";
    if (!newForm.body.trim()) errs.body = "Required";
    if (Object.keys(errs).length) { setNewErrors(errs); return; }
    setNewSaving(true);
    try {
      await createQuery(newForm);
      setShowNew(false);
      setNewForm({ subject_id:"", type:"Doubt", title:"", body:"" });
      refetch();
    } catch (err) {
      setNewMsg(err.response?.data?.message || "Failed to submit.");
    } finally { setNewSaving(false); }
  };

  const rows = queries || [];

  return (
    <CollegeLayout pageTitle="Query Centre">
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
        <div style={{ display:"flex", gap:0, height:"calc(100vh - 200px)", minHeight:400 }}>
          {/* Left list */}
          <div style={{ width:280, flexShrink:0, borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"10px 14px", borderBottom:"1px solid #f1f5f9" }}>
              <button className="erp-btn erp-btn--primary erp-btn--sm" style={{ width:"100%" }}
                onClick={() => setShowNew(s => !s)}>
                {showNew ? "Cancel" : "+ New Query"}
              </button>
            </div>

            {showNew && (
              <form onSubmit={handleNewSubmit} style={{ padding:"12px 14px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc" }}>
                <div className="erp-form-group" style={{ marginBottom:8 }}>
                  <label style={{ fontSize:11 }}>Subject *</label>
                  <select value={newForm.subject_id} onChange={e => setNewForm(p => ({ ...p, subject_id: e.target.value }))}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                  </select>
                  {newErrors.subject_id && <span className="erp-form-error">{newErrors.subject_id}</span>}
                </div>
                <div className="erp-form-group" style={{ marginBottom:8 }}>
                  <label style={{ fontSize:11 }}>Type</label>
                  <select value={newForm.type} onChange={e => setNewForm(p => ({ ...p, type: e.target.value }))}>
                    <option>Doubt</option><option>Material Request</option>
                  </select>
                </div>
                <div className="erp-form-group" style={{ marginBottom:8 }}>
                  <label style={{ fontSize:11 }}>Title *</label>
                  <input value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="Brief title" />
                  {newErrors.title && <span className="erp-form-error">{newErrors.title}</span>}
                </div>
                <div className="erp-form-group" style={{ marginBottom:8 }}>
                  <label style={{ fontSize:11 }}>Description *</label>
                  <textarea rows={3} value={newForm.body} onChange={e => setNewForm(p => ({ ...p, body: e.target.value }))} placeholder="Describe your query…" />
                  {newErrors.body && <span className="erp-form-error">{newErrors.body}</span>}
                </div>
                {newMsg && <p style={{ fontSize:12, color:"#dc2626", marginBottom:6 }}>{newMsg}</p>}
                <button type="submit" className="erp-btn erp-btn--primary erp-btn--sm" disabled={newSaving} style={{ width:"100%" }}>
                  {newSaving ? "Submitting…" : "Submit Query"}
                </button>
              </form>
            )}

            <div style={{ flex:1, overflowY:"auto" }}>
              {rows.length === 0
                ? <p style={{ padding:20, color:"#94a3b8", fontSize:13, textAlign:"center" }}>No queries yet.</p>
                : rows.map(q => (
                  <div key={q.id} onClick={() => loadDetail(q.id)}
                    style={{
                      padding:"12px 14px", borderBottom:"1px solid #f1f5f9", cursor:"pointer",
                      background: selected === q.id ? "#ede9fe" : "#fff",
                      borderLeft: selected === q.id ? "3px solid #7c3aed" : "3px solid transparent",
                    }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontWeight:600, fontSize:13, color:"#1e293b" }}>{q.title}</span>
                      <StatusBadge status={q.status} />
                    </div>
                    <div style={{ fontSize:12, color:"#64748b" }}>{q.subject_code} · {q.teacher_name}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{timeAgo(q.created_at)}</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Right thread */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {!selected ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:14 }}>
                Select a query to view the thread.
              </div>
            ) : detailLoading ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}><LoadingSpinner /></div>
            ) : detail ? (
              <>
                <div style={{ padding:"14px 20px", borderBottom:"1px solid #e2e8f0", background:"#f8fafc" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>{detail.title}</span>
                    <span style={{ fontSize:11, background:"#eff6ff", color:"#1e40af", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>{detail.type}</span>
                    <StatusBadge status={detail.status} />
                  </div>
                  <div style={{ fontSize:12, color:"#64748b" }}>{detail.subject_name} · Teacher: {detail.teacher_name}</div>
                </div>

                <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
                  <div style={{ display:"flex", gap:10, flexDirection:"row-reverse" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:"#e2e8f0",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, fontWeight:700, color:"#475569", flexShrink:0 }}>
                      {detail.student_name?.charAt(0)}
                    </div>
                    <div style={{ maxWidth:"70%" }}>
                      <div style={{ fontSize:12, color:"#64748b", marginBottom:4, textAlign:"right" }}>
                        <strong style={{ color:"#1e293b" }}>{detail.student_name}</strong>
                        &nbsp;·&nbsp;{new Date(detail.created_at).toLocaleString()}
                      </div>
                      <div style={{ background:"#ede9fe", border:"1px solid #ddd6fe", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#374151" }}>
                        {detail.body}
                      </div>
                    </div>
                  </div>

                  {(detail.replies || []).map(r => {
                    const isTeacher = r.sender_role === "teacher";
                    return (
                      <div key={r.id} style={{ display:"flex", gap:10, flexDirection: isTeacher ? "row" : "row-reverse" }}>
                        <div style={{ width:28, height:28, borderRadius:"50%",
                          background: isTeacher ? "#ede9fe" : "#e2e8f0",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:11, fontWeight:700, color: isTeacher ? "#7c3aed" : "#475569", flexShrink:0 }}>
                          {isTeacher ? detail.teacher_name?.charAt(0) : detail.student_name?.charAt(0)}
                        </div>
                        <div style={{ maxWidth:"70%" }}>
                          <div style={{ fontSize:12, color:"#64748b", marginBottom:4, textAlign: isTeacher ? "left" : "right" }}>
                            <strong style={{ color:"#1e293b" }}>{isTeacher ? detail.teacher_name : detail.student_name}</strong>
                            &nbsp;·&nbsp;{new Date(r.sent_at).toLocaleString()}
                          </div>
                          <div style={{
                            background: isTeacher ? "#f8fafc" : "#ede9fe",
                            border:`1px solid ${isTeacher ? "#e2e8f0" : "#ddd6fe"}`,
                            borderRadius:8, padding:"10px 14px", fontSize:13, color:"#374151",
                          }}>
                            {r.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {detail.status !== "Closed" && (
                  <div style={{ padding:"12px 20px", borderTop:"1px solid #e2e8f0", background:"#fff" }}>
                    <textarea rows={3} value={reply} onChange={e => setReply(e.target.value)}
                      placeholder="Type your message…"
                      style={{ width:"100%", padding:"8px 12px", border:"1px solid #d1d5db",
                        borderRadius:8, fontSize:13, resize:"vertical", marginBottom:8 }} />
                    <div style={{ display:"flex", justifyContent:"flex-end" }}>
                      <button className="erp-btn erp-btn--primary erp-btn--sm"
                        onClick={handleReply} disabled={sending || !reply.trim()}>
                        {sending ? "Sending…" : "Send"}
                      </button>
                    </div>
                  </div>
                )}
                {detail.status === "Closed" && (
                  <div style={{ padding:"10px 20px", borderTop:"1px solid #e2e8f0", background:"#f8fafc",
                    fontSize:13, color:"#64748b", textAlign:"center" }}>
                    This thread is closed. Reply to reopen it.
                    <button className="erp-btn erp-btn--sm erp-btn--outline" style={{ marginLeft:12 }}
                      onClick={async () => {
                        await replyToQuery(selected, { message: "Reopening this query for further clarification." });
                        const res = await getQueryDetail(selected);
                        setDetail(res.data); refetch();
                      }}>
                      Reopen
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </CollegeLayout>
  );
};

export default QueryCenter;
