import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, updateDoc, arrayRemove, arrayUnion, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase"; // Adjust path if necessary
import { Shield, ShieldOff } from 'lucide-react';

// NOTE: All the helper components are now in this file.

const SettingsSection = ({ title, borderClass = 'border-slate-700', children }) => (
    <div className={`p-6 bg-slate-800/50 rounded-lg border ${borderClass}`}>
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        {children}
    </div>
);

const InputField = ({ label, ...props }) => (
    <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">{label}</label>
        <input {...props} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
);

const SelectField = ({ label, children, ...props }) => (
    <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">{label}</label>
        <select {...props} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {children}
        </select>
    </div>
);

const DeleteProjectModal = ({ isOpen, onClose, roomName, roomId, navigate }) => {
    const [confirmationText, setConfirmationText] = useState("");
    const requiredText = `yes, i want to delete this project ${roomName}`;
    const isMatch = confirmationText === requiredText;

    const handleDelete = async () => {
        if (!isMatch) return;
        const roomRef = doc(db, "rooms", roomId);
        try {
            await deleteDoc(roomRef);
            navigate('/home'); 
        } catch (error) {
            console.error("Failed to delete project:", error);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 border border-red-500/30">
                <h2 className="text-lg font-bold text-red-300">Confirm Deletion</h2>
                <p className="text-sm text-slate-400 mt-2">
                    This is irreversible. To confirm, please type the following text exactly as it appears below:
                    <br />
                    <strong className="text-indigo-300 my-2 block bg-slate-900 p-2 rounded">{requiredText}</strong>
                </p>
                <input type="text" value={confirmationText} onChange={(e) => setConfirmationText(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
                <div className="flex w-full gap-4 mt-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-md text-sm font-semibold bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={handleDelete} disabled={!isMatch} className="flex-1 py-2.5 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">Delete Project</button>
                </div>
            </motion.div>
        </div>
    );
};


const ProjectSettings = () => {
    // This hook gets the data passed from the <Outlet> in RoomView.jsx
    const { room, membersWithStatus, isOwner } = useOutletContext();
    const roomId = room.id;

    const navigate = useNavigate();
    const [projectName, setProjectName] = useState(room.projectName);
    const [deadline, setDeadline] = useState(room.deadline);
    const [status, setStatus] = useState(room.status);
    const [sdlcPhases, setSdlcPhases] = useState(room.sdlcPhases || []);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const allPhases = ["Planning", "Analysis", "Design", "Implementation", "Testing", "Deployment", "Maintenance"];

    const handleSettingsUpdate = async (field, value) => {
        const roomRef = doc(db, "rooms", roomId);
        try {
            await updateDoc(roomRef, { [field]: value });
        } catch (error) {
            console.error(`Failed to update ${field}:`, error);
        }
    };

    const handlePhaseToggle = (phase) => {
        const newPhases = sdlcPhases.includes(phase)
            ? sdlcPhases.filter(p => p !== phase)
            : [...sdlcPhases, phase];
        setSdlcPhases(newPhases);
        handleSettingsUpdate('sdlcPhases', newPhases);
    };
    
    const handleAdminToggle = async (member) => {
        const roomRef = doc(db, "rooms", roomId);
        const newAdminIds = room.adminIds.includes(member.uid)
            ? arrayRemove(member.uid)
            : arrayUnion(member.uid);
        
        await updateDoc(roomRef, { adminIds: newAdminIds });
    };

    return (
        <>
            <DeleteProjectModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                roomName={room.projectName}
                roomId={roomId}
                navigate={navigate}
            />
            <div className="space-y-8">
                <SettingsSection title="General Settings">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Project Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} onBlur={() => handleSettingsUpdate('projectName', projectName)} />
                        <InputField label="Deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} onBlur={() => handleSettingsUpdate('deadline', deadline)} />
                        <SelectField label="Project Status" value={status} onChange={(e) => { setStatus(e.target.value); handleSettingsUpdate('status', e.target.value); }}>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>On Hold</option>
                        </SelectField>
                    </div>
                </SettingsSection>

                <SettingsSection title="Project Phases">
                    <div className="flex flex-wrap gap-2">
                        {allPhases.map(phase => (
                            <button key={phase} onClick={() => handlePhaseToggle(phase)} className={`px-3 py-1 text-sm rounded-full transition-colors border ${sdlcPhases.includes(phase) ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>{phase}</button>
                        ))}
                    </div>
                </SettingsSection>

                <SettingsSection title="Access Control">
                    {membersWithStatus.filter(m => m.uid !== room.ownerId && m.inviteAccepted).map(member => (
                        <div key={member.uid} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                            <div>
                                <p className="font-medium text-white">{member.name}</p>
                                <p className="text-xs text-slate-400">{member.email}</p>
                            </div>
                            <button onClick={() => handleAdminToggle(member)} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${room.adminIds.includes(member.uid) ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'}`}>
                                {room.adminIds.includes(member.uid) ? <ShieldOff size={14}/> : <Shield size={14} />}
                                {room.adminIds.includes(member.uid) ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                        </div>
                    ))}
                </SettingsSection>

                {isOwner && (
                    <SettingsSection title="Danger Zone" borderClass="border-red-500/30">
                        <div className="bg-red-500/10 p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-red-300">Delete Project</h4>
                                <p className="text-sm text-slate-400 mt-1">Once deleted, the project and all its data will be gone forever.</p>
                            </div>
                            <button onClick={() => setDeleteModalOpen(true)} className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-500 transition-colors">
                                Delete
                            </button>
                        </div>
                    </SettingsSection>
                )}
            </div>
        </>
    );
};

export default ProjectSettings;