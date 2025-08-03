import { db, auth } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
} from "firebase/firestore";


export const createProject = async (projectData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    const projectRef = await addDoc(collection(db, "projects"), {
      ...projectData,
      createdBy: user.uid,
      createdAt: new Date(),
      ownerId: currentUser.uid,
      members: [user.uid], 
    });

    return projectRef.id;
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};


export const getProjectsForUser = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    const q = query(
      collection(db, "rooms"),
      where("memberIds", "array-contains", user.uid)
    );

    const snapshot = await getDocs(q);

    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return projects;
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return [];
  }
};


export const sendInvitation = async ({ toEmail, projectId, senderInfo, recipientInfo }) => {
  try {
    const invitationRef = await addDoc(collection(db, "invitations"), {
      toEmail,
      projectId,
      senderId: senderInfo.uid,
      senderName: senderInfo.name,
      recipientName: recipientInfo.name,
      recipientRole: recipientInfo.role,
      status: "pending",
      sentAt: new Date(),
    });

    return invitationRef.id;
  } catch (error) {
    console.error("Error sending invitation:", error);
    throw error;
  }
};

export const acceptInvitation = async (invitationId, userId) => {
  try {
    const invitationRef = doc(db, "invitations", invitationId);
    const invitationSnap = await getDoc(invitationRef);
    const invitation = invitationSnap.data();

    const projectRef = doc(db, "projects", invitation.projectId);
    await updateDoc(projectRef, {
      members: [...invitation.members, userId],
    });

    await updateDoc(invitationRef, {
      status: "accepted",
      respondedAt: new Date(),
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    throw error;
  }
};

export const createPhasesForProject = async (projectId, phases) => {
  try {
    const batch = phases.map(async (phase) => {
      await addDoc(collection(db, "phases"), {
        projectId,
        title: phase,
        status: "not-started",
        createdAt: new Date(),
      });
    });

    await Promise.all(batch);
  } catch (error) {
    console.error("Error creating phases:", error);
    throw error;
  }
};
