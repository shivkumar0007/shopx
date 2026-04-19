import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user } = useApp();

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/" replace state={{ notAuthorized: true }} />;
  }

  return children;
};

export default ProtectedRoute;
