import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // Adjust the path to your firebase config

/**
 * Logs an activity to the room's activity subcollection in Firestore.
 * Can be a user action (if user object is provided) or a system event (if user is null).
 *
 * @param {string} roomId - The ID of the room.
 * @param {object | null} user - The user object from useAuth() or null for system logs.
 * @param {string} message - The message describing the activity.
 * @param {object} [details={}] - Optional additional details.
 */
export const logActivity = async (roomId, user, message, details = {}) => {
  if (!roomId || !message) {
    console.error("Missing required parameters for logActivity");
    return;
  }

  let logData;

  if (user) {
    // It's a user-driven activity
    logData = {
      type: "user",
      userName: user.name || user.email,
      userId: user.uid,
      userPhotoURL: user.photoURL || null, // <-- (FIX 1) Save the photo URL
    };
  } else {
    // It's a system-driven activity
    logData = {
      type: "system", // <-- (FIX 2) Define it as a system log
      userName: "CodeTrain System",
      userId: "system",
      userPhotoURL: null,
    };
  }

  try {
    const activityColRef = collection(db, "rooms", roomId, "activity");
    await addDoc(activityColRef, {
      ...logData,
      message,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};