import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { reload } from "firebase/auth";

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth(); 
  const [checking, setChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      if (user) {
        await reload(user); 
        setIsVerified(user.emailVerified);
      }
      setChecking(false);
    };

    checkVerification();
  }, [user]);

  if (checking) return null; 
  if (!user) return <Navigate to="/login" replace />;
  if (!isVerified) return <Navigate to="/verify-email" replace />;

  return children;
};

export default ProtectedRoute;
