import React, { useState, useEffect, Fragment } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { Dialog, Transition } from "@headlessui/react";
import { db } from "../firebase";
import { useAuth } from "../routes/AuthContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Plus, Search, X, Briefcase, ArrowRight, Layers, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

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
                    backgroundImage: 'linear-gradient(to right, #4f4f4f2e 1px, transparent 1px), linear-gradient(to bottom, #4f4f4f2e 1px, transparent 1px)',
                    backgroundSize: '36px 36px',
                    animation: 'pan-background 75s linear infinite'
                }}
            ></div>
        </div>
    </>
);


const ProjectCard = ({ room, onClick }) => (
    <motion.div
        variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
        }}
        whileHover={{
            y: -8,
            boxShadow: "0px 20px 30px -10px rgba(129, 140, 248, 0.25)",
            borderColor: "rgba(129, 140, 248, 0.8)",
            transition: { duration: 0.2, ease: "easeInOut" }
        }}
        onClick={onClick}
        className="group cursor-pointer rounded-2xl bg-slate-800/50 border border-slate-700 p-6 shadow-lg flex flex-col justify-between"
    >
        <div className="p-6">
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {room.projectName}
                </h3>
                <span
                    className={`text-xs font-bold px-3 py-1 rounded-full mt-1 inline-block border ${
                        room.status === "In Progress"
                            ? "border-blue-400/50 bg-blue-500/10 text-blue-300"
                            : room.status === "Completed"
                            ? "border-green-400/50 bg-green-500/10 text-green-300"
                            : "border-yellow-400/50 bg-yellow-500/10 text-yellow-300"
                    }`}
                >
                    {room.status || "Planned"}
                </span>
            </div>

            <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center text-gray-400">
                    <Calendar size={14} className="mr-2.5 text-indigo-400" />
                    <span>Deadline: {new Date(room.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-gray-400">
                    <Layers size={14} className="mr-2.5 text-indigo-400" />
                    <span>Phases: {room.sdlcPhases?.length || 0}</span>
                </div>
            </div>
            <div className="mt-6">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-400">Progress</span>
                    <span className="text-sm font-bold text-white">
                        {room.progress || 0}%
                    </span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-2.5 border border-white/10">
                    <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full"
                        style={{ width: `${room.progress || 0}%` }}
                    ></div>
                </div>
            </div>
        </div>

        <div className="bg-black/30 px-6 py-4 flex items-center justify-between border-t border-white/10">
            <div className="flex items-center -space-x-3">
                {room.members?.slice(0, 4).map((member) => (
                    <img
                        key={member.uid || member.email}
                        src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${member.name}`}
                        alt={member.name}
                        className="w-10 h-10 rounded-full border-2 border-slate-700"
                        title={member.name}
                    />
                ))}
                {room.members?.length > 4 && (
                    <div className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-xs font-semibold">
                        +{room.members.length - 4}
                    </div>
                )}
            </div>
            <div className="flex items-center text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                Enter Workspace
                <ArrowRight
                    size={16}
                    className="ml-2 transform group-hover:translate-x-1 transition-transform"
                />
            </div>
        </div>
    </motion.div>
);


const InviteMembersModal = ({ isOpen, onClose, onAddMember, currentMembers = [], currentUser }) => {
    const [email, setEmail] = useState("");
    const [searchResult, setSearchResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [role, setRole] = useState("Analyst");

    const handleSearch = async () => {
        if (!email) return;
        setError("");
        if (currentUser && email === currentUser.email) { setError("You cannot invite yourself. You are the project owner."); return; }
        if (currentMembers.some(m => m.email === email)) { setError("This user has already been added."); return; }
        setIsLoading(true);
        setSearchResult(null);
        try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setSearchResult({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
            } else {
                setError("User not found.");
            }
        } catch (err) { console.error(err); setError("Failed to search."); }
        setIsLoading(false);
    };

    const handleAddClick = () => {
        if (!searchResult) return;
        onAddMember({ uid: searchResult.id, email: searchResult.email, name: searchResult.fullName, role: role, inviteAccepted: false });
        setSearchResult(null); setEmail(""); setError(""); setRole("Analyst");
    };

    if (!isOpen) return null;

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/60" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center"><Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"><Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-800 p-6 text-left align-middle shadow-xl transition-all text-white border border-white/10"><Dialog.Title as="h3" className="text-lg font-medium leading-6 text-indigo-300">Invite New Members</Dialog.Title><div className="mt-4"><div className="flex space-x-2"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter user's email" className="flex-1 bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /><button onClick={handleSearch} disabled={isLoading} className="bg-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:bg-gray-500">{isLoading ? "..." : <Search size={18}/>}</button></div>{error && <p className="text-red-400 text-sm mt-2">{error}</p>}{searchResult && (<div className="mt-4 p-4 bg-slate-700/50 rounded-lg"><p className="font-bold text-lg">{searchResult.fullName}</p><p className="text-sm text-gray-400">{searchResult.email}</p><select value={role} onChange={(e) => setRole(e.target.value)} className="mt-2 w-full bg-slate-600 rounded p-2 text-sm border border-white/10"><option>Analyst</option><option>Coder</option><option>Designer</option><option>Tester</option></select><button onClick={handleAddClick} className="w-full mt-4 bg-green-600 py-2 rounded-lg text-sm font-semibold hover:bg-green-500">Add to Invite List</button></div>)}</div><div className="mt-6 flex justify-end"><button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" onClick={onClose}>Done</button></div></Dialog.Panel></Transition.Child></div></div>
            </Dialog>
        </Transition>
    );
};

const CreateRoomModal = ({ isOpen, onClose, onRoomCreated, user }) => {
    const [projectName, setProjectName] = useState("");
    const [deadline, setDeadline] = useState("");
    const [sdlcPhases, setSdlcPhases] = useState([]);
    const [members, setMembers] = useState([]);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

    const allPhases = ["Planning", "Analysis", "Design", "Implementation", "Testing", "Deployment", "Maintenance"];

    const handlePhaseToggle = (phase) => { setSdlcPhases(prev => prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]); };
    const handleAddMember = (newMember) => { setMembers(prev => [...prev, newMember]); };

    const handleCreateRoom = async () => {
        setError("");
        if (!projectName || !deadline || sdlcPhases.length === 0) { setError("Please fill all fields and select at least one phase."); return; }
        setIsCreating(true);
        const combinedMembers = [ ...members, { uid: user.uid, email: user.email, name: user.displayName, role: "Owner", inviteAccepted: true }];
        const uniqueMembersMap = new Map();
        combinedMembers.forEach(member => { uniqueMembersMap.set(member.uid, member); });
        const finalMembers = Array.from(uniqueMembersMap.values());
        const memberIds = finalMembers.map(m => m.uid);

        try {
            const docRef = await addDoc(collection(db, "rooms"), { projectName, deadline, sdlcPhases, members: finalMembers, memberIds, status: "In Progress", progress: 0, createdAt: serverTimestamp(), ownerId: user.uid });
            onRoomCreated(docRef.id);
        } catch (err) {
            console.error("Error creating room:", err);
            setError("Failed to create room. Please check permissions and console for details.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/60 backdrop-blur-sm" /></Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4"><Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"><Dialog.Panel className="w-full max-w-2xl transform rounded-2xl bg-slate-800 p-8 shadow-2xl transition-all text-white border border-white/10"><Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-indigo-300 mb-6">Create a New Project Workspace</Dialog.Title><div className="space-y-4"><div><label className="text-sm font-medium text-gray-300">Project Name</label><input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className="w-full mt-1 bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div><div><label className="text-sm font-medium text-gray-300">Deadline</label><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full mt-1 bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div><div><label className="text-sm font-medium text-gray-300">SDLC Phases</label><div className="flex flex-wrap gap-2 mt-2">{allPhases.map(phase => (<button key={phase} onClick={() => handlePhaseToggle(phase)} className={`px-3 py-1 text-sm rounded-full transition-colors border ${sdlcPhases.includes(phase) ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>{phase}</button>))}</div></div><div><label className="text-sm font-medium text-gray-300">Invited Members ({members.length})</label><div className="mt-2 p-3 bg-slate-900/50 rounded-lg min-h-[60px] flex items-center flex-wrap gap-2">{members.length === 0 && <p className="text-sm text-gray-500">No members invited yet.</p>}{members.map(m => (<div key={m.uid} className="bg-indigo-500/20 text-indigo-200 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-2"><span>{m.name} ({m.role})</span><button onClick={() => setMembers(p => p.filter(pm => pm.uid !== m.uid))} className="hover:text-white"><X size={12}/></button></div>))}<button onClick={() => setInviteModalOpen(true)} className="mt-2 text-sm text-indigo-400 hover:underline"> + Invite Members</button></div></div></div><div className="mt-8 flex items-center justify-end gap-4">{error && <p className="text-sm text-red-400 mr-auto">{error}</p>}<button type="button" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white" onClick={onClose}>Cancel</button><button type="button" onClick={handleCreateRoom} disabled={isCreating} className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition disabled:bg-gray-500">{isCreating ? "Creating..." : "Create Project"}</button></div></Dialog.Panel></Transition.Child></div></div>
                </Dialog>
            </Transition>
            <InviteMembersModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} onAddMember={handleAddMember} currentMembers={members} currentUser={user} />
        </>
    );
};

