import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Given a room object, returns members array
 * with latest name/email from `users` collection.
 */
export async function getMembersWithStatus(room) {
  if (!room?.memberIds?.length) return [];

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("uid", "in", room.memberIds));
  const snapshot = await getDocs(q);

  const latestUsers = snapshot.docs.map(doc => doc.data());

  return room.members.map(member => {
    const latestUser = latestUsers.find(u => u.uid === member.uid);
    return {
      ...member,
      name: latestUser?.name || member.name,
      email: latestUser?.email || member.email,
    };
  });
}
