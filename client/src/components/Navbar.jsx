import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar__brand">
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
        }}>🎓</div>
        College <span>ERP</span>
      </div>
      <div className="navbar__right">
        <span className="navbar__user">👤 {auth?.name}</span>
        <button className="btn btn--outline btn--sm" onClick={() => { logout(); navigate("/login"); }}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