const Home = () => {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRooms = async () => {
            if (!user?.uid) return;
            setLoading(true);
            try {
                const q = query(collection(db, "rooms"), where("memberIds", "array-contains", user.uid));
                const snapshot = await getDocs(q);
                const roomData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setRooms(roomData);
            } catch (err) {
                console.error("Error fetching rooms:", err);
            } finally {
                setLoading(false);
            }
        };
        if (user) { fetchRooms(); }
    }, [user]);

    const handleRoomCreated = (newRoomId) => {
        setShowModal(false);
        setTimeout(() => { navigate(`/room/${newRoomId}`); }, 400);
    };
    
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            }
        }
    };

    return (
        <SidebarLayout>
            <div className="h-full w-full">
                <GridBackground />
                <div className="relative h-full overflow-y-auto p-8">
                    <motion.header 
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                        className="mb-12"
                    >
                        <h1 className="text-5xl font-bold text-white tracking-tight">My Workspaces</h1>
                        <p className="text-gray-400 mt-3 text-lg">Access and manage all your SDLC project rooms.</p>
                    </motion.header>

                    {loading ? (
                        <p className="text-gray-300">Loading workspaces...</p>
                    ) : rooms.length === 0 ? (
                         <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-24 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50"
                        >
                            <Briefcase size={52} className="mx-auto text-slate-500" />
                            <h2 className="mt-6 text-2xl font-semibold text-white">No Workspaces Found</h2>
                            <p className="text-gray-400 mt-2">Create a new project workspace to get started.</p>
                        </motion.div>
                    ) : (
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-24"
                        >
                            {rooms.map((room) => (
                                <ProjectCard key={room.id} room={room} onClick={() => navigate(`/room/${room.id}`)} />
                            ))}
                        </motion.div>
                    )}
                </div>

                <motion.button
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ scale: 1.15, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowModal(true)}
                    className="fixed bottom-8 right-8 z-50 bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-5 rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
                    aria-label="Create new project"
                >
                    <Plus size={32} />
                </motion.button>

                <CreateRoomModal isOpen={showModal} onClose={() => setShowModal(false)} onRoomCreated={handleRoomCreated} user={user} />
            </div>
        </SidebarLayout>
    );
};

export default Home;
