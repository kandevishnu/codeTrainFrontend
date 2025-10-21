import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase'; // Adjust path as needed
import {
  ArrowLeft,
  Wrench, // Icon for Maintenance
  Bug, // Icon for Issues
  ExternalLink, // Icon for Live Link
  ListChecks, // Icon for Issue Tracker
  Info, // Icon for Status
} from 'lucide-react';

const MaintenancePhase = () => {
  const { roomId } = useParams();
  const [issues, setIssues] = useState([]);
  const [deploymentInfo, setDeploymentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch Deployment Info (Live URL)
  useEffect(() => {
    const deploymentConfigRef = doc(db, 'rooms', roomId, 'configs', 'deployment');
    const unsubDeploy = onSnapshot(
      deploymentConfigRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setDeploymentInfo(docSnap.data());
        } else {
          setDeploymentInfo(null);
        }
        // Consider loading complete only after both fetches finish if needed
      },
      (err) => {
        console.error('Error fetching deployment info:', err);
        setError('Could not load deployment details.');
      }
    );
    return () => unsubDeploy();
  }, [roomId]);

  // Fetch Open Issues/Bugs
  useEffect(() => {
    const issuesQuery = query(
      collection(db, 'rooms', roomId, 'issues'),
      where('status', '!=', 'closed'), // Only show open or in-progress issues
      orderBy('createdAt', 'desc')
    );
    const unsubIssues = onSnapshot(
      issuesQuery,
      (snapshot) => {
        setIssues(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setIsLoading(false); // Mark loading complete after fetching issues
      },
      (err) => {
        console.error('Error fetching issues:', err);
        setError('Could not load project issues.');
        setIsLoading(false);
      }
    );
    return () => unsubIssues();
  }, [roomId]);

  const openIssuesCount = issues.length;

  return (
    <div className="bg-slate-900 min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation - Link back to Deployment */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/room/${roomId}/deployment`}
            className="flex items-center text-sm text-indigo-400 hover:text-indigo-300"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to Deployment
          </Link>
          {/* Add a link forward if there's a next logical step, or remove */}
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <Wrench className="mx-auto h-12 w-12 text-indigo-400" />
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Maintenance Phase
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Monitor, update, and manage your deployed project.
          </p>
        </div>

        {error && (
          <p className="text-center text-red-400 bg-red-900/50 p-3 rounded-md mb-6">
            {error}
          </p>
        )}

        {/* Maintenance Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Live Project Link Card */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ExternalLink size={18} className="text-indigo-400" /> Live Project
            </h2>
            {deploymentInfo?.liveUrl ? (
              <a
                href={deploymentInfo.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline break-all"
              >
                {deploymentInfo.liveUrl}
              </a>
            ) : (
              <p className="text-sm text-slate-500">
                No deployment URL recorded yet. Visit the Deployment Phase.
              </p>
            )}
            {deploymentInfo?.platform && (
                 <p className="text-xs text-slate-500 mt-2">Hosted on: {deploymentInfo.platform}</p>
            )}
          </div>

          {/* Issue Tracker Summary Card */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Bug size={18} className="text-red-400" /> Issue Tracker
            </h2>
            {isLoading ? (
               <p className="text-sm text-slate-500">Loading issues...</p>
            ) : (
              <div>
                 <p className="text-2xl font-bold text-slate-200">
                    {openIssuesCount}
                 </p>
                 <p className="text-sm text-slate-400 mb-4">
                    Open Issue{openIssuesCount !== 1 ? 's' : ''}
                 </p>
                 {/* Link to a dedicated Issue Tracker page if you build one */}
                 <Link
                   to="#" // Replace with actual link later
                   className="text-indigo-400 hover:underline text-sm flex items-center gap-1"
                 >
                   View Issue Tracker <ListChecks size={14} />
                 </Link>
              </div>
            )}
          </div>

          {/* Add more cards as needed (e.g., Performance Monitoring, Update History) */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
             <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Info size={18} className="text-blue-400" /> Project Status
            </h2>
            {/* You could add logic here to display overall project status */}
            <p className="text-sm text-slate-400">Deployed and under monitoring.</p>
            {/* Maybe link to update logs or future plans */}
          </div>

        </div>
      </div>
    </div>
  );
};

export default MaintenancePhase;