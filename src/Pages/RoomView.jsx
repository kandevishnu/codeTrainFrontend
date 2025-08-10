import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion, collection, query, where, getDocs, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../routes/AuthContext";
import TrainModel from "../components/TrainModel";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Users, User, Box, LayoutDashboard, CheckSquare,
    BarChart3, Settings, Plus, Edit, Paperclip, Trash2,
    Search, Phone, Video, ScreenShare, X, User as UserIcon, Check, AlertTriangle, Shield, ShieldOff,
    Mic, MicOff, PhoneOff, VideoOff, LogIn, LogOut, Info
} from "lucide-react";

// Service and Component Imports
import { webrtcService } from '../services/webrtcService';
import IncomingCallModal from '../components/IncomingCallModal';

// --- Reusable UI Components ---

const StatCard = ({ icon, label, value }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg flex items-center space-x-4">
        <div className="bg-indigo-500/20 p-3 rounded-lg">{icon}</div>
        <div>
            <p className="text-sm text-indigo-200 font-medium">{label}</p>
            <p className="text-lg text-white font-semibold truncate">{value}</p>
        </div>
    </div>
);

const IconButton = ({ icon, tooltip, onClick, className }) => (
    <button onClick={onClick} className={`p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors relative group ${className}`}>
        {icon}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {tooltip}
        </span>
    </button>
);

const SidebarItem = ({ icon, label, activeView, setActiveView, viewName }) => {
    const isActive = activeView === viewName;
    return (
        <li
            onClick={() => setActiveView(viewName)}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${isActive ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-gray-700/50 hover:text-white"}`}
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
        </li>
    );
};

const TabButton = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 p-3 text-sm font-medium transition-colors ${isActive ? "text-white bg-gray-800" : "text-gray-400 hover:bg-gray-800/50"}`}>
        {label}
    </button>
);

// --- Main Child Components ---

const Sidebar = ({ room, activeView, setActiveView, isAdmin }) => (
    <aside className="w-64 bg-gray-900/70 backdrop-blur-xl border-r border-white/10 flex flex-col p-4">
        <div className="mb-8">
            <h1 className="text-xl font-bold text-white tracking-tight">{room.projectName}</h1>
            <p className="text-xs text-gray-400">Project Workspace</p>
        </div>
        <nav className="flex-grow">
            <ul>
                <SidebarItem icon={<LayoutDashboard size={20} />} label="Overview" activeView={activeView} setActiveView={setActiveView} viewName="overview" />
                <SidebarItem icon={<CheckSquare size={20} />} label="Tasks & Kanban" activeView={activeView} setActiveView={setActiveView} viewName="tasks" />
                <SidebarItem icon={<BarChart3 size={20} />} label="Analytics & Gantt" activeView={activeView} setActiveView={setActiveView} viewName="analytics" />
            </ul>
        </nav>
        <div>
            {isAdmin && <SidebarItem icon={<Settings size={20} />} label="Project Settings" activeView={activeView} setActiveView={setActiveView} viewName="settings" />}
        </div>
    </aside>
);

const Header = ({ room, onStartCall, onShareScreen, isCallActive, onJoinCall, ongoingCall }) => (
    <header className="flex items-center justify-between p-4 border-b mt-1.5 border-white/10">
        <div>
            <div className="flex items-center space-x-2">
                <p className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    room.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300' :
                    room.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                    'bg-yellow-500/20 text-yellow-300'
                }`}>{room.status}</p>
                <Countdown deadline={room.deadline} />
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <div className="flex items-center p-1 bg-gray-800 rounded-lg border border-white/10">
                <IconButton icon={<Search size={18} />} tooltip="Search" />
                <IconButton icon={<Paperclip size={18} />} tooltip="Attachments" />
            </div>
            <div className="flex items-center p-1 bg-gray-800 rounded-lg border border-white/10">
                {ongoingCall && !isCallActive ? (
                    <button onClick={() => onJoinCall(ongoingCall.type)} className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-green-300 bg-green-500/20 rounded-md hover:bg-green-500/30 transition-colors">
                        <LogIn size={16} />
                        <span>Join Call</span>
                    </button>
                ) : (
                    <>
                        <IconButton icon={<Phone size={18} />} tooltip="Start Voice Call"
                            onClick={() => onStartCall('voice')}
                            className={isCallActive || ongoingCall ? 'opacity-50 cursor-not-allowed' : ''} />
                        <IconButton icon={<Video size={18} />} tooltip="Start Video Call"
                            onClick={() => onStartCall('video')}
                            className={isCallActive || ongoingCall ? 'opacity-50 cursor-not-allowed' : ''} />
                    </>
                )}
                <IconButton icon={<ScreenShare size={18} />} tooltip="Share Screen"
                    onClick={onShareScreen}
                    className={!isCallActive ? 'opacity-50' : 'text-green-400'} />
            </div>
        </div>
    </header>
);

