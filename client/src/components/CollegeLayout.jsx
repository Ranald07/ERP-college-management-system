import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const studentTabs = [
  { to: "/student/profile",       label: "STUDENT PROFILE" },
  { to: "/student/dashboard",     label: "MARK DETAILS" },
  { to: "/student/achievements",  label: "ACHIEVEMENTS" },
  { to: "/student/leave",         label: "LEAVE" },
  { to: "/student/queries",       label: "QUERIES" },
];

const adminTabs = [
  { to: "/admin/dashboard",          label: "DASHBOARD" },
  { to: "/admin/students",           label: "STUDENTS" },
  { to: "/admin/teachers",           label: "TEACHERS" },
  { to: "/admin/subject-analysis",   label: "ANALYTICS" },
  { to: "/admin/announcements",      label: "ANNOUNCEMENTS" },
];

const teacherTabs = [
  { to: "/teacher/dashboard",        label: "MARKS ENTRY" },
  { to: "/teacher/advisees/leaves",  label: "LEAVE REQUESTS" },
  { to: "/teacher/queries",          label: "QUERY INBOX" },
];

const studentSideLinks = [
  { to: "/student/profile",      label: "Student Profile" },
  { to: "/student/dashboard",    label: "Internal Mark" },
  { to: "/student/achievements", label: "Achievements" },
  { to: "/student/leave",        label: "Leave Application" },
  { to: "/student/queries",      label: "Query Centre" },
];

const adminSideLinks = [
  { to: "/admin/dashboard",          label: "Dashboard" },
  { to: "/admin/students",           label: "Student List" },
  { to: "/admin/teachers",           label: "Teacher List" },
  { to: "/admin/students/add",       label: "Add Student" },
  { to: "/admin/students/import",    label: "Import Students" },
  { to: "/admin/teachers/add",       label: "Add Teacher" },
  { separator: true,                 label: "Analytics & Admin" },
  { to: "/admin/subject-analysis",   label: "Subject Analysis" },
  { to: "/admin/teacher-performance",label: "Teacher Performance" },
  { to: "/admin/announcements",      label: "Announcements" },
];

const teacherSideLinks = [
  { to: "/teacher/dashboard",       label: "Marks Entry" },
  { to: "/teacher/advisees/leaves", label: "Leave Requests" },
  { to: "/teacher/queries",         label: "Query Inbox" },
];

const CollegeLayout = ({ children, pageTitle }) => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const tabs = auth?.role === "admin" ? adminTabs
    : auth?.role === "teacher" ? teacherTabs
    : studentTabs;

  const sideLinks = auth?.role === "admin" ? adminSideLinks
    : auth?.role === "teacher" ? teacherSideLinks
    : studentSideLinks;

  return (
    <div className="erp-root">
      {/* College Header Banner */}
      <div className="erp-header">
        <div className="erp-header__logo">🎓</div>
        <div className="erp-header__text">
          <h1 className="erp-header__college">APR COLLEGE OF ENGINEERING</h1>
          <p className="erp-header__sub">(An Autonomous Institution – Affiliated to Anna University, Chennai)</p>
          <p className="erp-header__sub">UG Programmes · NBA Accredited (TIER - I) · NAAC Accredited with 'A' Grade</p>
          <p className="erp-header__contact">Email: info@aprcollege.edu &nbsp;|&nbsp; Phone: +91-44-2345-6789 (30 Lines)</p>
        </div>
        <div className="erp-header__user">
          <NotificationBell />
          <span style={{ fontSize: 13 }}>{auth?.name}</span>
          <span style={{ fontSize: 11, opacity: 0.7, textTransform: "capitalize" }}>{auth?.role}</span>
          <button className="erp-logout-btn" onClick={() => { logout(); navigate("/login"); }}>Logout</button>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <nav className="erp-topnav">
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to}
            className={({ isActive }) => "erp-topnav__tab" + (isActive ? " erp-topnav__tab--active" : "")}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      {/* Body */}
      <div className="erp-body">
        <aside className="erp-sidebar">
          {sideLinks.map((l, i) =>
            l.separator ? (
              <div key={i} className="erp-sidebar__separator">{l.label}</div>
            ) : (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) => "erp-sidebar__link" + (isActive ? " erp-sidebar__link--active" : "")}>
                {l.label}
              </NavLink>
            )
          )}
        </aside>
        <main className="erp-content">
          {pageTitle && <h2 className="erp-page-title">{pageTitle}</h2>}
          {children}
        </main>
      </div>
    </div>
  );
};

export default CollegeLayout;
