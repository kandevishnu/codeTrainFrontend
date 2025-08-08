import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
// NOTE: SidebarLayout is no longer imported here
import { useAuth } from "../routes/AuthContext";
import { motion } from "framer-motion";
import { Briefcase, Activity, CheckCircle } from "lucide-react";
import { getProjectsForUser, acceptInvite } from "../firebase/firebaseUtils";
import { useInvites } from "../context/InviteContext";
import InviteNotificationModal from "../components/InviteNotificationModal";

// --- All sub-components like GridBackground, StatCard, etc. remain the same ---

const GridBackground = () => (
  <>
    <style>{`
            @keyframes pan-background {
                from { background-position: 0% 0%; }
                to { background-position: -200% 0%; }
            }
        `}</style>
    <div className="absolute inset-0 -z-10 bg-slate-900">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #4f4f4f2e 1px, transparent 1px), linear-gradient(to bottom, #4f4f4f2e 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          animation: "pan-background 75s linear infinite",
        }}
      ></div>
    </div>
  </>
);

const StatCard = ({ title, value, icon, color }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
    className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex items-center space-x-4"
  >
    <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </motion.div>
);

const CompletionGauge = ({ percentage = 0 }) => {
  const angle = (percentage / 100) * 180 - 90;
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center">
      <h3 className="text-lg font-semibold text-white mb-4">Completion Rate</h3>
      <div className="relative w-48 h-24 overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-center">
          <svg width="192" height="96" viewBox="0 0 192 96">
            <path d="M8 88 A 80 80 0 0 1 184 88" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="16" fill="none" strokeLinecap="round" />
            <motion.path d="M8 88 A 80 80 0 0 1 184 88" stroke="url(#gauge-gradient)" strokeWidth="16" fill="none" strokeLinecap="round" initial={{ strokeDasharray: "0, 251.2" }} animate={{ strokeDasharray: `${(percentage / 100) * 251.2}, 251.2` }} transition={{ duration: 1.5, ease: "easeInOut" }} />
            <defs><linearGradient id="gauge-gradient"><stop offset="0%" stopColor="#8A2BE2" /><stop offset="100%" stopColor="#4F46E5" /></linearGradient></defs>
          </svg>
        </div>
        <motion.div className="absolute bottom-0 left-1/2 w-0.5 h-20 bg-white origin-bottom" style={{ transformOrigin: "bottom center" }} initial={{ rotate: -90 }} animate={{ rotate: angle }} transition={{ duration: 1.5, ease: "easeOut" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full"></div>
      </div>
      <p className="text-4xl font-bold text-white mt-2">{percentage.toFixed(0)}%</p>
    </div>
  );
};

const UpcomingDeadlines = ({ projects = [] }) => {
  const upcoming = projects.filter((p) => p.deadline && new Date(p.deadline) >= new Date()).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 3);
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Upcoming Deadlines</h3>
      <div className="space-y-4">
        {upcoming.length > 0 ? (upcoming.map((project) => (<div key={project.id} className="flex justify-between items-center"><p className="font-medium text-gray-300">{project.projectName}</p><p className="text-sm text-indigo-400 font-semibold">{new Date(project.deadline).toLocaleDateString()}</p></div>))) : (<p className="text-sm text-gray-500">No upcoming deadlines.</p>)}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { pendingInvites, setPendingInvites, isLoading: invitesLoading } = useInvites();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [currentInvite, setCurrentInvite] = useState(null);

  useEffect(() => {
    // ... (rest of your useEffect logic is unchanged)
    const fetchData = async () => {
      if (!user) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const userProjects = await getProjectsForUser(user.uid);
        setProjects(userProjects);
        const total = userProjects.length;
        const completed = userProjects.filter((p) => p.status === "Completed").length;
        const active = total - completed;
        setStats({ total, active, completed });
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        toast.error("Could not load your projects.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);
  
  // ... (other useEffects and handlers are unchanged)

  const completionPercentage = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };

  if (isLoading) {
    return null; // The main skeleton is handled by Suspense now.
  }

  // The component now returns the main content directly, without the SidebarLayout wrapper.
  return (
    <>
      <InviteNotificationModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} onAccept={() => {}} invite={currentInvite} />
      <div className="relative h-full w-full">
        <GridBackground />
        <div className="relative z-10 h-full overflow-y-auto p-8">
          <motion.header initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }} className="mb-12">
            <h1 className="text-5xl font-bold text-white tracking-tight">Welcome, {user?.displayName || "User"}!</h1>
            <p className="text-gray-400 mt-3 text-lg">Here's a summary of your project activity.</p>
          </motion.header>
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <StatCard title="Total Projects" value={stats.total} icon={<Briefcase size={24} />} color="from-purple-500 to-indigo-500" />
            <StatCard title="Active Projects" value={stats.active} icon={<Activity size={24} />} color="from-blue-500 to-cyan-500" />
            <StatCard title="Completed" value={stats.completed} icon={<CheckCircle size={24} />} color="from-green-500 to-emerald-500" />
          </motion.div>
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="lg:col-span-2">
              <UpcomingDeadlines projects={projects} />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <CompletionGauge percentage={completionPercentage} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
