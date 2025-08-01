import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../firebase";
import { toast } from "react-toastify";

const SidebarLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      toast.error("Failed to logout.");
    }
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-100 dark:bg-gray-900 shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-bold">CodeTrain</h2>
        <nav className="flex flex-col space-y-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? "text-blue-600" : "text-gray-700 dark:text-gray-300"
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/home"
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? "text-blue-600" : "text-gray-700 dark:text-gray-300"
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? "text-blue-600" : "text-gray-700 dark:text-gray-300"
              }`
            }
          >
            Profile
          </NavLink>

          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-500 text-left"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 bg-white dark:bg-gray-950 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default SidebarLayout;
