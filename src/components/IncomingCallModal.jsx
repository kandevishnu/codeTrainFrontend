import React from 'react';
import { motion } from 'framer-motion';
import { Phone, X, User } from 'lucide-react';

const IncomingCallModal = ({ callData, onAccept, onDecline }) => {
    if (!callData) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-8 border border-slate-700"
            >
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 ring-4 ring-indigo-500/30">
                        <User className="text-indigo-300" size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Incoming Call</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Call from the project room.
                    </p>
                </div>

                <div className="flex justify-center gap-6 mt-8">
                    <button onClick={onDecline} className="flex flex-col items-center gap-2 text-red-400 hover:text-red-300 transition-colors">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                            <X size={32} />
                        </div>
                        <span className="text-sm font-medium">Decline</span>
                    </button>
                    <button onClick={onAccept} className="flex flex-col items-center gap-2 text-green-400 hover:text-green-300 transition-colors">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                            <Phone size={32} />
                        </div>
                        <span className="text-sm font-medium">Accept</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default IncomingCallModal;