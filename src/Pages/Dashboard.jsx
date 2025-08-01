import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getProjectsForUser } from "../firebase/firebaseUtils";
import SidebarLayout from "../components/SidebarLayout";

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });

  useEffect(() => {
    const justVerified = localStorage.getItem("justVerified");
    if (justVerified) {
      toast.success("Email Verified! Welcome 🎉");
      localStorage.removeItem("justVerified");
    }

    const fetchData = async () => {
      const userProjects = await getProjectsForUser();
      setProjects(userProjects);

      const total = userProjects.length;
      const completed = userProjects.filter(p => p.status === "completed").length;
      const active = total - completed;
      setStats({ total, active, completed });
    };

    fetchData();
  }, []);

  return (
    <SidebarLayout>
      <h1 className="text-2xl font-bold mb-6">Welcome to your Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Rooms" value={stats.total} />
        <StatCard title="Active Rooms" value={stats.active} />
        <StatCard title="Completed Rooms" value={stats.completed} />
      </div>

      <h2 className="text-xl font-semibold mb-4">Your Project Rooms</h2>
      {projects.length === 0 ? (
        <p className="text-gray-500">No rooms found. Create one to get started!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <RoomCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </SidebarLayout>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
    <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-300">{title}</h2>
    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
  </div>
);

const RoomCard = ({ project }) => {
  const { name, deadline, phases, members, status } = project;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-5 hover:shadow-lg transition">
      <h3 className="text-xl font-bold mb-2 text-blue-600 dark:text-blue-400">{name}</h3>
      <p className="text-gray-700 dark:text-gray-300 mb-1">
        <strong>Deadline:</strong> {deadline}
      </p>
      <p className="text-gray-700 dark:text-gray-300 mb-1">
        <strong>Phases:</strong> {phases?.length || 0}
      </p>
      <p className="text-gray-700 dark:text-gray-300 mb-1">
        <strong>Members:</strong> {members?.length || 0}
      </p>
      <p className="text-sm font-medium mt-2 px-2 inline-block rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">
        {status === "completed" ? "✅ Completed" : "🚧 Active"}
      </p>
    </div>
  );
};

export default Dashboard;
