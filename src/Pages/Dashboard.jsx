import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, logout } from "../firebase";
import { toast } from "react-toastify";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const justVerified = localStorage.getItem("justVerified");
    if (justVerified) {
      toast.success("Email Verified! Welcome 🎉");
      localStorage.removeItem("justVerified");
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      console.log("User signed out");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account permanently?")) return;

    try {
      await auth.currentUser.delete();
      toast.success("Account deleted successfully.");
      navigate("/signup"); // or "/login"
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        toast.error("Please log in again to delete your account.");
        await logout();
        navigate("/login");
      } else {
        console.error("Account deletion failed:", error.message);
        toast.error("Account deletion failed. Try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-4">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      <div className="flex gap-4">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Logout
        </button>

        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
