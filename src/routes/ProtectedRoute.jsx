import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { reload } from "firebase/auth";
import { auth } from "../firebase";

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      if (currentUser) {
        await reload(auth.currentUser); // Use the real-time user from auth
        setIsVerified(auth.currentUser.emailVerified); // Get the updated flag
      }
      setChecking(false);
    };

    checkVerification();
  }, [currentUser]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (checking) return null; // Optional: show spinner
  if (!isVerified) return <Navigate to="/verify-email" replace />;

  return children;
};

export default ProtectedRoute;
