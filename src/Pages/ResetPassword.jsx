import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  confirmPasswordReset,
  onAuthStateChanged,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Already logged in, skip this whole useEffect
        navigate("/dashboard", { replace: true });
      } else {
        if (!oobCode) {
          toast.error("Invalid or missing reset code");
          navigate("/login");
          return;
        }

        verifyPasswordResetCode(auth, oobCode)
          .then((email) => setVerifiedEmail(email))
          .catch(() => {
            toast.error("Invalid or expired password reset link");
            navigate("/login");
          });
      }
    });

    return () => unsubscribe();
  }, [oobCode, navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard", { replace: true }); // prevents back nav
      }
    });

    return () => unsubscribe();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await confirmPasswordReset(auth, oobCode, newPassword);
      toast.success("Password reset successful. You can now log in.");
      navigate("/login");
    } catch (err) {
      toast.error("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">
          Reset Your Password
        </h2>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-gray-300 text-sm">
            Resetting password for: <strong>{verifiedEmail}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              New Password
            </label>
            <input
              type="password"
              className="mt-1 w-full px-4 py-2 border rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:ring focus:ring-blue-400"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
