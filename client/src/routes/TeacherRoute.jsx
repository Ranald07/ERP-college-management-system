import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TeacherRoute = ({ children }) => {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role === "admin")   return <Navigate to="/admin/dashboard" replace />;
  if (auth.role === "student") return <Navigate to="/student/profile" replace />;
  return children;
};

export default TeacherRoute;
