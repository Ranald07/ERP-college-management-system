import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login as loginService } from "../services/authService";

const REDIRECT = { admin: "/admin/dashboard", teacher: "/teacher/dashboard", student: "/student/profile" };

const Login = () => {
  const [form, setForm]         = useState({ email: "", password: "" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    setLoading(true);
    try {
      const res = await loginService(form);
      if (!res.success) { setError(res.message); return; }
      login(res.data);
      navigate(REDIRECT[res.data.role] || "/login");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page" style={{
      backgroundImage: `url(${process.env.PUBLIC_URL}/bg.jpg)`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}>
      <div className="login-card">
        <div className="login-card__brand">
          <div className="login-card__brand-icon">🎓</div>
          <span className="login-card__brand-name">APR College ERP</span>
        </div>
        <h1 className="login-card__title">Login</h1>
        <p className="login-card__subtitle">Enter your account details</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="login-input-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@apr.edu" autoComplete="email" />
          </div>
          <div className="login-input-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input id="password" type={showPass ? "text" : "password"} name="password"
                value={form.password} onChange={handleChange} placeholder="••••••••"
                autoComplete="current-password" style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", color:"#94a3b8", fontSize:16, cursor:"pointer" }}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>
        <p style={{ marginTop:24, textAlign:"center", color:"#94a3b8", fontSize:13 }}>
          Use your college-issued credentials to sign in.
        </p>
      </div>
    </div>
  );
};

export default Login;
