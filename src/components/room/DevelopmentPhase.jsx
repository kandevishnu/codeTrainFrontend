import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import { logActivity } from "../../utils/activityLogger";
import { useParams, Link } from "react-router-dom";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../routes/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code,
  ArrowRight,
  Loader,
  ArrowLeft,
  ListTodo,
  PanelRightClose,
  PanelRightOpen,
  AlertTriangle,
  Save,
  Maximize,
  Minimize,
  Bug, // Added for bug icon
} from "lucide-react";

// --- Custom Hook to load StackBlitz SDK (No Changes) ---
const useStackBlitzSDK = (url = "https://unpkg.com/@stackblitz/sdk") => {
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    if (window.StackBlitzSDK) {
      setIsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error(`Error loading script: ${url}`);
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [url]);
  return isLoaded;
};

// --- IDE Component (No Changes) ---
const CodeTrainIDE = forwardRef(({ roomId }, ref) => {
  const ideRef = useRef(null);
  const [vm, setVm] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const sdkLoaded = useStackBlitzSDK();
  const implementationDocRef = useCallback(
    () => doc(db, "rooms", roomId, "phases", "implementation"),
    [roomId]
  );

  useEffect(() => {
    if (!sdkLoaded || !window.StackBlitzSDK || !ideRef.current) return;
    let cancelled = false;

    const embedIDE = async () => {
      try {
        const docSnap = await getDoc(implementationDocRef());
        let projectFiles;
        if (docSnap.exists() && docSnap.data().projectFiles) {
          projectFiles = docSnap.data().projectFiles;
        } else {
          projectFiles = {
            "README.md": `# Welcome to your Fullstack Development Environment! ...`,
            "package.json": `{ "name": "codetrain-fullstack-ide", ... }`,
          };
        }
        if (cancelled) return;
        const embeddedVm = await window.StackBlitzSDK.embedProject(
          ideRef.current,
          {
            title: "CodeTrain Fullstack Environment",
            description: "A Node.js environment to build your fullstack project.",
            template: "node",
            files: projectFiles,
          },
          { height: "100%", theme: "dark", openFile: "README.md" }
        );
        setVm(embeddedVm);
      } catch (err) {
        console.error("Error embedding IDE:", err);
        setError("Failed to embed the StackBlitz IDE. Please refresh.");
      }
    };
    embedIDE();
    return () => {
      cancelled = true;
      if (vm && vm.destroy) vm.destroy();
    };
  }, [sdkLoaded, roomId, implementationDocRef]);

  const handleSaveProject = async () => {
    if (!vm) {
      setError("IDE is not ready to save.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const files = await vm.getFsSnapshot();
      await setDoc(
        implementationDocRef(),
        { projectFiles: files, lastSaved: serverTimestamp() },
        { merge: true }
      );
      alert("✅ Project saved successfully!");
    } catch (err) {
      console.error("Error saving project:", err);
      setError("Failed to save project files.");
    } finally {
      setIsSaving(false);
    }
  };
  
  useImperativeHandle(ref, () => ({
    saveProject() {
      handleSaveProject();
    },
  }));

  return (
    <div className="flex-grow w-full h-full min-h-[70vh] bg-slate-900 rounded-b-xl overflow-hidden relative">
      {!sdkLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
          <Loader className="animate-spin mb-2" size={22} />
          Preparing Environment...
        </div>
      )}
      <div ref={ideRef} className="w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 bg-slate-900/80">
          <AlertTriangle className="mb-2" size={22} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {isSaving && (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 bg-slate-900/80">
          <Loader className="animate-spin mb-2" size={22} />
          Saving Project...
        </div>
      )}
    </div>
  );
});

