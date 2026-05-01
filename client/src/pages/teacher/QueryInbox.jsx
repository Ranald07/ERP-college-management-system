import { useState } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import StatusBadge from "../../components/StatusBadge";
import useFetch from "../../hooks/useFetch";
import { getTeacherInbox, getQueryDetail, replyToQuery, closeQuery } from "../../services/queryService";
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

const QueryInbox = () => {
  const { auth } = useAuth();
  const { data: queries, loading, error, refetch } = useFetch(getTeacherInbox);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply]         = useState("");
  const [sending, setSending]     = useState(false);
  const [closing, setClosing]     = useState(false);
  const [msg, setMsg]             = useState("");

  const loadDetail = async (id) => {
    setSelected(id); setMsg("");
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
    } catch (e) { setMsg("Failed to send reply."); }
    finally { setSending(false); }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      await closeQuery(selected);
      const res = await getQueryDetail(selected);
      setDetail(res.data);
      refetch();
    } catch (e) { setMsg("Failed to close."); }
    finally { setClosing(false); }
  };

  const rows = queries || [];

  return (
    <CollegeLayout pageTitle="Query Inbox">
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
        <div style={{ display:"flex", gap:0, height:"calc(100vh - 200px)", minHeight:400 }}>
          {/* Left list */}
          <div style={{ width:280, flexShrink:0, borderRight:"1px solid #e2e8f0", overflowY:"auto" }}>
            {rows.length === 0
              ? <p style={{ padding:20, color:"#94a3b8", fontSize:13, textAlign:"center" }}>Your query inbox is empty.</p>
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
                  <div style={{ fontSize:12, color:"#64748b" }}>{q.student_name} · {q.subject_code}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{timeAgo(q.created_at)}</div>
                </div>
              ))
            }
          </div>

          {/* Right thread */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {!selected ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:14 }}>
                Select a query to view the thread.
              </div>
            ) : detailLoading ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <LoadingSpinner />
              </div>
            ) : detail ? (
              <>
                {/* Header */}
                <div style={{ padding:"14px 20px", borderBottom:"1px solid #e2e8f0", background:"#f8fafc" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>{detail.title}</span>
                    <span style={{ fontSize:11, background:"#eff6ff", color:"#1e40af", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>{detail.type}</span>
                    <StatusBadge status={detail.status} />
                  </div>
                  <div style={{ fontSize:12, color:"#64748b" }}>
                    {detail.subject_name} · {detail.student_name} ({detail.reg_no})
                  </div>
                </div>

                {/* Thread */}
                <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
                  {/* Original query */}
                  <div style={{ display:"flex", gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:"#e2e8f0",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, fontWeight:700, color:"#475569", flexShrink:0 }}>
                      {detail.student_name?.charAt(0)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>
                        <strong style={{ color:"#1e293b" }}>{detail.student_name}</strong>
                        &nbsp;·&nbsp;{new Date(detail.created_at).toLocaleString()}
                      </div>
                      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#374151" }}>
                        {detail.body}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {(detail.replies || []).map(r => {
                    const isTeacher = r.sender_role === "teacher";
                    return (
                      <div key={r.id} style={{ display:"flex", gap:10, flexDirection: isTeacher ? "row-reverse" : "row" }}>
                        <div style={{ width:28, height:28, borderRadius:"50%",
                          background: isTeacher ? "#ede9fe" : "#e2e8f0",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:11, fontWeight:700, color: isTeacher ? "#7c3aed" : "#475569", flexShrink:0 }}>
                          {isTeacher ? detail.teacher_name?.charAt(0) : detail.student_name?.charAt(0)}
                        </div>
                        <div style={{ maxWidth:"70%" }}>
                          <div style={{ fontSize:12, color:"#64748b", marginBottom:4, textAlign: isTeacher ? "right" : "left" }}>
                            <strong style={{ color:"#1e293b" }}>{isTeacher ? detail.teacher_name : detail.student_name}</strong>
                            &nbsp;·&nbsp;{new Date(r.sent_at).toLocaleString()}
                          </div>
                          <div style={{
                            background: isTeacher ? "#ede9fe" : "#f8fafc",
                            border:`1px solid ${isTeacher ? "#ddd6fe" : "#e2e8f0"}`,
                            borderRadius:8, padding:"10px 14px", fontSize:13, color:"#374151",
                          }}>
                            {r.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply box */}
                {detail.status !== "Closed" && (
                  <div style={{ padding:"12px 20px", borderTop:"1px solid #e2e8f0", background:"#fff" }}>
                    <textarea rows={3} value={reply} onChange={e => setReply(e.target.value)}
                      placeholder="Type your reply…"
                      style={{ width:"100%", padding:"8px 12px", border:"1px solid #d1d5db",
                        borderRadius:8, fontSize:13, resize:"vertical", marginBottom:8 }} />
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <button className="erp-btn erp-btn--outline erp-btn--sm"
                        onClick={handleClose} disabled={closing}>
                        {closing ? "…" : "Close Thread"}
                      </button>
                      <button className="erp-btn erp-btn--primary erp-btn--sm"
                        onClick={handleReply} disabled={sending || !reply.trim()}>
                        {sending ? "Sending…" : "Send Reply"}
                      </button>
                    </div>
                    {msg && <p style={{ fontSize:12, color:"#dc2626", marginTop:6 }}>{msg}</p>}
                  </div>
                )}
                {detail.status === "Closed" && (
                  <div style={{ padding:"10px 20px", borderTop:"1px solid #e2e8f0", background:"#f8fafc",
                    fontSize:13, color:"#64748b", textAlign:"center" }}>
                    This thread is closed.
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

export default QueryInbox;
