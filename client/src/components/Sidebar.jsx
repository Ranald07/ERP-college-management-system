import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const adminLinks = [
  { to: "/admin/dashboard",    label: "Dashboard",   icon: "📊" },
  { to: "/admin/students",     label: "Students",    icon: "👥" },
  { to: "/admin/students/add", label: "Add Student", icon: "➕" },
];

const studentLinks = [
  { to: "/student/dashboard", label: "Dashboard",  icon: "📊" },
  { to: "/student/profile",   label: "My Profile", icon: "👤" },
];

const Sidebar = () => {
  const { auth } = useAuth();
  const links = auth?.role === "admin" ? adminLinks : studentLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar__section-label">
        {auth?.role === "admin" ? "Admin Panel" : "Student Portal"}
      </div>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            "sidebar__link" + (isActive ? " sidebar__link--active" : "")
          }
        >
          <span style={{ fontSize: 16 }}>{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </aside>
  );
};

export default Sidebar;
