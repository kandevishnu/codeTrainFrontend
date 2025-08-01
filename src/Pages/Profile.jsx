import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../routes/AuthContext";
import { auth, db } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import SidebarLayout from "../components/SidebarLayout";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logged out successfully!");
      navigate("/login");
    } catch (err) {
      toast.error("Failed to logout.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account?")) return;

    try {
      await deleteDoc(doc(db, "users", user.uid));
      await user.delete();
      toast.success("Account deleted permanently.");
      navigate("/signup");
    } catch (err) {
      toast.error("Error deleting account, please re-login.");
      console.error(err);
    }
  };

  return (
    <SidebarLayout>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow max-w-lg">
        <p><strong>Name:</strong> {user?.displayName || "User"}</p>
        <p><strong>Email:</strong> {user?.email}</p>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleLogout}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
          <button
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Delete Account
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default Profile;
