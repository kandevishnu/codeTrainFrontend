import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../routes/AuthContext";
import TrainModel from "../components/TrainModel";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Users, User, Box, LayoutDashboard, CheckSquare,
    BarChart3, Settings, Plus, Edit, Paperclip, Trash2,
    Search, Phone, Video, ScreenShare, Bell, X, User as UserIcon
} from "lucide-react";


const StatCard = ({ icon, label, value }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg flex items-center space-x-4">
        <div className="bg-indigo-500/20 p-3 rounded-lg">{icon}</div>
        <div>
            <p className="text-sm text-indigo-200 font-medium">{label}</p>
            <p className="text-lg text-white font-semibold truncate">{value}</p>
        </div>
    </div>
);

const IconButton = ({ icon, tooltip, onClick }) => (
    <button onClick={onClick} className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors relative group">
        {icon}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {tooltip}
        </span>
    </button>
);


const Sidebar = ({ room, activeView, setActiveView }) => (
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
             <SidebarItem icon={<Settings size={20} />} label="Project Settings" activeView={activeView} setActiveView={setActiveView} viewName="settings" />
        </div>
    </aside>
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

const Header = ({ room, onEdit }) => (
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
                 <IconButton icon={<Phone size={18} />} tooltip="Start Voice Call" />
                 <IconButton icon={<Video size={18} />} tooltip="Start Video Call" />
                 <IconButton icon={<ScreenShare size={18} />} tooltip="Share Screen" />
             </div>
             <IconButton icon={<Bell size={20} />} tooltip="Notifications" />
            <IconButton icon={<Edit size={16} />} tooltip="Edit Project Details" onClick={onEdit} />
        </div>
    </header>
);

const CollaborationPanel = ({ members, onInvite }) => {
    const [activeTab, setActiveTab] = useState('members');
    return (
        <aside className="w-80 bg-gray-900/70 backdrop-blur-xl border-l border-white/10 flex flex-col">
            <div className="flex items-center border-b border-white/10">
                <TabButton label="Members" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} />
                <TabButton label="Activity" isActive={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
                <TabButton label="Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                {activeTab === 'members' && <MembersList members={members} onInvite={onInvite} />}
                {activeTab === 'activity' && <ActivityFeed />}
                {activeTab === 'chat' && <ChatPanel />}
            </div>
        </aside>
    );
};

const TabButton = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 p-3 text-sm font-medium transition-colors ${isActive ? "text-white bg-gray-800" : "text-gray-400 hover:bg-gray-800/50"}`}>
        {label}
    </button>
);


// --- Updated MembersList with Status Indicator ---
const MembersList = ({ members, onInvite }) => {
    const acceptedMembers = members.filter(m => m.inviteAccepted);
    const pendingMembers = members.filter(m => !m.inviteAccepted);

    const getStatus = (lastSeen) => {
        if (!lastSeen?.toDate) return { color: 'bg-gray-500', text: 'Offline' };
        const minutesAgo = (new Date() - lastSeen.toDate()) / 60000;
        if (minutesAgo < 5) return { color: 'bg-green-500', text: 'Online' };
        if (minutesAgo < 30) return { color: 'bg-yellow-500', text: `Last seen ${Math.floor(minutesAgo)}m ago` };
        return { color: 'bg-gray-500', text: 'Offline' };
    };

    return (
    <div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Team Members ({acceptedMembers.length})</h3>
            <button onClick={onInvite} className="flex items-center space-x-1 text-sm bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors">
                <Plus size={16} />
                <span>Invite</span>
            </button>
        </div>
        <div className="space-y-3">
            {acceptedMembers.map(member => {
                const status = getStatus(member.lastSeen);
                return (
                    <div key={member.uid} className="flex items-center space-x-3 group">
                        <div className="relative">
                            {member.photoURL ? (
                                <img src={member.photoURL} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                    <UserIcon size={20} className="text-slate-400" />
                                </div>
                            )}
                            <span className={`absolute bottom-0 right-0 w-3 h-3 ${status.color} rounded-full border-2 border-gray-800`} title={status.text}></span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-white text-sm">{member.name}</p>
                            <p className="text-xs text-gray-400">{member.role}</p>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )
            })}
        </div>
        {pendingMembers.length > 0 && (
             <div className="mt-6">
                 <h3 className="font-semibold text-white mb-2 text-sm">Pending Invites ({pendingMembers.length})</h3>
                 {pendingMembers.map(member => (
                    <p key={member.email} className="text-xs text-gray-500">{member.email} - <span className="text-yellow-400">Pending</span></p>
                 ))}
             </div>
        )}
    </div>
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


const RoomView = () => {
    const { roomId } = useParams();
    const { user } = useAuth();
    const [room, setRoom] = useState(null);
    const [membersWithStatus, setMembersWithStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('overview'); 
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);

    // Effect to update the current user's "lastSeen" status
    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        updateDoc(userDocRef, { lastSeen: serverTimestamp() });
        const interval = setInterval(() => {
            updateDoc(userDocRef, { lastSeen: serverTimestamp() });
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [user]);

    // Effect to get the basic room data
    useEffect(() => {
        if (!roomId) return;
        const roomRef = doc(db, "rooms", roomId);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                setRoom({ id: docSnap.id, ...docSnap.data() });
            } else {
                setRoom(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [roomId]);

    // **UPDATED EFFECT**: Listens for real-time status and enforces Owner status
    useEffect(() => {
        if (!room?.members) {
            setMembersWithStatus([]);
            return;
        }

        const initialMembers = room.members.map(m =>
            m.role === 'Owner' ? { ...m, inviteAccepted: true } : m
        );
        setMembersWithStatus(initialMembers);

        const unsubscribers = room.members.map(member => {
            const userDocRef = doc(db, "users", member.uid);
            return onSnapshot(userDocRef, (userDoc) => {
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setMembersWithStatus(prevMembers => 
                        prevMembers.map(prevMember => {
                            if (prevMember.uid === member.uid) {
                                const updatedMember = { ...prevMember, ...userData, name: prevMember.name };
                                if (updatedMember.role === 'Owner') {
                                    updatedMember.inviteAccepted = true;
                                }
                                return updatedMember;
                            }
                            return prevMember;
                        })
                    );
                }
            });
        });

        return () => unsubscribers.forEach(unsub => unsub());

    }, [room?.members]);

    const handleInviteSent = async (newMember) => {
        if (!roomId) return;
        const roomRef = doc(db, "rooms", roomId);
        await updateDoc(roomRef, {
            members: arrayUnion(newMember)
        });
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-lg font-semibold text-gray-300">Loading Project Room...</div>;
    }
    if (!room) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-lg font-semibold text-red-400">Could not find the requested project room.</div>;
    }

    const currentUser = membersWithStatus.find(m => m.role === 'Owner');

    return (
        <div className="h-screen bg-gray-900 text-white font-sans flex flex-col">
             <AnimatePresence>
                {isInviteModalOpen && (
                    <InviteModal 
                        isOpen={isInviteModalOpen}
                        onClose={() => setInviteModalOpen(false)}
                        onInviteSent={handleInviteSent}
                        currentMembers={membersWithStatus}
                    />
                )}
             </AnimatePresence>
             <div className="absolute inset-0 z-0 pointer-events-none">
                 <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
                 <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                 <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
             </div>
             
             <div className="flex flex-1 overflow-hidden relative z-10">
                 <Sidebar room={room} activeView={activeView} setActiveView={setActiveView} />

                 <div className="flex-1 flex flex-col z-10 overflow-hidden">
                     <Header room={room} onEdit={() => alert("Edit project modal would open here.")} />
                     <main className="flex-1 overflow-y-auto p-6">
                         <AnimatePresence mode="wait">
                             <motion.div
                                 key={activeView}
                                 initial={{ opacity: 0, y: 20 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: -20 }}
                                 transition={{ duration: 0.3 }}
                             >
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
                                             <StatCard icon={<User size={24} className="text-indigo-300" />} label="Project Creator" value={currentUser?.name || 'N/A'} />
                                             <StatCard icon={<Box size={24} className="text-indigo-300" />} label="Total Phases" value={room.sdlcPhases.length} />
                                         </div>
                                     </>
                                 )}
                                 {activeView === 'tasks' && <div className="text-center p-10 bg-gray-800/50 rounded-lg">Kanban Board View will be shown here</div>}
                                 {activeView === 'analytics' && <div className="text-center p-10 bg-gray-800/50 rounded-lg">Analytics & Gantt Chart will come here</div>}
                                 {activeView === 'settings' && <div className="text-center p-10 bg-gray-800/50 rounded-lg">Project Settings will be developed here</div>}
                             </motion.div>
                         </AnimatePresence>
                     </main>
                 </div>

                 <CollaborationPanel members={membersWithStatus} onInvite={() => setInviteModalOpen(true)} />
             </div>
        </div>
    );
};

export default RoomView;
