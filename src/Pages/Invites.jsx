import React from "react";
import { useAuth } from "../routes/AuthContext";
import { useInvites } from "../context/InviteContext";
import { acceptInvite } from "../firebase/firebaseUtils";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Check, Mail } from "lucide-react";

const InviteCard = ({ invite, onAccept }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
        <div>
            <p className="text-gray-400 text-sm">Invitation from <strong>{invite.ownerName}</strong></p>
            <h3 className="text-xl font-bold text-white mt-1">Join "{invite.projectName}"</h3>
            <p className="text-indigo-300 text-sm mt-1">As a {invite.role}</p>
        </div>
        <button
            onClick={() => onAccept(invite.roomId)}
            className="w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
        >
            <Check size={16}/> Accept
        </button>
    </motion.div>
);

const Invites = () => {
    const { user } = useAuth();
    const { pendingInvites, setPendingInvites } = useInvites();

    const handleAccept = async (roomId) => {
        try {
            await acceptInvite(roomId, user.uid);
            toast.success("Invitation accepted! You've joined the project.");
            setPendingInvites(invites => invites.filter(inv => inv.roomId !== roomId));
        } catch (error) {
            toast.error("Failed to accept invitation.");
            console.error(error);
        }
    };

    return (
        <div className="relative h-full w-full overflow-y-auto p-8 bg-slate-900">
             <motion.header
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-12"
            >
                <h1 className="text-5xl font-bold text-white tracking-tight">Project Invitations</h1>
                <p className="text-gray-400 mt-3 text-lg">Accept invitations to join new workspaces.</p>
            </motion.header>

            <div className="space-y-6">
                {pendingInvites.length > 0 ? (
                    pendingInvites.map(invite => (
                       <InviteCard key={invite.roomId} invite={invite} onAccept={handleAccept} />
                    ))
                ) : (
                    <div className="text-center py-24 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                         <Mail size={52} className="mx-auto text-slate-500" />
                         <h2 className="mt-6 text-2xl font-semibold text-white">No Pending Invitations</h2>
                         <p className="text-gray-400 mt-2">You're all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Invites;
