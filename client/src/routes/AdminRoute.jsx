import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role === "student") return <Navigate to="/student/profile" replace />;
  if (auth.role === "teacher") return <Navigate to="/teacher/dashboard" replace />;
  return children;
};

export default AdminRoute;
