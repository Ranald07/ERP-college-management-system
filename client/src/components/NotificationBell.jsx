import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUnreadCount, getAnnouncements, markRead } from "../services/announcementService";

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const NotificationBell = () => {
  const [count, setCount]               = useState(0);
  const [open, setOpen]                 = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingList, setLoadingList]   = useState(false);
  const ref                             = useRef(null);
  const navigate                        = useNavigate();

  const fetchCount = () => {
    getUnreadCount().then(res => setCount(res.data?.count || 0)).catch(() => {});
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) {
      setLoadingList(true);
      getAnnouncements()
        .then(res => setAnnouncements(res.data || []))
        .catch(() => {})
        .finally(() => setLoadingList(false));
    }
  };

  const handleRead = async (id) => {
    await markRead(id).catch(() => {});
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    fetchCount();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        style={{ background:"none", border:"none", cursor:"pointer", color:"#fff",
          position:"relative", padding:"4px", display:"flex", alignItems:"center" }}
        aria-label="Notifications"
      >
        <BellIcon />
        {count > 0 && (
          <span style={{
            position:"absolute", top:-4, right:-4,
            background:"#ef4444", color:"#fff", borderRadius:"50%",
            width:18, height:18, fontSize:11, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center",
            lineHeight:1,
          }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:"absolute", right:0, top:"calc(100% + 8px)",
          width:320, maxHeight:360, overflowY:"auto",
          background:"#fff", borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
          border:"1px solid #e2e8f0", zIndex:1000,
        }}>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #f1f5f9",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight:700, fontSize:14, color:"#1e293b" }}>Notifications</span>
            {count > 0 && <span style={{ fontSize:12, color:"#64748b" }}>{count} unread</span>}
          </div>

          {loadingList ? (
            <div style={{ padding:24, textAlign:"center", color:"#94a3b8" }}>Loading…</div>
          ) : announcements.length === 0 ? (
            <div style={{ padding:24, textAlign:"center", color:"#94a3b8", fontSize:13 }}>
              No announcements.
            </div>
          ) : (
            announcements.map(a => (
              <div
                key={a.id}
                onClick={() => handleRead(a.id)}
                style={{
                  padding:"12px 16px", borderBottom:"1px solid #f8fafc", cursor:"pointer",
                  borderLeft: a.is_read ? "2px solid transparent" : "2px solid #3b82f6",
                  background: a.is_read ? "#fff" : "#f0f9ff",
                  transition:"background 0.15s",
                }}
              >
                <p style={{ fontWeight: a.is_read ? 400 : 600, fontSize:13, color:"#1e293b",
                  margin:"0 0 2px", overflow:"hidden", display:"-webkit-box",
                  WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                  {a.title}
                </p>
                <p style={{ fontSize:11, color:"#94a3b8", margin:0 }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}

          <div style={{ padding:"10px 16px", borderTop:"1px solid #f1f5f9", textAlign:"center" }}>
            <button
              onClick={() => { setOpen(false); navigate("/admin/announcements"); }}
              style={{ background:"none", border:"none", color:"#1e40af", fontSize:13,
                fontWeight:600, cursor:"pointer" }}
            >
              View all announcements
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
