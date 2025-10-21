import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../firebase"; // Adjust path as needed
import { Clock, User, CheckCircle } from "lucide-react";

// Helper to format the Firestore timestamp
const formatDate = (timestamp) => {
  if (!timestamp) return "Just now";
  const date = new Date(timestamp.seconds * 1000);
  // More user-friendly format
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ActivityFeed = () => {
  const { roomId } = useParams();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const activityColRef = collection(db, "rooms", roomId, "activity");
    const q = query(activityColRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(fetchedActivities);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching activities:", error);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [roomId]);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading activity...</p>;
  }

  if (activities.length === 0) {
    return <p className="text-sm text-gray-400">No recent activity found.</p>;
  }

  return (
    <div className="space-y-6">
      {activities.map(activity => (
        <div key={activity.id} className="flex items-start space-x-3">
          
          {/* --- (NEW) Dynamic Icon/Profile Picture --- */}
          <div className="flex-shrink-0">
            {activity.type === 'system' ? (
              // System Icon
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <CheckCircle size={16} className="text-white" />
              </div>
            ) : activity.userPhotoURL ? (
              // User Profile Picture
              <img 
                className="h-8 w-8 rounded-full" 
                src={activity.userPhotoURL} 
                alt={activity.userName} 
              />
            ) : (
              // Fallback User Icon
              <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                <User size={16} className="text-indigo-400" />
              </div>
            )}
          </div>
          {/* --- End of new logic --- */}

          <div className="flex-1">
            <p className="text-sm text-slate-200">
              <span className="font-semibold">{activity.userName}</span> {activity.message}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <Clock size={12} className="mr-1.5" />
              {formatDate(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;