// --- (NEW) Bug Item Component ---
const BugItem = ({ bug, onBugStatusChange }) => {
  const getStatusInfo = (status) => {
    switch (status) {
      case "open":
        return {
          label: "Open",
          color: "border-red-500 text-red-300",
          action: { label: "Start Work", nextStatus: "in-progress" },
        };
      case "in-progress":
        return {
          label: "In Progress",
          color: "border-yellow-500 text-yellow-300",
          action: { label: "Mark as Fixed", nextStatus: "closed" },
        };
      default:
        return { label: status, color: "border-slate-600" };
    }
  };

  const statusInfo = getStatusInfo(bug.status);

  return (
    <div className={`p-3 bg-slate-700/50 rounded-lg border-l-4 ${statusInfo.color}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bug size={16} className="text-red-400" />
            <p className="font-semibold text-sm text-slate-200">{bug.title}</p>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-1">{bug.description}</p>
          <p className="text-xs mt-2 pl-1">
            Status:{" "}
            <span className={`font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </p>
        </div>
        {statusInfo.action && (
          <button
            onClick={() => onBugStatusChange(bug.id, statusInfo.action.nextStatus)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-md transition"
          >
            {statusInfo.action.label}
          </button>
        )}
      </div>
    </div>
  );
};

// --- Task Item Component (No Changes) ---
const TaskItem = ({ task, user, isTeamLead, onStatusChange }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case "To Do": return "border-slate-500 text-slate-300";
            case "In Progress": return "border-blue-500 text-blue-300";
            case "For Review": return "border-yellow-500 text-yellow-300";
            case "Done": return "border-green-500 text-green-300";
            default: return "border-slate-600 text-slate-300";
        }
    };

    let nextAction = null;
    if (task.status === "To Do" && task.assigneeId === user.uid)
        nextAction = { label: "Accept Task", nextStatus: "In Progress" };
    else if (task.status === "In Progress" && task.assigneeId === user.uid)
        nextAction = { label: "Mark as For Review", nextStatus: "For Review" };
    else if (task.status === "For Review" && isTeamLead)
        nextAction = { label: "Mark as Done", nextStatus: "Done" };

    return (
        <div className={`p-3 bg-slate-700/50 rounded-lg border-l-4 ${getStatusColor(task.status)}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-sm text-slate-200">{task.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                    <p className="text-xs mt-1">
                        Status:{" "}
                        <span className={`font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                    </p>
                </div>
                {nextAction && (
                    <button
                        onClick={() => onStatusChange(task.id, nextAction.nextStatus)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-md transition"
                    >
                        {nextAction.label}
                    </button>
                )}
            </div>
        </div>
    );
};

// --- Main Component ---
const ImplementationPhase = () => {
  const { roomId } = useParams();
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]); // (NEW) State for bugs
  const [roomData, setRoomData] = useState(null);
  const [isTasksVisible, setIsTasksVisible] = useState(true);
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const ideContainerRef = useRef(null);
  const ideComponentRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, "rooms", roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) setRoomData(docSnap.data());
      else {
        setError("Room data could not be found.");
        setRoomData(null);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  const isLeadOrAdmin =
    user &&
    roomData &&
    (roomData.ownerId === user.uid || roomData.adminIds?.includes(user.uid));

  useEffect(() => {
    if (!user || !roomData) {
      setTasks([]);
      return;
    }
    const tasksColRef = collection(db, "rooms", roomId, "tasks");
    let q;
    if (isLeadOrAdmin) q = query(tasksColRef);
    else q = query(tasksColRef, where("assigneeId", "==", user.uid));

    const unsubscribeTasks = onSnapshot(q, (querySnapshot) => {
        setTasks(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
        console.error("Error fetching tasks:", err);
        setError("Could not fetch assigned tasks.");
    });
    return () => unsubscribeTasks();
  }, [roomId, user, roomData, isLeadOrAdmin]);
  
  // (NEW) Fetch assigned bugs that are not closed
  useEffect(() => {
    if (!user) return;
    const issuesColRef = collection(db, "rooms", roomId, "issues");
    const issuesQuery = query(
      issuesColRef,
      where("assigneeId", "==", user.uid),
      where("status", "!=", "closed")
    );
    const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
        console.error("Error fetching issues:", err);
        // Silently fail or set an error state if needed
    });
    return () => unsubscribeIssues();
  }, [roomId, user]);

  // (NEW) Combine tasks and issues into a single sorted list
  const workItems = useMemo(() => {
    const allTasks = tasks.map(task => ({ ...task, type: 'task' }));
    const allIssues = issues.map(issue => ({ ...issue, type: 'issue' }));
    return [...allTasks, ...allIssues].sort((a, b) => 
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
    );
  }, [tasks, issues]);

  const handleStatusChange = async (taskId, newStatus) => {
    // ... This function is unchanged ...
    try {
      const taskRef = doc(db, "rooms", roomId, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });
      const task = tasks.find(t => t.id === taskId);
      const currentUserMemberData = roomData?.members.find(m => m.uid === user.uid);
      if (task && currentUserMemberData) {
        let message = "";
        switch (newStatus) {
          case "In Progress": message = `accepted the task "${task.title}"`; break;
          case "For Review": message = `marked the task "${task.title}" for review`; break;
          case "Done": message = `approved and completed the task "${task.title}"`; break;
          default: message = `updated the task "${task.title}" to ${newStatus}`;
        }
        logActivity(roomId, currentUserMemberData, message);
      }
    } catch (err) {
      console.error("Error updating task:", err);
      setError("Failed to update task status.");
    }
  };
  
  // (NEW) Handler to update bug status
  const handleBugStatusChange = async (issueId, newStatus) => {
    try {
      const issueRef = doc(db, "rooms", roomId, "issues", issueId);
      await updateDoc(issueRef, { status: newStatus });
      const issue = issues.find(i => i.id === issueId);
      if (issue && user && roomData) {
        const currentUserMemberData = roomData.members.find(m => m.uid === user.uid);
        let message = '';
        if (newStatus === 'in-progress') message = `started working on the bug: "${issue.title}"`;
        if (newStatus === 'closed') message = `fixed the bug: "${issue.title}"`;
        if (message) logActivity(roomId, currentUserMemberData, message);
      }
    } catch (err) {
      console.error("Error updating bug status:", err);
      setError("Failed to update bug status.");
    }
  };

  useEffect(() => {
    // ... Fullscreen handler unchanged ...
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleFullscreen = () => {
    // ... Fullscreen logic unchanged ...
    if (!ideContainerRef.current) return;
    if (!document.fullscreenElement) {
      ideContainerRef.current.requestFullscreen().catch((err) => {
        alert(`Could not enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* ... Navigation and Header unchanged ... */}
        <div className="flex items-center justify-between mb-6">
          <Link to={`/room/${roomId}/design`} className="flex items-center text-sm text-indigo-400 hover:text-indigo-300">
            <ArrowLeft size={16} className="mr-1" /> Back to Design
          </Link>
          <Link to={`/room/${roomId}/testing`} className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">
            Next: Testing Phase <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
        <div className="text-center mb-10">
          <Code className="mx-auto h-12 w-12 text-indigo-400" />
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Implementation</h1>
          <p className="mt-2 text-lg text-slate-400">Live development environment and role-based task tracking.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 min-h-[75vh]">
          <div ref={ideContainerRef} className="flex-grow bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col">
            {/* ... IDE Header unchanged ... */}
            <div className="flex-shrink-0 p-3 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold ml-2">CodeTrain IDE</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => ideComponentRef.current?.saveProject()} className="p-2 hover:bg-slate-700 rounded-md" title="Save Project"><Save size={18} /></button>
                <button onClick={handleFullscreen} className="p-2 hover:bg-slate-700 rounded-md" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
                <button onClick={() => setIsTasksVisible(!isTasksVisible)} className="p-2 hover:bg-slate-700 rounded-md" title={isTasksVisible ? "Hide Tasks" : "Show Tasks"}>{isTasksVisible ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}</button>
              </div>
            </div>
            <CodeTrainIDE roomId={roomId} ref={ideComponentRef} />
          </div>

          <AnimatePresence>
            {isTasksVisible && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="flex-shrink-0 w-full lg:w-80">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 h-full flex flex-col">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <ListTodo size={18} className="mr-2 text-indigo-400" />
                    {isLeadOrAdmin ? "All Project Work" : "My Work"}
                  </h2>
                  
                  {/* --- (MODIFIED) Render logic now handles both tasks and bugs --- */}
                  <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {workItems.length > 0 ? (
                      workItems.map((item) => {
                        if (item.type === 'issue') {
                          return (
                            <BugItem
                              key={item.id}
                              bug={item}
                              onBugStatusChange={handleBugStatusChange}
                            />
                          );
                        } else {
                          return (
                            <TaskItem
                              key={item.id}
                              task={item}
                              user={user}
                              isTeamLead={isLeadOrAdmin}
                              onStatusChange={handleStatusChange}
                            />
                          );
                        }
                      })
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-sm text-slate-400">
                          No assigned tasks or bugs.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {error && <p className="text-center text-red-400 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default ImplementationPhase;