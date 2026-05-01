import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StudentRoute = ({ children }) => {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role === "admin")   return <Navigate to="/admin/dashboard" replace />;
  if (auth.role === "teacher") return <Navigate to="/teacher/dashboard" replace />;
  return children;
};

export default StudentRoute;
