import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion, collection, query, where, getDocs, arrayRemove, deleteDoc, orderBy, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../routes/AuthContext";
import TrainModel from "../components/TrainModel";
import { motion, AnimatePresence } from "framer-motion";
import { getMembersWithStatus } from "../utils/getMembersWithStatus";
import {
    Clock, Users, User, Box, LayoutDashboard, CheckSquare,
    BarChart3, Settings, Plus, Edit, Paperclip, Trash2,
    Search, Phone, Video, ScreenShare, X, User as UserIcon, Check, AlertTriangle, Shield, ShieldOff,
    Mic, MicOff, PhoneOff, VideoOff, LogIn, LogOut, Info, MessageSquare, Pin, PinOff, Send
} from "lucide-react";

import { webrtcService } from '../services/webrtcService';
import IncomingCallModal from '../components/IncomingCallModal';


const StatCard = ({ icon, label, value }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg flex items-center space-x-4">
        <div className="bg-indigo-500/20 p-3 rounded-lg">{icon}</div>
        <div>
            <p className="text-sm text-indigo-200 font-medium">{label}</p>
            <p className="text-lg text-white font-semibold truncate">{value}</p>
        </div>
    </div>
);

const IconButton = ({ icon, tooltip, onClick, className, isActive }) => (
    <button onClick={onClick} className={`p-3 rounded-full transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'} relative group ${className}`}>
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
    <header className="flex items-center justify-between p-4 pt-5 border-b border-slate-700/50 bg-slate-900/30 backdrop-blur-lg">
        <div>
            <div className="flex items-center space-x-3">
                <p className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                    room.status === 'In Progress' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' :
                    room.status === 'Completed' ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
                    'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'
                }`}>{room.status}</p>
                <Countdown deadline={room.deadline} />
            </div>
        </div>
        <div className="flex items-center space-x-3">
            <div className="flex items-center p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-inner gap-0.5">
                <IconButton icon={<Search size={18} />} tooltip="Search" />
                <IconButton icon={<Paperclip size={18} />} tooltip="Attachments" />
            </div>
            <div className="flex items-center p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-inner gap-0.5">
                {ongoingCall && !isCallActive ? (
                    <button 
                        onClick={() => onJoinCall(ongoingCall.type)} 
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-green-200 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-all duration-300 ease-in-out transform hover:scale-105"
                    >
                        <LogIn size={16} />
                        <span>Join Call</span>
                    </button>
                ) : (
                    <>
                        <IconButton 
                            icon={<Phone size={18} />} 
                            tooltip="Start Voice Call"
                            onClick={() => onStartCall('voice')}
                            className={isCallActive || ongoingCall ? 'opacity-40 cursor-not-allowed' : 'hover:text-green-400'} 
                        />
                        <IconButton 
                            icon={<Video size={18} />} 
                            tooltip="Start Video Call"
                            onClick={() => onStartCall('video')}
                            className={isCallActive || ongoingCall ? 'opacity-40 cursor-not-allowed' : 'hover:text-green-400'} 
                        />
                    </>
                )}
            </div>
        </div>
    </header>
);

const CollaborationPanel = ({ members, onInvite, currentUser, room, roomId }) => {
    const [activeTab, setActiveTab] = useState('members');
    return (
        <aside className="w-80 bg-gray-900/70 backdrop-blur-xl border-l border-white/10 flex flex-col">
            <div className="flex items-center border-b border-white/10">
                <TabButton label="Members" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} />
                <TabButton label="Activity" isActive={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
                <TabButton label="Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            </div>
            <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                {activeTab === 'members' && <MembersList members={members} onInvite={onInvite} currentUser={currentUser} room={room} roomId={roomId} />}
                {activeTab === 'activity' && <ActivityFeed />}
                {activeTab === 'chat' && <ChatPanel roomId={roomId} currentUser={currentUser} />}
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

    // **FIX: Add a guard clause to prevent crash on initial render**
    if (!currentUser) {
        return null; // Or a loading spinner
    }

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

const ChatPanel = ({ roomId, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!roomId) return;
        const messagesRef = collection(db, "rooms", roomId, "chat");
        const q = query(messagesRef, orderBy("timestamp"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [roomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === "" || !currentUser) return;

        const messagesRef = collection(db, "rooms", roomId, "chat");
        await addDoc(messagesRef, {
            text: newMessage,
            senderUid: currentUser.uid,
            senderName: currentUser.name,
            photoURL: currentUser.photoURL || null, 
            timestamp: serverTimestamp(),
        });

        setNewMessage("");
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50">

            <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-900">
  {messages.map((msg) => {
    const isCurrentUser = msg.senderUid === currentUser?.uid;
    return (
      <div
        key={msg.id}
        className={`flex items-end gap-2 ${
          isCurrentUser ? "justify-end" : "justify-start"
        }`}
      >
        {!isCurrentUser && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            {msg.photoURL ? (
              <img
                src={msg.photoURL}
                alt={msg.senderName}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-full h-full p-1.5 text-slate-400 bg-slate-700" />
            )}
          </div>
        )}

        <div
          className={`relative max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm ${
            isCurrentUser
              ? "bg-slate-500 text-white rounded-br-none"
              : "bg-slate-700 text-white rounded-bl-none"
          }`}
        >
          {isCurrentUser ? (<p className="text-sm font-semibold text-teal-300">
              You
            </p>) : (
            <p className="text-sm font-semibold text-teal-300">
              {msg.senderName}
            </p>
          )}
          <p className="text-sm break-words pr-10">{msg.text}</p>
          <span className="absolute bottom-1 right-1 text-[10px] text-gray-300">
            {msg.timestamp?.toDate().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {isCurrentUser && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="You"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-full h-full p-1.5 text-slate-400 bg-slate-700" />
            )}
          </div>
        )}
      </div>
    );
  })}
  <div ref={messagesEndRef} />
</div>


            <div className="p-4 border-t border-slate-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                            <Paperclip size={18} />
                        </button>
                    </div>
                    <button type="submit" className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors disabled:bg-slate-600" disabled={!newMessage.trim()}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};


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

const VideoStream = ({ stream, muted = false, name = "", photoURL, isVideoOff, isAudioMuted, onPin, isPinned, isScreenShare = false }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative w-full h-full bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center group aspect-video">
            <video ref={videoRef} autoPlay playsInline muted={muted} className={`w-full h-full object-cover transition-opacity duration-300 ${!stream || isVideoOff ? 'opacity-0' : 'opacity-100'}`} />
            
            {(!stream || isVideoOff) && !isScreenShare && (
                 <AnimatePresence>
                     <motion.div 
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.8 }}
                         className="absolute inset-0 flex items-center justify-center"
                     >
                         {photoURL ? (
                             <img src={photoURL} alt={name} className="w-24 h-24 rounded-full object-cover" />
                         ) : (
                             <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                                 <UserIcon size={48} className="text-slate-400" />
                             </div>
                         )}
                     </motion.div>
                 </AnimatePresence>
            )}

            <div className="absolute bottom-2 left-3 flex items-center gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-md">
                <p className="text-white font-medium text-sm drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                    {name}
                </p>
                {isAudioMuted && !isScreenShare && (
                    <MicOff size={14} className="text-white" />
                )}
            </div>

            {onPin && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onPin} className="p-1.5 bg-black/40 rounded-full text-white hover:bg-black/70">
                        {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                </div>
            )}
        </div>
    );
};

const CallWindow = ({ 
    localStream, remoteStreams, onHangUp, isMuted, isVideoOff, onToggleMute, onToggleVideo, 
    members, currentUser, onShareScreen, isScreenSharing, activePanel, setActivePanel, 
    pinnedUid, setPinnedUid, screenShareStream, onSendMessage, chatMessages, remoteScreenStreams 
}) => {
    
    const allParticipants = [
        { uid: currentUser.uid, stream: localStream, isLocal: true, type: 'video' },
        ...Object.entries(remoteStreams).map(([uid, stream]) => ({ uid, stream, isLocal: false, type: 'video' })),
        ...(isScreenSharing ? [{ uid: `${currentUser.uid}_screen`, stream: screenShareStream, isLocal: true, type: 'screen' }] : []),
        ...Object.entries(remoteScreenStreams).map(([uid, stream]) => ({ uid: `${uid}_screen`, stream, isLocal: false, type: 'screen' }))
    ];

    const getParticipantOriginalUid = (p) => p.uid.replace('_screen', '');

    const mainScreenShare = allParticipants.find(p => p.type === 'screen');
    const pinnedStream = pinnedUid ? allParticipants.find(p => p.uid === pinnedUid) : null;
    const mainViewParticipant = pinnedStream || mainScreenShare;

    const sidebarParticipants = mainViewParticipant 
        ? allParticipants.filter(p => p.uid !== mainViewParticipant.uid)
        : [];
    
    const gridParticipants = !mainViewParticipant ? allParticipants : [];

    const getParticipantInfo = (p) => {
        if (!p) return {};
        const originalUid = getParticipantOriginalUid(p);
        const member = members.find(m => m.uid === originalUid);
        
        if (p.type === 'screen') {
            return {
                name: `${member?.name || 'Guest'}'s Screen`,
                isScreenShare: true,
                onPin: () => setPinnedUid(null) 
            };
        }

        const isVideoTrackOff = !p.stream?.getVideoTracks().some(t => t.enabled);
        const isAudioTrackOff = !p.stream?.getAudioTracks().some(t => t.enabled);

        return {
            name: p.isLocal ? `${member?.name || 'You'} (You)` : member?.name || 'Guest',
            photoURL: member?.photoURL,
            isVideoOff: p.isLocal ? isVideoOff : isVideoTrackOff,
            isAudioMuted: p.isLocal ? isMuted : isAudioTrackOff,
            onPin: () => setPinnedUid(p.uid === pinnedUid ? null : p.uid),
            isPinned: p.uid === pinnedUid
        };
    };

    const getLayoutClasses = (count) => {
        if (count === 1) return "grid-cols-1 grid-rows-1 max-w-4xl mx-auto";
        if (count === 2) return "grid-cols-2 grid-rows-1";
        if (count <= 4) return "grid-cols-2 grid-rows-2";
        if (count <= 9) return "grid-cols-3 grid-rows-3";
        return "grid-cols-4 grid-rows-3";
    };

    return (
        <div className="fixed inset-0 bg-slate-950 z-40 flex flex-col">
            <div className="flex-1 flex min-h-0 relative">
                <div className={`flex-1 flex p-4`}>
                    <div className="flex-1 min-w-0">
                        {mainViewParticipant ? (
                            <VideoStream 
                                {...getParticipantInfo(mainViewParticipant)}
                                stream={mainViewParticipant.stream} 
                                muted={mainViewParticipant.isLocal} 
                            />
                        ) : (
                            <div className={`w-full h-full grid ${getLayoutClasses(gridParticipants.length)} gap-4`}>
                                {gridParticipants.map(p => (
                                    <div key={p.uid} className="min-h-0">
                                        <VideoStream 
                                            {...getParticipantInfo(p)}
                                            stream={p.stream} 
                                            muted={p.isLocal} 
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {mainViewParticipant && sidebarParticipants.length > 0 && (
                        <div className="w-64 flex-shrink-0 flex flex-col space-y-4 overflow-y-auto pl-4">
                            {sidebarParticipants.map(p => (
                                <div key={p.uid} className="w-full aspect-video flex-shrink-0">
                                    <VideoStream 
                                        {...getParticipantInfo(p)}
                                        stream={p.stream} 
                                        muted={p.isLocal} 
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {activePanel && (
                        <motion.div 
                            initial={{ x: "100%" }} 
                            animate={{ x: 0 }} 
                            exit={{ x: "100%" }} 
                            transition={{ type: "spring", stiffness: 300, damping: 30 }} 
                            className="w-80 bg-slate-900/80 backdrop-blur-md border-l border-slate-700 flex flex-col"
                        >
                            {activePanel === 'members' && <CallMembersPanel members={members} currentUser={currentUser} allParticipants={allParticipants} />}
                            {activePanel === 'chat' && <CallChatPanel onSendMessage={onSendMessage} messages={chatMessages} currentUser={currentUser} />}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-center items-center flex-shrink-0 p-4">
                <div className="flex items-center gap-4 bg-slate-800/80 backdrop-blur-sm p-3 rounded-full border border-slate-700">
                    <IconButton icon={isMuted ? <MicOff /> : <Mic />} tooltip={isMuted ? "Unmute" : "Mute"} onClick={onToggleMute} className={isMuted ? 'bg-red-600 text-white' : ''} />
                    <IconButton icon={isVideoOff ? <VideoOff /> : <Video />} tooltip={isVideoOff ? "Start Video" : "Stop Video"} onClick={onToggleVideo} className={isVideoOff ? 'bg-red-600 text-white' : ''} />
                    <IconButton icon={<ScreenShare />} tooltip={isScreenSharing ? "Stop Sharing" : "Share Screen"} onClick={onShareScreen} isActive={isScreenSharing} />
                    <IconButton icon={<Users />} tooltip="Participants" onClick={() => setActivePanel(activePanel === 'members' ? null : 'members')} isActive={activePanel === 'members'} />
                    <IconButton icon={<MessageSquare />} tooltip="Chat" onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')} isActive={activePanel === 'chat'} />
                    <button onClick={onHangUp} className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white">
                        <PhoneOff />
                    </button>
                </div>
            </div>
        </div>
    );
};

const CallMembersPanel = ({ members, currentUser, allParticipants }) => {
    const attendeeUids = new Set(allParticipants.map(p => p.uid.replace('_screen', '')));
    const attendees = members.filter(m => attendeeUids.has(m.uid));
    
    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-bold text-white">Participants ({attendees.length})</h3>
            </div>
            <div className="flex-grow p-2 overflow-y-auto custom-scrollbar">
                <div className="space-y-2 p-2">
                    {attendees.map(member => (
                        <div key={member.uid} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                            <div className="relative">
                                {member.photoURL ? 
                                    <img src={member.photoURL} className="w-10 h-10 rounded-full object-cover" alt={member.name}/> : 
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                        <UserIcon className="w-6 h-6 text-slate-400" />
                                    </div>
                                }
                            </div>
                            <span className="font-medium text-white">
                                {member.name}
                                {member.uid === currentUser.uid && <span className="text-xs text-indigo-400 ml-1.5">(You)</span>}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CallChatPanel = ({ onSendMessage, messages, currentUser }) => {
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);
    
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [sortedMessages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() === "") return;
        onSendMessage(newMessage, currentUser?.name || "Guest");
        setNewMessage("");
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-bold text-white">In-call Chat</h3>
                <p className="text-xs text-slate-400">Messages are deleted when the call ends.</p>
            </div>

            <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar">
                {sortedMessages.map((msg) => {
                    const isCurrentUser = msg.senderUid === currentUser?.uid;
                    return (
                        <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl ${isCurrentUser ? 'bg-indigo-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
                                {!isCurrentUser && (
                                    <p className="text-xs font-bold text-indigo-300">{msg.senderName}</p>
                                )}
                                <p className="text-sm text-white break-words">{msg.text}</p>
                                <p className={`text-xs text-slate-400 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button type="submit" className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors disabled:bg-slate-600" disabled={!newMessage.trim()}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

const ToastNotification = ({ message, icon }) => (
    <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 right-5 bg-slate-800 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 border border-slate-700"
    >
        {icon}
        <span>{message}</span>
    </motion.div>
);

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
    const [notifications, setNotifications] = useState([]);
    const [callActive, setCallActive] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [ongoingCall, setOngoingCall] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState({});
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoOff, setIsVideoOff] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenShareStream, setScreenShareStream] = useState(null);
    const [activeCallPanel, setActiveCallPanel] = useState(null);
    const [pinnedUid, setPinnedUid] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const attendeesRef = useRef([]);

    const addNotification = useCallback((message, type) => {
        const id = Date.now();
        const icon = type === 'join' ? <LogIn size={16} className="text-green-400" /> 
                   : type === 'leave' ? <LogOut size={16} className="text-red-400" />
                   : <MessageSquare size={16} className="text-blue-400" />;
        setNotifications(prev => [...prev, { id, message, icon }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    }, []);

    const handleStartCall = async (type) => {
        if (!user || !room?.memberIds || ongoingCall) return;
        setIsMuted(type === 'video'); // Muted by default for video calls
        setIsVideoOff(type === 'voice');
        await webrtcService.startCall(type, user.uid, room.memberIds);
        setCallActive(true);
    };

    const handleJoinCall = async (type) => {
        if (!ongoingCall || !user) return;
        setIsMuted(type === 'video');
        setIsVideoOff(type === 'voice');
        await webrtcService.answerCall(ongoingCall.id, user.uid);
        setCallActive(true);
    };

    const handleAcceptCall = async () => {
        if (!incomingCall || !user) return;
        setIsMuted(incomingCall.type === 'video');
        setIsVideoOff(incomingCall.type === 'voice');
        await webrtcService.answerCall(incomingCall.id, user.uid);
        setCallActive(true);
        setIncomingCall(null);
    };

    const handleDeclineCall = () => {
        setIncomingCall(null);
    };

    const handleHangUp = async () => {
        await webrtcService.hangUp();
    };

    const handleToggleMute = () => {
        const newMutedState = !isMuted;
        webrtcService.localStream?.getAudioTracks().forEach(track => {
            track.enabled = !newMutedState;
        });
        setIsMuted(newMutedState);
    };

    const handleToggleVideo = () => {
        const newVideoState = !isVideoOff;
        webrtcService.localStream?.getVideoTracks().forEach(track => {
            track.enabled = !newVideoState;
        });
        setIsVideoOff(newVideoState);
    };

    const handleShareScreen = async () => {
        if (!callActive) return;
        if (isScreenSharing) {
            await webrtcService.stopScreenShare();
        } else {
            await webrtcService.startScreenShare();
        }
    };
    
    const handleSendMessage = (text, senderName) => {
        webrtcService.sendMessage(text, senderName);
    };
    
    const handleInviteSent = async (newMember) => {
        if (!roomId) return;
        const roomRef = doc(db, "rooms", roomId);
        await updateDoc(roomRef, {
            members: arrayUnion(newMember),
            memberIds: arrayUnion(newMember.uid)
        });
    };

    useEffect(() => {
        webrtcService.onLocalStream = setLocalStream;
        webrtcService.onRemoteStreamsChange = setRemoteStreams;
        webrtcService.onScreenShareStateChange = (isSharing, stream) => {
            setIsScreenSharing(isSharing);
            setScreenShareStream(stream);
        };
        webrtcService.onRemoteScreenStream = (uid, stream) => {
            setRemoteScreenStreams(prev => {
                const newStreams = { ...prev };
                if (stream) {
                    newStreams[uid] = stream;
                } else {
                    delete newStreams[uid];
                }
                return newStreams;
            });
        };
        webrtcService.onNewMessage = (newMessages) => {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.senderUid !== user.uid) {
                addNotification(`${lastMessage.senderName}: ${lastMessage.text}`, 'message');
            }
            setChatMessages(prev => [...prev, ...newMessages]);
        };
        webrtcService.onCallEnded = () => {
            setCallActive(false);
            setLocalStream(null);
            setRemoteStreams({});
            setRemoteScreenStreams({});
            setIsMuted(true);
            setIsVideoOff(true);
            setIsScreenSharing(false);
            setScreenShareStream(null);
            setActiveCallPanel(null);
            setPinnedUid(null);
            setChatMessages([]);
        };

        return () => {
            if (webrtcService.callId) {
                webrtcService.hangUp();
            }
        };
    }, [user.uid, addNotification]);

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
        if (memberUIDs.length === 0) {
            setMembersWithStatus([]);
            return;
        };

  // Listen for changes in these users
  const q = query(
      collection(db, "users"),
      where("uid", "in", memberUIDs)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      // Build a map of uid → latest user data
      const usersMap = new Map();
      snapshot.forEach(userDoc => {
        const data = userDoc.data();
        usersMap.set(data.uid, data);
      });

      // Merge latest user data with room-specific member fields
      const combined = room.members.map(m => {
      const liveUser = usersMap.get(m.uid) || {}; // Get live user data or an empty object
      return {
        ...m,  // 1. Start with the base member data from the room (role, inviteAccepted)
        ...liveUser, // 2. Merge in all live properties (lastSeen, email, etc.)
        name: liveUser.fullName || m.name, // 3. **Crucially, overwrite 'name' with the live 'fullName'**
      };
    });

    setMembersWithStatus(combined);

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
            
            if (!callActive) {
                setIncomingCall(ringingCalls.length > 0 ? ringingCalls[0] : null);
            }
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
    }, [user?.uid, callActive, membersWithStatus, addNotification]);

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
                {incomingCall && <IncomingCallModal callData={incomingCall} onAccept={handleAcceptCall} onDecline={handleDeclineCall} />}
            </AnimatePresence>
            
            {callActive && currentUser && <CallWindow 
                localStream={localStream} 
                remoteStreams={remoteStreams} 
                onHangUp={handleHangUp} 
                isMuted={isMuted} 
                isVideoOff={isVideoOff} 
                onToggleMute={handleToggleMute} 
                onToggleVideo={handleToggleVideo} 
                members={membersWithStatus} 
                currentUser={currentUser} 
                onShareScreen={handleShareScreen} 
                isScreenSharing={isScreenSharing} 
                activePanel={activeCallPanel} 
                setActivePanel={setActiveCallPanel} 
                pinnedUid={pinnedUid} 
                setPinnedUid={setPinnedUid} 
                screenShareStream={screenShareStream} 
                onSendMessage={handleSendMessage} 
                chatMessages={chatMessages}
                remoteScreenStreams={remoteScreenStreams}
            />}
            
            <div className="fixed bottom-5 right-5 z-50 space-y-3">
                <AnimatePresence>
                    {notifications.map(n => <ToastNotification key={n.id} message={n.message} icon={n.icon} />)}
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
                        <Header room={room} onStartCall={handleStartCall} onShareScreen={handleShareScreen} isCallActive={callActive} ongoingCall={ongoingCall} onJoinCall={handleJoinCall} />
                        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                           <AnimatePresence mode="wait">
                               <motion.div key={activeView} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                                   {activeView === 'overview' && (
                                       <>
                                           <div className="mb-4">
                                               <h2 className="text-2xl font-bold text-white">Welcome back, {currentUser?.name}!</h2>
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
                    <CollaborationPanel members={membersWithStatus} onInvite={() => setInviteModalOpen(true)} currentUser={currentUser} room={room} roomId={room.id} />
                </div>
            </div>
        </>
    );
};

export default RoomView;