import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; 
import TrainModel from "../components/TrainModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Users,
  User,
  Box,
  ClipboardList,
  ChevronRight,
} from "lucide-react";

const StatCard = ({ icon, label, value, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white/10 backdrop-blur-md p-4 rounded-lg flex items-center space-x-4"
  >
    <div className="bg-indigo-500/20 p-3 rounded-lg">{icon}</div>
    <div>
      <p className="text-sm text-indigo-200 font-medium">{label}</p>
      <p className="text-lg text-white font-semibold">{value}</p>
    </div>
  </motion.div>
);

const RoomView = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomId) {
          setLoading(false);
          return;
      }
      try {
        const docRef = doc(db, "rooms", roomId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRoom(docSnap.data());
        } else {
          console.error("Room not found");
        }
      } catch (error) {
        console.error("Error fetching room:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-lg font-semibold text-gray-300">
        Loading Project Room...
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-lg font-semibold text-red-400">
        Could not find the requested project room.
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans overflow-x-hidden">
      <div className="relative min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8">
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex-grow"
        >
          <motion.header variants={itemVariants} className="mb-8">
            <div className="flex items-center space-x-3 text-gray-400 text-sm">
                <span>Projects</span>
                <ChevronRight size={16} />
                <span className="text-white font-medium">{room.projectName}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mt-2 tracking-tight">
              {room.projectName}
            </h1>
          </motion.header>

          <motion.div variants={itemVariants} className="mb-8 shadow-2xl shadow-indigo-900/50 rounded-xl overflow-hidden border border-white/10">
            <TrainModel phases={room.sdlcPhases || []} />
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Clock size={24} className="text-indigo-300" />}
              label="Deadline"
              value={room.deadline || "Not set"}
              delay={0.3}
            />
            <StatCard
              icon={<Users size={24} className="text-indigo-300" />}
              label="Members"
              value={room.members?.length > 0 ? room.members.length : 1}
              delay={0.4}
            />
            <StatCard
              icon={<User size={24} className="text-indigo-300" />}
              label="Project Owner"
              value={room.owner || "N/A"}
              delay={0.5}
            />
             <StatCard
              icon={<Box size={24} className="text-indigo-300" />}
              label="Total Phases"
              value={room.sdlcPhases?.length || 0}
              delay={0.6}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <ClipboardList size={28} className="mr-3 text-indigo-400" />
              Project Phases
            </h2>
            <div className="flex flex-wrap gap-3">
              {room.sdlcPhases?.length > 0 ? (
                room.sdlcPhases.map((phase, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                    className="bg-gray-700/50 text-indigo-200 text-sm font-medium px-4 py-2 rounded-full border border-indigo-500/30"
                  >
                    {phase}
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-400">No SDLC phases defined for this project.</p>
              )}
            </div>
          </motion.div>
        </motion.main>

        <footer className="text-center text-gray-500 text-xs mt-8 relative z-10">
            <p>Project Train Visualization | {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
};

export default RoomView;
