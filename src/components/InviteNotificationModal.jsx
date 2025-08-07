import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, User, Briefcase, Check } from "lucide-react";

const InviteNotificationModal = ({ isOpen, onClose, onAccept, invite }) => {
  if (!invite) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-white/10 text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-4">
                <Mail size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're Invited!</h2>
            <p className="text-gray-400 mb-6">
              <strong>{invite.ownerName}</strong> has invited you to join the <strong>"{invite.projectName}"</strong> project.
            </p>

            <div className="bg-slate-700/50 rounded-lg p-4 text-left space-y-3 mb-8">
                <div className="flex items-center gap-3">
                    <Briefcase className="text-indigo-400" size={18}/>
                    <span className="text-gray-300">Project: {invite.projectName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <User className="text-indigo-400" size={18}/>
                    <span className="text-gray-300">Your Role: {invite.role}</span>
                </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 w-full py-3 rounded-lg text-sm font-semibold text-gray-300 bg-white/10 hover:bg-white/20 transition-colors"
              >
                Later
              </button>
              <button
                onClick={onAccept}
                className="flex-1 w-full py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Check size={18}/> Accept Invite
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InviteNotificationModal;