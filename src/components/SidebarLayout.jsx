import { Outlet, NavLink, useNavigate } from "react-router-dom";
import React from "react";
import NavItem from "../components/NavItem"; // adjust path if different
import { logout } from "../firebase";
import { toast } from "react-toastify";
import { LayoutDashboard, Home as HomeIcon, User, LogOut, Layers, Bell } from "lucide-react";
import { useInvites } from "../context/InviteContext"; 

const SidebarLayout = () => {
    const navigate = useNavigate();
    const { inviteCount } = useInvites();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
            toast.success("You have been logged out.");
        } catch (err) {
            toast.error("Failed to logout.");
        }
    };

    return (
        <div className="flex h-screen w-full bg-slate-900 text-white">
            <aside className="flex w-64 flex-col space-y-8 bg-black/20 p-6 backdrop-blur-xl border-r border-white/10">
                {/* Logo */}
                <div className="flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
                        <Layers size={24} />
                    </div>
                    <h2 className="text-xl font-bold tracking-tighter">CodeTrain</h2>
                </div>

                {/* Navigation */}
                <nav className="flex flex-1 flex-col space-y-2">
                    <NavItem to="/dashboard" icon={<LayoutDashboard size={20} />}>Dashboard</NavItem>
                    <NavItem to="/home" icon={<HomeIcon size={20} />}>Home</NavItem>
                    <NavItem to="/invites" icon={<Bell size={20} />} badgeCount={inviteCount}>Invites</NavItem>
                    <NavItem to="/profile" icon={<User size={20} />}>Profile</NavItem>

                    <div className="mt-auto">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center space-x-4 rounded-lg px-4 py-3 text-sm font-semibold text-gray-400 transition-all duration-200 hover:bg-red-500/20 hover:text-red-300"
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main content swaps here */}
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
};

export default SidebarLayout;
