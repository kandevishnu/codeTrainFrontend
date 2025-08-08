import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../routes/AuthContext";
import { auth, db } from "../firebase";
import { doc, deleteDoc, updateDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import SidebarLayout from "../components/SidebarLayout";
import { motion } from "framer-motion";
import { Settings, Edit, Check, Shield, AlertTriangle, Github, Linkedin, Globe, Plus, BrainCircuit, BarChart2, X, User as UserIcon, Loader } from "lucide-react";
import { sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, updateProfile  } from "firebase/auth";
import stringSimilarity from 'string-similarity';

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

const SkillTag = ({ skill, onRemove, isEditing }) => {
    const getInitials = (name) => {
        const words = name.split(' ');
        if (words.length > 1) {
            return words[0][0] + words[1][0];
        }
        return name.slice(0, 2).toUpperCase();
    };
    const normalizedSkill = skill.toLowerCase().replace('.', 'dot').replace(' ', '');
    return (
        <div className="flex items-center gap-2 bg-slate-700 rounded-full px-3 py-1 text-sm font-medium">
            <img 
                src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${normalizedSkill}/${normalizedSkill}-original.svg`}
                alt={`${skill} logo`}
                className="w-5 h-5"
                onError={(e) => {
                    e.target.onerror = null; 
                    e.target.outerHTML = `<div class="w-5 h-5 flex items-center justify-center bg-slate-600 text-xs rounded-full font-bold">${getInitials(skill)}</div>`
                }}
            />
            <span>{skill}</span>
            {isEditing && <button onClick={() => onRemove(skill)} className="text-gray-400 hover:text-white"><X size={14}/></button>}
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, onPasswordReset, onDeleteClick }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Settings</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><X/></button></div>
                <div className="mt-6 space-y-8">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"><h2 className="text-xl font-bold text-white flex items-center"><Shield className="mr-3 text-indigo-400"/>Security</h2><div className="mt-4 flex justify-between items-center"><p className="text-gray-400">Reset your password via email.</p><button onClick={onPasswordReset} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold">Send Link</button></div></div>
                    <div className="bg-slate-800/50 border border-red-500/30 rounded-2xl p-6"><h2 className="text-xl font-bold text-red-400 flex items-center"><AlertTriangle className="mr-3"/>Danger Zone</h2><div className="mt-4 flex justify-between items-center"><div><h3 className="font-semibold text-white">Delete this account</h3><p className="text-gray-400 text-sm">Once deleted, there is no going back.</p></div><button onClick={onDeleteClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold">Delete</button></div></div>
                </div>
            </motion.div>
        </div>
    );
};

const DeleteAccountModal = ({ isOpen, onClose, onDeleteConfirm }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!password) { setError('Password is required.'); return; }
        setError('');
        setIsDeleting(true);
        try {
            await onDeleteConfirm(password);
            onClose();
        } catch (err) {
            setError('Incorrect password or error deleting account.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-800 border border-red-500/50 rounded-2xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-red-400 flex items-center"><AlertTriangle className="mr-2"/>Are you sure?</h2>
                <p className="text-gray-400 mt-2">This action is irreversible. To confirm, please enter your password.</p>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full mt-4 bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white">Cancel</button>
                    <button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-500">{isDeleting ? 'Deleting...' : 'Delete My Account'}</button>
                </div>
            </motion.div>
        </div>
    );
};


const Profile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const CLOUDINARY_CLOUD_NAME = "dw3phay5u"; 
    const CLOUDINARY_UPLOAD_PRESET = "ssbxzz7h";
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [isEditingSkills, setIsEditingSkills] = useState(false);
    const [isEditingSocials, setIsEditingSocials] = useState(false);

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [photoURL, setPhotoURL] = useState(user?.photoURL || null);
    const [bio, setBio] = useState('');
    const [skills, setSkills] = useState([]);
    const [newSkill, setNewSkill] = useState('');
    const [socialLinks, setSocialLinks] = useState({ github: '', linkedin: '', portfolio: '' });
    const [stats, setStats] = useState({ roomsJoined: 0, roomsCreated: 0, tasksCompleted: 0 });

    const [isUploading, setIsUploading] = useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const popularSkills = ['React', 'JavaScript', 'Node.js', 'Python', 'Firebase', 'MongoDB', 'HTML5', 'CSS3', 'Tailwind CSS', 'Figma', 'Next.js', 'TypeScript', 'GraphQL', 'Docker'];
    const skillSuggestions = newSkill ? popularSkills.filter(s => !skills.includes(s) && s.toLowerCase().includes(newSkill.toLowerCase())).slice(0, 5) : [];

    useEffect(() => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setDisplayName(data.fullName || user.displayName);
                    setPhotoURL(data.photoURL || user.photoURL);
                    setBio(data.bio || 'No bio yet. Click edit to add one!');
                    setSkills(data.skills || []);
                    setSocialLinks(data.socialLinks || { github: '', linkedin: '', portfolio: '' });
                }
            });

            const fetchStats = async () => {
                const roomsJoinedQuery = query(collection(db, "rooms"), where("memberIds", "array-contains", user.uid));
                const roomsCreatedQuery = query(collection(db, "rooms"), where("ownerId", "==", user.uid));

                const [joinedSnapshot, createdSnapshot] = await Promise.all([
                    getDocs(roomsJoinedQuery),
                    getDocs(roomsCreatedQuery)
                ]);

                const tasksCompleted = 0; 

                setStats({
                    roomsJoined: joinedSnapshot.size,
                    roomsCreated: createdSnapshot.size,
                    tasksCompleted: tasksCompleted
                });
            };
            fetchStats();
        }
    }, [user]);

    const handleSave = async (field, value) => {
    if (!auth.currentUser) return;
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);

    try {
        await updateDoc(userDocRef, { [field]: value });

        if (field === 'fullName') {
            await updateProfile(user, {
                displayName: value
            });
        }

        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated!`);

        window.location.reload();

    } catch (error) {
        toast.error(`Failed to update ${field}.`);
        console.error("Error updating profile:", error);
    }
};
    
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME" || CLOUDINARY_UPLOAD_PRESET === "YOUR_UPLOAD_PRESET") {
            toast.error("Please configure Cloudinary details in the code first.");
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.secure_url) {
                const newPhotoURL = data.secure_url;
                setPhotoURL(newPhotoURL);
                await handleSave('photoURL', newPhotoURL);
                toast.success("Profile picture updated!");
            } else {
                throw new Error("Upload failed, no secure URL returned.");
            }
        } catch (error) {
            toast.error("Failed to upload image.");
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const addSkill = (skillToAdd) => {
        if (!skillToAdd) return;
        const matches = stringSimilarity.findBestMatch(skillToAdd.toLowerCase(), popularSkills.map(s => s.toLowerCase()));
        const bestMatch = matches.bestMatch;
        let finalSkill = skillToAdd;
        if (bestMatch.rating > 0.7) {
            finalSkill = popularSkills[popularSkills.map(s => s.toLowerCase()).indexOf(bestMatch.target)];
        } else {
            finalSkill = skillToAdd.charAt(0).toUpperCase() + skillToAdd.slice(1);
        }
        if (skills.map(s => s.toLowerCase()).includes(finalSkill.toLowerCase())) {
            toast.error(`"${finalSkill}" is already in your tech stack.`);
            return;
        }
        setSkills([...skills, finalSkill]);
        setNewSkill('');
    };
    const handleRemoveSkill = (skillToRemove) => { setSkills(skills.filter(skill => skill !== skillToRemove)); };
    const handlePasswordReset = async () => { if (!user?.email) { toast.error("No email found."); return; } try { await sendPasswordResetEmail(auth, user.email); toast.success("Password reset email sent!"); } catch (error) { toast.error("Failed to send password reset email."); } };
    const handleDeleteAccount = async (password) => { if (!user) throw new Error("No user found"); const credential = EmailAuthProvider.credential(user.email, password); await reauthenticateWithCredential(user, credential); await deleteDoc(doc(db, "users", user.uid)); await user.delete(); toast.success("Account deleted permanently."); navigate("/signup"); };

    return (
        <SidebarLayout>
            <div className="relative h-full w-full">
                <GridBackground />
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div className="relative z-10 h-full overflow-y-auto p-8">
                    <motion.header initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex justify-between items-center">
                        <h1 className="text-5xl font-bold text-white tracking-tight">My Profile</h1>
                        <button onClick={() => setSettingsModalOpen(true)} className="p-3 rounded-full text-gray-300 hover:text-white hover:bg-slate-700/50 transition-colors"><Settings/></button>
                    </motion.header>

                    <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Profile Card & Socials */}
                        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="lg:col-span-1 space-y-8">
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center">
                                <div className="relative group">
                                    {photoURL ? (
                                        <img src={photoURL} alt="Profile" className="w-32 h-32 rounded-full border-4 border-indigo-500 object-cover" />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full border-4 border-indigo-500 bg-slate-700 flex items-center justify-center">
                                            <UserIcon size={64} className="text-slate-500" />
                                        </div>
                                    )}
                                    <button onClick={() => fileInputRef.current.click()} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isUploading ? <Loader className="animate-spin" /> : <Edit size={24} />}
                                    </button>
                                </div>
                                <div className="mt-6 w-full">{isEditingName ? (<div className="flex items-center gap-2"><input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={50} className="w-full bg-slate-700 text-2xl font-bold text-center rounded-lg p-1" /><button onClick={() => { handleSave('fullName', displayName); setIsEditingName(false); }} className="p-2 text-green-400 hover:bg-slate-700 rounded-full"><Check /></button></div>) : (<div className="flex items-center justify-center gap-2"><h2 className="text-3xl font-bold">{displayName}</h2><button onClick={() => setIsEditingName(true)} className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-full"><Edit size={18}/></button></div>)}<p className="text-indigo-400 mt-1">{user?.email}</p></div>
                                <div className="mt-6 text-left w-full border-t border-slate-700 pt-6"><div className="flex justify-between items-center"><h3 className="font-semibold text-gray-300">Bio</h3><button onClick={() => isEditingBio ? (handleSave('bio', bio), setIsEditingBio(false)) : setIsEditingBio(true)} className={`p-2 rounded-full hover:bg-slate-700 ${isEditingBio ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>{isEditingBio ? <Check /> : <Edit size={16} />}</button></div>{isEditingBio ? (<><textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} className="w-full h-24 mt-2 bg-slate-700 rounded-lg p-2 text-sm text-gray-300"></textarea><p className="text-xs text-right text-gray-400">{bio.length}/300</p></>) : (<p className="text-sm text-gray-400 mt-2">{bio}</p>)}</div>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-white">Social Links</h2><button onClick={() => isEditingSocials ? (handleSave('socialLinks', socialLinks), setIsEditingSocials(false)) : setIsEditingSocials(true)} className={`p-2 rounded-full hover:bg-slate-700 ${isEditingSocials ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>{isEditingSocials ? <Check /> : <Edit size={16} />}</button></div><div className="space-y-4">{isEditingSocials ? (Object.keys(socialLinks).map(key => (<div key={key} className="flex items-center gap-2"><span className="w-20 capitalize">{key}:</span><input type="text" value={socialLinks[key]} onChange={e => setSocialLinks({...socialLinks, [key]: e.target.value})} className="w-full bg-slate-700 rounded-lg p-1 text-sm" /></div>))) : (Object.keys(socialLinks).map(key => socialLinks[key] && (<a key={key} href={socialLinks[key]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-300 hover:text-indigo-400"><span className="w-5">{key === 'github' ? <Github/> : key === 'linkedin' ? <Linkedin/> : <Globe/>}</span>{socialLinks[key]}</a>)))}</div></div>
                        </motion.div>

                        {/* Right Column: Skills & Stats */}
                        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="lg:col-span-2 space-y-8">
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-white flex items-center"><BrainCircuit className="mr-2 text-indigo-400"/>Tech Stack</h2><button onClick={() => { if(isEditingSkills) handleSave('skills', skills); setIsEditingSkills(!isEditingSkills); }} className={`p-2 rounded-full hover:bg-slate-700 ${isEditingSkills ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>{isEditingSkills ? <Check /> : <Edit size={16} />}</button></div><div className="flex flex-wrap gap-2">{skills.map(skill => (<SkillTag key={skill} skill={skill} onRemove={handleRemoveSkill} isEditing={isEditingSkills} />))}{isEditingSkills && (<div className="relative w-full mt-4"><div className="flex gap-2"><input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Add new skill" className="flex-1 bg-slate-700 rounded-full px-3 py-1 text-sm" /><button onClick={() => addSkill(newSkill)} className="bg-indigo-600 rounded-full p-2"><Plus size={16}/></button></div>{newSkill && skillSuggestions.length > 0 && (<div className="absolute top-full left-0 w-full bg-slate-600 rounded-lg mt-1 p-2 space-y-1 z-10">{skillSuggestions.map(s => (<button key={s} onClick={() => addSkill(s)} className="w-full text-left p-1 hover:bg-slate-500 rounded">{s}</button>))}</div>)}</div>)}</div>{isEditingSkills && (<div className="mt-4 border-t border-slate-700 pt-4"><h4 className="text-sm font-semibold text-gray-400 mb-2">Suggestions</h4><div className="flex flex-wrap gap-2">{popularSkills.filter(s => !skills.includes(s)).map(skill => (<button key={skill} onClick={() => addSkill(skill)} className="flex items-center gap-2 bg-slate-600/50 hover:bg-slate-600 rounded-full px-3 py-1 text-sm"><Plus size={14}/>{skill}</button>))}</div></div>)}</div>
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8"><h2 className="text-xl font-bold text-white mb-4 flex items-center"><BarChart2 className="mr-2 text-indigo-400"/>User Statistics</h2><div className="grid grid-cols-3 gap-4 text-center"><div><p className="text-3xl font-bold">{stats.roomsJoined}</p><p className="text-sm text-gray-400">Rooms Joined</p></div><div><p className="text-3xl font-bold">{stats.roomsCreated}</p><p className="text-sm text-gray-400">Rooms Created</p></div><div><p className="text-3xl font-bold">{stats.tasksCompleted}</p><p className="text-sm text-gray-400">Tasks Completed</p></div></div></div>
                        </motion.div>
                    </div>
                </div>
                <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} onPasswordReset={handlePasswordReset} onDeleteClick={() => {setSettingsModalOpen(false); setDeleteModalOpen(true);}} />
                <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} onDeleteConfirm={handleDeleteAccount} />
            </div>
        </SidebarLayout>
    );
};

export default Profile;
