import React, { useState } from "react";
import PhaseSelector from "./PhaseSelector";
import InviteUser from "./InviteUser";
import RoomFormFooter from "./RoomFormFooter";
import { db } from "../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../../routes/AuthContext";

const CreateRoomModal = ({ onClose }) => {
  const { user } = useAuth();
  const [phases, setPhases] = useState([]);
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleCreateRoom = async () => {
    if (!projectName || !deadline || phases.length === 0) {
      toast.error("All fields and at least one SDLC phase are required.");
      return;
    }

    if (!user || !user.uid) {
      toast.error("User not authenticated.");
      return;
    }

    try {
      const roomId = uuidv4();
      const roomRef = doc(db, "rooms", roomId);

      await setDoc(roomRef, {
        id: roomId,
        projectName,
        deadline,
        owner: user.uid,
        sdlcPhases: phases,
        members: [
          {
            uid: user.uid,
            email: user.email,
            name: user.displayName || "Owner",
            role: "Owner",
          },
          ...invitedUsers.map((u) => ({
            uid: u.uid,
            email: u.email,
            name: u.name || "",
            role: "Member",
          })),
        ],
        memberIds: [user.uid, ...invitedUsers.map((u) => u.uid)],
        createdAt: serverTimestamp(),
      });

      toast.success("Room created successfully!");
      handleReset();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create room.");
    }
  };

  const handleReset = () => {
    setPhases([]);
    setInvitedUsers([]);
    setProjectName("");
    setDeadline("");
    onClose();
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-xl w-full">
      <h2 className="text-2xl font-semibold mb-4">Create Project Room</h2>

      <input
        type="text"
        placeholder="Project Name"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-white"
      />
      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="w-full mb-6 p-2 border rounded dark:bg-gray-700 dark:text-white"
      />

      <PhaseSelector phases={phases} setPhases={setPhases} />
      <InviteUser
        invitedUsers={invitedUsers}
        setInvitedUsers={setInvitedUsers}
      />
      <RoomFormFooter onCreate={handleCreateRoom} onCancel={handleReset} />
    </div>
  );
};

export default CreateRoomModal;