const CollaborationPanel = ({ members, onInvite, user, room, roomId }) => {
    const [activeTab, setActiveTab] = useState('members');
    return (
        <aside className="w-80 bg-gray-900/70 backdrop-blur-xl border-l border-white/10 flex flex-col">
            <div className="flex items-center border-b border-white/10">
                <TabButton label="Members" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} />
                <TabButton label="Activity" isActive={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
                <TabButton label="Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            </div>
            <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                {activeTab === 'members' && <MembersList members={members} onInvite={onInvite} currentUser={user} room={room} roomId={roomId} />}
                {activeTab === 'activity' && <ActivityFeed />}
                {activeTab === 'chat' && <ChatPanel />}
            </div>
        </aside>
    );
};

const ConfirmRemoveModal = ({ isOpen, onClose, onConfirm, memberName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6 border border-slate-700"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                        <AlertTriangle className="text-red-400" size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-white">Remove Member</h2>
                    <p className="text-sm text-slate-400 mt-2">
                        Are you sure you want to remove <strong className="text-white">{memberName}</strong> from the project? This action cannot be undone.
                    </p>
                    <div className="flex w-full gap-4 mt-6">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-md text-sm font-semibold bg-slate-700 hover:bg-slate-600 transition-colors">
                            Cancel
                        </button>
                        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">
                            Yes, Remove
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const MembersList = ({ members, onInvite, currentUser, room, roomId }) => {
    const [editingMember, setEditingMember] = useState({ uid: null, name: '' });
    const [memberToRemove, setMemberToRemove] = useState(null);

    const getStatus = (lastSeen) => {
        if (!lastSeen?.toDate) return { color: 'bg-gray-500', text: 'Offline' };
        const minutesAgo = (new Date() - lastSeen.toDate()) / 60000;
        if (minutesAgo < 5) return { color: 'bg-green-500', text: 'Online' };
        if (minutesAgo < 30) return { color: 'bg-yellow-500', text: `Last seen ${Math.floor(minutesAgo)}m ago` };
        return { color: 'bg-gray-500', text: 'Offline' };
    };
    
    const sortedMembers = [...members].sort((a, b) => {
        if (a.uid === currentUser.uid) return -1;
        if (b.uid === currentUser.uid) return 1;
        return a.name.localeCompare(b.name);
    });

    const acceptedMembers = sortedMembers.filter(m => m.inviteAccepted);
    const pendingMembers = sortedMembers.filter(m => !m.inviteAccepted);

    const isAdmin = room.adminIds && room.adminIds.includes(currentUser.uid);

    const executeRemoveMember = async () => {
        if (!memberToRemove) return;
        const originalMemberObject = room.members.find(m => m.uid === memberToRemove.uid);
        
        if (!originalMemberObject) {
            console.error("Could not find the original member object to remove.");
            setMemberToRemove(null);
            return;
        }

        const roomRef = doc(db, "rooms", roomId);
        try {
            await updateDoc(roomRef, {
                members: arrayRemove(originalMemberObject),
                memberIds: arrayRemove(originalMemberObject.uid)
            });
        } catch (error) {
            console.error("Failed to remove member:", error);
        } finally {
            setMemberToRemove(null);
        }
    };

    const handleSaveName = async () => {
        const roomRef = doc(db, "rooms", roomId);
        const updatedMembers = room.members.map(m => 
            m.uid === editingMember.uid ? { ...m, name: editingMember.name } : m
        );
        try {
            await updateDoc(roomRef, { members: updatedMembers });
            setEditingMember({ uid: null, name: '' });
        } catch (error) {
            console.error("Failed to update member name:", error);
        }
    };

    return (
    <>
        <ConfirmRemoveModal 
            isOpen={!!memberToRemove}
            onClose={() => setMemberToRemove(null)}
            onConfirm={executeRemoveMember}
            memberName={memberToRemove?.name}
        />
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Team Members ({acceptedMembers.length})</h3>
                {isAdmin && (
                    <button onClick={onInvite} className="flex items-center space-x-1 text-sm bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors">
                        <Plus size={16} />
                        <span>Invite</span>
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {acceptedMembers.map(member => {
                    const status = getStatus(member.lastSeen);
                    const isCurrentUser = member.uid === currentUser.uid;
                    const isOwner = member.uid === room.ownerId;
                    const isMemberAdmin = room.adminIds && room.adminIds.includes(member.uid);
                    const displayRole = isOwner ? 'Owner' : (isMemberAdmin ? 'Admin' : member.role);
                    const isEditing = editingMember.uid === member.uid;

                    return (
                        <div key={member.uid} className="relative flex items-center space-x-3 group p-2 -m-2 rounded-lg hover:bg-white/5">
                            <div className="relative flex-shrink-0">
                                {member.photoURL ? (
                                    <img src={member.photoURL} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                        <UserIcon size={20} className="text-slate-400" />
                                    </div>
                                )}
                                <span className={`absolute bottom-0 right-0 w-3 h-3 ${status.color} rounded-full border-2 border-gray-800`} title={status.text}></span>
                            </div>
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text"
                                            value={editingMember.name}
                                            onChange={(e) => setEditingMember({...editingMember, name: e.target.value})}
                                            className="bg-gray-700 border border-indigo-500 rounded px-2 py-1 text-sm w-full focus:outline-none"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                        />
                                        <IconButton icon={<Check size={16} />} tooltip="Save" onClick={handleSaveName} className="text-green-400 hover:text-green-300"/>
                                        <IconButton icon={<X size={16} />} tooltip="Cancel" onClick={() => setEditingMember({uid: null, name: ''})} className="text-red-400 hover:text-red-300"/>
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-medium text-white text-sm truncate">
                                            {member.name}
                                            <span className="text-gray-400 font-normal text-xs ml-2">({displayRole})</span>
                                            {isCurrentUser && <span className="text-indigo-400 text-xs ml-1.5">(You)</span>}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                    </>
                                )}
                            </div>
                            {isAdmin && !isOwner && !isEditing && (
                                <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <IconButton icon={<Edit size={16} />} onClick={() => setEditingMember({uid: member.uid, name: member.name})} />
                                    <IconButton icon={<Trash2 size={16} />} onClick={() => setMemberToRemove(member)} className="hover:text-red-500"/>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            {pendingMembers.length > 0 && (
                <div className="mt-6">
                    <h3 className="font-semibold text-white mb-2 text-sm">Pending Invites ({pendingMembers.length})</h3>
                    {pendingMembers.map(member => (
                        <p key={member.email} className="text-xs text-gray-500 truncate">{member.email} - <span className="text-yellow-400">Pending</span></p>
                    ))}
                </div>
            )}
        </div>
    </>
    )
};

const ActivityFeed = () => (
    <div>
        <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
        <p className="text-sm text-gray-400">Activity feed, developing...</p>
    </div>
);

const ChatPanel = () => (
    <div className="flex flex-col h-full">
        <div className="flex-grow">
        <p className="text-sm text-gray-400">Global chat future update...</p>
        </div>
        <div className="mt-4 flex items-center space-x-2">
                <input type="text" placeholder="Type a message..." className="flex-1 bg-gray-700 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                <button className="p-2 bg-indigo-600 rounded-lg"><Paperclip size={18}/></button>
        </div>
    </div>
);

const Countdown = ({ deadline }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(deadline) - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000);
        return () => clearTimeout(timer);
    });

    return (
        <p className="text-sm text-gray-400">
            Deadline: {timeLeft.days || 0}d {timeLeft.hours || 0}h {timeLeft.minutes || 0}m
        </p>
    );
};

const InviteModal = ({ isOpen, onClose, onInviteSent, currentMembers = [] }) => {
    const [email, setEmail] = useState("");
    const [searchResult, setSearchResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [role, setRole] = useState("Analyst");
    const [editableName, setEditableName] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setEmail("");
                setSearchResult(null);
                setIsLoading(false);
                setError("");
                setRole("Analyst");
                setEditableName("");
                setIsEditingName(false);
            }, 300); 
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!email) return;

        const isAlreadyMember = currentMembers.some(member => member.email === email);
        if (isAlreadyMember) {
            setError("This user is already a member of this project.");
            return;
        }

        setIsLoading(true);
        setError("");
        setSearchResult(null);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                setSearchResult({ id: querySnapshot.docs[0].id, ...userData });
                setEditableName(userData.fullName || ""); 
            } else {
                setError("User not found.");
            }
        } catch (err) {
            setError("Failed to search for user.");
            console.error(err);
        }
        setIsLoading(false);
    };

    const handleSendInvite = () => {
        if (!searchResult || !editableName) return;
        onInviteSent({
            uid: searchResult.id,
            email: searchResult.email,
            name: editableName, 
            role: role,
            inviteAccepted: false,
        });
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Invite Member</h2>
                    <IconButton icon={<X />} tooltip="Close" onClick={onClose} />
                </div>
                <div className="flex space-x-2">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter user's email" 
                        className="flex-1 bg-gray-700 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={handleSearch} disabled={isLoading} className="bg-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {isLoading ? "Searching..." : "Search"}
                    </button>
                </div>

                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

                {searchResult && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-gray-700/50 rounded-lg"
                    >
                        <div className="flex items-center justify-between gap-2">
                           {isEditingName ? (
                                <input
                                    type="text"
                                    value={editableName}
                                    onChange={(e) => setEditableName(e.target.value)}
                                    className="flex-1 bg-gray-600 text-lg font-bold rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                />
                           ) : (
                                <p className="font-bold text-lg truncate">{editableName}</p>
                           )}
                           <IconButton 
                                icon={isEditingName ? <CheckSquare size={18}/> : <Edit size={16} />}
                                tooltip={isEditingName ? "Confirm Name" : "Edit Name"}
                                onClick={() => setIsEditingName(!isEditingName)}
                           />
                        </div>

                        <p className="text-sm text-gray-400">{searchResult.email}</p>
                        
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-4 w-full bg-gray-600 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option>Analyst</option>
                            <option>Coder</option>
                            <option>Designer</option>
                            <option>Tester</option>
                        </select>
                        <button onClick={handleSendInvite} className="w-full mt-4 bg-green-600 py-2 rounded-lg text-sm font-semibold hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!editableName}>
                            Send Invite
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
};

const ProjectSettings = ({ room, roomId, members, isOwner }) => {
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
                {/* General Settings */}
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

                {/* SDLC Phases */}
                <SettingsSection title="Project Phases">
                    <div className="flex flex-wrap gap-2">
                        {allPhases.map(phase => (
                            <button key={phase} onClick={() => handlePhaseToggle(phase)} className={`px-3 py-1 text-sm rounded-full transition-colors border ${sdlcPhases.includes(phase) ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>{phase}</button>
                        ))}
                    </div>
                </SettingsSection>

                {/* Access Control */}
                <SettingsSection title="Access Control">
                        {members.filter(m => m.uid !== room.ownerId && m.inviteAccepted).map(member => (
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

                {/* Danger Zone: Only visible to the project owner */}
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

const FullScreenMessage = ({ title, message }) => (
    <div className="h-screen bg-slate-900 text-white flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle size={48} className="text-yellow-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-slate-400 max-w-md">{message}</p>
    </div>
);

const VideoStream = ({ stream, muted = false, name = "" }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);
    return (
        <div className="relative w-full h-full bg-slate-800 rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
            <p className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded-md">{name}</p>
        </div>
    );
};

const CallWindow = ({ localStream, remoteStreams, onHangUp, isMuted, isVideoOff, onToggleMute, onToggleVideo, members, currentUser }) => {
    const remoteStreamEntries = Object.entries(remoteStreams);

    return (
        <div className="fixed inset-0 bg-slate-900 z-40 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full h-full flex flex-col"
            >
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                    <VideoStream stream={localStream} muted={true} name={`${currentUser?.name || 'You'} (You)`} />
                    {remoteStreamEntries.map(([uid, stream]) => {
                        const member = members.find(m => m.uid === uid);
                        return <VideoStream key={uid} stream={stream} muted={false} name={member?.name || 'Guest'} />;
                    })}
                </div>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-sm p-3 rounded-full">
                    <button onClick={onToggleMute} className="p-3 rounded-full bg-white/10 hover:bg-white/20">
                        {isMuted ? <MicOff /> : <Mic />}
                    </button>
                    <button onClick={onToggleVideo} className="p-3 rounded-full bg-white/10 hover:bg-white/20">
                        {isVideoOff ? <VideoOff /> : <Video />}
                    </button>
                    <button onClick={onHangUp} className="p-3 rounded-full bg-red-600 hover:bg-red-500">
                        <PhoneOff />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const ToastNotification = ({ message, icon }) => (
    <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-5 right-5 bg-slate-800 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 border border-slate-700"
    >
        {icon}
        <span>{message}</span>
    </motion.div>
);

// --- Main RoomView Component ---

const RoomView = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [room, setRoom] = useState(null);
    const [membersWithStatus, setMembersWithStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('overview'); 
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [accessLost, setAccessLost] = useState(null);
    const [callActive, setCallActive] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [ongoingCall, setOngoingCall] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [showCallInfoPopup, setShowCallInfoPopup] = useState(false);
    const attendeesRef = useRef([]);

    const addNotification = (message, type) => {
        const id = Date.now();
        const icon = type === 'join' ? <LogIn size={16} className="text-green-400" /> : <LogOut size={16} className="text-red-400" />;
        setNotifications(prev => [...prev, { id, message, icon }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };

    const handleStartCall = async (type) => {
        if (!user || !room?.memberIds) return;
        setIsMuted(false);
        setIsVideoOff(type === 'voice');
        const callId = await webrtcService.startCall(type, user.uid, room.memberIds);
        setCallActive(true);
        setShowCallInfoPopup(true);
    };

    const handleJoinCall = async (type) => {
        if (!ongoingCall || !user) return;
        setIsMuted(false);
        setIsVideoOff(type === 'voice');
        await webrtcService.answerCall(ongoingCall.id, user.uid);
        setCallActive(true);
        setShowCallInfoPopup(true);
    };

    const handleAcceptCall = async () => {
        if (!incomingCall || !user) return;
        setIsMuted(false);
        setIsVideoOff(incomingCall.type === 'voice');
        await webrtcService.answerCall(incomingCall.id, user.uid);
        setCallActive(true);
        setIncomingCall(null);
        setShowCallInfoPopup(true);
    };

    const handleDeclineCall = async () => {
        if (!incomingCall) return;
        await webrtcService.declineCall(incomingCall.id);
        setIncomingCall(null);
    };

    const handleHangUp = async () => {
        await webrtcService.hangUp();
    };

    const handleToggleMute = () => {
        const newMutedState = !isMuted;
        if (webrtcService.localStream) {
            webrtcService.localStream.getAudioTracks().forEach(track => {
                track.enabled = !newMutedState;
            });
            setIsMuted(newMutedState);
        }
    };

    const handleToggleVideo = () => {
        const newVideoState = !isVideoOff;
        if (webrtcService.localStream) {
            webrtcService.localStream.getVideoTracks().forEach(track => {
                track.enabled = !newVideoState;
            });
            setIsVideoOff(newVideoState);
        }
    };
    
    const handleInviteSent = async (newMember) => {
        if (!roomId) return;
        const roomRef = doc(db, "rooms", roomId);
        await updateDoc(roomRef, {
            members: arrayUnion(newMember),
            memberIds: arrayUnion(newMember.uid)
        });
    };

    // --- useEffect Hooks ---

    useEffect(() => {
        if (!user || !roomId) return;
        const roomRef = doc(db, "rooms", roomId);
        const unsub = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const roomData = docSnap.data();
                if (!roomData.memberIds.includes(user.uid)) {
                    setAccessLost('removed');
                    return;
                }
                setRoom({ id: docSnap.id, ...roomData });
            } else {
                setAccessLost('deleted');
                setRoom(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [roomId, user]);

    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        updateDoc(userDocRef, { lastSeen: serverTimestamp() });
        const interval = setInterval(() => {
            updateDoc(userDocRef, { lastSeen: serverTimestamp() });
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (!room?.members) return;
        const memberUIDs = room.members.map(m => m.uid);
        if (memberUIDs.length === 0) return;
        const q = query(collection(db, "users"), where('__name__', 'in', memberUIDs));
        const unsub = onSnapshot(q, (snapshot) => {
            const usersStatusMap = new Map();
            snapshot.forEach(userDoc => usersStatusMap.set(userDoc.id, userDoc.data()));
            const combinedMembers = room.members.map(m => ({ ...m, ...usersStatusMap.get(m.uid) }));
            setMembersWithStatus(combinedMembers);
        });
        return () => unsub();
    }, [room?.members]);

    useEffect(() => {
        if (!user?.uid) return;
        const callsRef = collection(db, 'calls');
        const q = query(callsRef, where('participants', 'array-contains', user.uid), where('status', 'in', ['ringing', 'accepted']));
        const unsub = onSnapshot(q, (snapshot) => {
            const ringingCalls = [];
            let activeCall = null;
            snapshot.forEach(doc => {
                const callData = { id: doc.id, ...doc.data() };
                if (callData.status === 'ringing' && callData.createdBy !== user.uid) {
                    ringingCalls.push(callData);
                } else if (callData.status === 'accepted') {
                    activeCall = callData;
                }
            });
            setIncomingCall(ringingCalls.length > 0 ? ringingCalls[0] : null);
            setOngoingCall(activeCall);

            if (activeCall && callActive) {
                const currentAttendees = activeCall.attendees || [];
                const previousAttendees = attendeesRef.current;
                currentAttendees.forEach(uid => {
                    if (!previousAttendees.includes(uid)) {
                        const member = membersWithStatus.find(m => m.uid === uid);
                        if (member && uid !== user.uid) addNotification(`${member.name} joined the call.`, 'join');
                    }
                });
                previousAttendees.forEach(uid => {
                    if (!currentAttendees.includes(uid)) {
                        const member = membersWithStatus.find(m => m.uid === uid);
                        if (member) addNotification(`${member.name} left the call.`, 'leave');
                    }
                });
                attendeesRef.current = currentAttendees;
            } else if (!activeCall) {
                attendeesRef.current = [];
            }
        });
        return () => unsub();
    }, [user?.uid, callActive, membersWithStatus]);

    useEffect(() => {
        webrtcService.onLocalStream = (stream) => setLocalStream(stream);
        webrtcService.onRemoteStreamsChange = (streams) => setRemoteStreams(streams);
        webrtcService.onCallEnded = () => {
            setCallActive(false);
            setLocalStream(null);
            setRemoteStreams({});
            setIsMuted(false);
            setIsVideoOff(true);
        };
        return () => { if (webrtcService.callId) webrtcService.hangUp(); };
    }, []);

    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
            localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
        }
    }, [localStream]);

    useEffect(() => {
        if (showCallInfoPopup) {
            const timer = setTimeout(() => setShowCallInfoPopup(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showCallInfoPopup]);

    // --- Render Logic ---

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900 text-lg font-semibold text-gray-300">Loading Project Room...</div>;
    if (accessLost) return <FullScreenMessage title={accessLost === 'deleted' ? "Project Deleted" : "Access Revoked"} message={accessLost === 'deleted' ? "This project has been permanently deleted." : "You have been removed from this project."} />;
    if (!room) return <div className="flex items-center justify-center h-screen bg-gray-900 text-lg font-semibold text-red-400">Project room not found.</div>;

    const isAdmin = room.adminIds && room.adminIds.includes(user.uid);
    const isOwner = user.uid === room.ownerId;
    const projectCreator = membersWithStatus.find(m => m.uid === room.ownerId);
    const currentUser = membersWithStatus.find(m => m.uid === user.uid);

    return (
        <>
            <style>{`.custom-scrollbar::-webkit-scrollbar{width:8px;}.custom-scrollbar::-webkit-scrollbar-track{background:transparent;}.custom-scrollbar::-webkit-scrollbar-thumb{background:#4f46e5;border-radius:10px;}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#6366f1;}`}</style>
            <AnimatePresence>
                {isInviteModalOpen && <InviteModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} onInviteSent={handleInviteSent} currentMembers={membersWithStatus} />}
                {incomingCall && !callActive && <IncomingCallModal callData={incomingCall} onAccept={handleAcceptCall} onDecline={handleDeclineCall} />}
            </AnimatePresence>

            {callActive && <CallWindow localStream={localStream} remoteStreams={remoteStreams} onHangUp={handleHangUp} isMuted={isMuted} isVideoOff={isVideoOff} onToggleMute={handleToggleMute} onToggleVideo={handleToggleVideo} members={membersWithStatus} currentUser={currentUser} />}
            
            <div className="fixed bottom-5 right-5 z-50 space-y-3">
                <AnimatePresence>
                    {notifications.map(n => <ToastNotification key={n.id} message={n.message} icon={n.icon} />)}
                    {showCallInfoPopup && <ToastNotification message="Your mic is on and video is off by default." icon={<Info size={16} className="text-blue-400" />} />}
                </AnimatePresence>
            </div>

            <div className="h-screen bg-gray-900 text-white font-sans flex flex-col">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>
                
                <div className="flex flex-1 overflow-hidden relative z-10">
                    <Sidebar room={room} activeView={activeView} setActiveView={setActiveView} isAdmin={isAdmin} />
                    <div className="flex-1 flex flex-col z-10 overflow-hidden">
                        <Header room={room} onStartCall={handleStartCall} onShareScreen={() => {}} isCallActive={callActive} ongoingCall={ongoingCall} onJoinCall={handleJoinCall} />
                        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                <motion.div key={activeView} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                                    {activeView === 'overview' && (
                                        <>
                                            <div className="mb-4">
                                                <h2 className="text-2xl font-bold text-white">Welcome back!</h2>
                                                <p className="text-md text-gray-400">Here's a look at the "{room.projectName}" project.</p>
                                            </div>
                                            <div className="mb-6 shadow-2xl shadow-indigo-900/50 rounded-xl overflow-hidden border border-white/10 h-[45vh]">
                                                <TrainModel phases={room.sdlcPhases || []} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                <StatCard icon={<Clock size={24} className="text-indigo-300" />} label="Progress" value={`${room.progress || 0}%`} />
                                                <StatCard icon={<Users size={24} className="text-indigo-300" />} label="Members" value={membersWithStatus.filter(m => m.inviteAccepted).length} />
                                                <StatCard icon={<User size={24} className="text-indigo-300" />} label="Project Creator" value={projectCreator?.name || 'N/A'} />
                                                <StatCard icon={<Box size={24} className="text-indigo-300" />} label="Total Phases" value={room.sdlcPhases?.length || 0} />
                                            </div>
                                        </>
                                    )}
                                    {activeView === 'tasks' && <div className="text-center p-10 bg-gray-800/50 rounded-lg">Kanban Board View will be shown here</div>}
                                    {activeView === 'analytics' && <div className="text-center p-10 bg-gray-800/50 rounded-lg">Analytics & Gantt Chart will come here</div>}
                                    {activeView === 'settings' && isAdmin && <ProjectSettings room={room} roomId={roomId} members={membersWithStatus} isOwner={isOwner} />}
                                </motion.div>
                            </AnimatePresence>
                        </main>
                    </div>
                    <CollaborationPanel members={membersWithStatus} onInvite={() => setInviteModalOpen(true)} user={user} room={room} roomId={room.id} />
                </div>
            </div>
        </>
    );
};

export default RoomView;
