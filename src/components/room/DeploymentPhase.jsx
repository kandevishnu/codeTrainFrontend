import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore"; // Added getDoc
import { db } from "../../firebase";
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  ExternalLink,
  Edit,
  Save,
  Loader,
  X, // Added for cancel button
} from "lucide-react";

// --- Main Deployment Phase Component ---
const DeploymentPhase = () => {
  const { roomId } = useParams();

  const [deploymentInfo, setDeploymentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const deploymentConfigRef = doc(db, "rooms", roomId, "configs", "deployment");

  // Fetch existing deployment info
  useEffect(() => {
    setIsLoading(true); // Start loading when effect runs
    const unsubscribe = onSnapshot(deploymentConfigRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().liveUrl) { // Check if liveUrl exists
        const data = docSnap.data();
        setDeploymentInfo(data);
        setEditUrl(data.liveUrl || "");
        setEditPlatform(data.platform || "");
        setEditDate(data.deployedAt || "");
        setIsEditing(false); // Show display mode if URL exists
      } else {
        // No document or no URL saved yet
        setDeploymentInfo(null);
        setEditUrl(""); // Clear fields for initial entry
        setEditPlatform("");
        setEditDate("");
        setIsEditing(true); // Start in edit mode for first entry
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching deployment config:", err);
      setError("Could not load deployment information. Check permissions.");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [roomId]); // Only depends on roomId

  // Handler to save the entered info
  const handleSaveDeploymentInfo = async () => {
    if (!editUrl.trim()) {
      alert("Please enter the live URL.");
      return;
    }
    if (!editUrl.startsWith("http://") && !editUrl.startsWith("https://")) {
        alert("Please enter a valid URL starting with http:// or https://");
        return;
    }

    setIsSaving(true);
    setError("");
    try {
      await setDoc(deploymentConfigRef, {
        liveUrl: editUrl,
        platform: editPlatform,
        deployedAt: editDate,
      }, { merge: true }); // Use merge to avoid overwriting unrelated fields if any
      // No need to manually setDeploymentInfo, onSnapshot will update it
      setIsEditing(false); // Exit edit mode
    } catch (err) {
      console.error("Error saving deployment info:", err);
      setError("Failed to save deployment information.");
    } finally {
      setIsSaving(false);
    }
  };

  // Switch to edit mode, populating fields with current data
  const handleEdit = () => {
      setEditUrl(deploymentInfo?.liveUrl || "");
      setEditPlatform(deploymentInfo?.platform || "");
      setEditDate(deploymentInfo?.deployedAt || "");
      setIsEditing(true);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
      // If there was previously saved info, go back to display mode
      if (deploymentInfo?.liveUrl) {
          setIsEditing(false);
      } else {
          // If they are cancelling the *initial* entry, just clear fields
          // but stay in edit mode so they don't see an empty screen.
          setEditUrl("");
          setEditPlatform("");
          setEditDate("");
      }
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to={`/room/${roomId}/testing`} className="flex items-center text-sm text-indigo-400 hover:text-indigo-300">
            <ArrowLeft size={16} className="mr-1" /> Back to Testing
          </Link>
          <Link to={`/room/${roomId}/maintenance`} className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">
            Next: Maintenance Phase <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
        <div className="text-center mb-10">
          <UploadCloud className="mx-auto h-12 w-12 text-indigo-400" />
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Deployment Phase</h1>
          <p className="mt-2 text-lg text-slate-400">Record and view your project's deployment details.</p>
        </div>

        {error && <p className="text-center text-red-400 bg-red-900/50 p-3 rounded-md mb-6">{error}</p>}

        {/* Deployment Info Section */}
        <div className="max-w-2xl mx-auto bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          {isLoading ? (
            <div className="text-center p-10"><Loader className="animate-spin mx-auto text-slate-400" /></div>
          ) : isEditing ? (
            // --- Edit Mode ---
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-2">
                {deploymentInfo?.liveUrl ? "Update Deployment Details" : "Enter Deployment Details"}
              </h2>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Live URL *</label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://your-project.vercel.app"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Hosting Platform (Optional)</label>
                <input
                  type="text"
                  value={editPlatform}
                  onChange={(e) => setEditPlatform(e.target.value)}
                  placeholder="e.g., Vercel, Netlify, Render"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Deployment Date (Optional)</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex items-center gap-1 py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500 text-sm font-semibold disabled:opacity-50"
                >
                    <X size={16}/> Cancel
                </button>
                <button
                  onClick={handleSaveDeploymentInfo}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? "Saving..." : "Save Info"}
                </button>
              </div>
            </div>
          ) : (
            // --- Display Mode ---
            <div className="space-y-3">
              <h2 className="text-xl font-semibold mb-2">Live Deployment</h2>
              <div>
                <p className="text-sm text-slate-400">Live URL:</p>
                <a
                  href={deploymentInfo?.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1 break-all" // break-all helps with long URLs
                >
                  {deploymentInfo?.liveUrl} <ExternalLink size={14} />
                </a>
              </div>
              {deploymentInfo?.platform && (
                <div>
                  <p className="text-sm text-slate-400">Hosted On:</p>
                  <p className="text-slate-200">{deploymentInfo.platform}</p>
                </div>
              )}
              {deploymentInfo?.deployedAt && (
                <div>
                  <p className="text-sm text-slate-400">Deployed On:</p>
                  {/* Format the date nicely if it exists */}
                  <p className="text-slate-200">{new Date(deploymentInfo.deployedAt + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500 text-sm font-semibold"
                >
                  <Edit size={16} /> Edit Info
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeploymentPhase;