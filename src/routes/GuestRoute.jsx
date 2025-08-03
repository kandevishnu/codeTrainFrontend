import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; 

  if (user) return <Navigate to="/dashboard" replace />;

  return children;
};

export default GuestRoute;
