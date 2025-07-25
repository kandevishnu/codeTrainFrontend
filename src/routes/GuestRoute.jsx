// src/routes/GuestRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext"

const GuestRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default GuestRoute;
