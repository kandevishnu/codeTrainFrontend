import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../routes/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  Plus,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Bug,
} from "lucide-react";

// --- Main Testing Phase Component ---
const TestingPhase = () => {
  const { roomId } = useParams();
  const { user } = useAuth();

  // State for data
  const [testSuites, setTestSuites] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [roomData, setRoomData] = useState(null); // (NEW) For member list
  const [selectedSuiteId, setSelectedSuiteId] = useState(null);

  // State for UI and Modals
  const [loading, setLoading] = useState(true);
  const [isSuiteModalOpen, setIsSuiteModalOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [failedTestCase, setFailedTestCase] = useState(null);

  // (NEW) Fetch Room Data to get members for the assignee dropdown
  useEffect(() => {
      if (!roomId) return;
      const roomRef = doc(db, "rooms", roomId);
      const unsubscribe = onSnapshot(roomRef, (docSnap) => {
          if (docSnap.exists()) {
              setRoomData(docSnap.data());
          }
      });
      return () => unsubscribe();
  }, [roomId]);

  // Fetch Test Suites
  useEffect(() => {
    if (!roomId) return;
    const suitesQuery = query(collection(db, "rooms", roomId, "testSuites"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(suitesQuery, (snapshot) => {
      const suites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTestSuites(suites);
      if (!selectedSuiteId && suites.length > 0) {
        setSelectedSuiteId(suites[0].id);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId]);

  // Fetch Test Cases
  useEffect(() => {
    if (!selectedSuiteId) {
        setTestCases([]);
        return;
    };
    const casesQuery = query(
      collection(db, "rooms", roomId, "testCases"),
      where("suiteId", "==", selectedSuiteId),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(casesQuery, (snapshot) => {
      const cases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTestCases(cases);
    });
    return () => unsubscribe();
  }, [selectedSuiteId]);


  // --- Handlers ---
  const handleCreateSuite = async (title) => {
    if (!title.trim()) return;
    const suitesColRef = collection(db, "rooms", roomId, "testSuites");
    await addDoc(suitesColRef, {
      title,
      createdBy: user.displayName,
      createdAt: serverTimestamp(),
    });
    setIsSuiteModalOpen(false);
  };

  const handleCreateCase = async ({ title, steps, expectedResult }) => {
    if (!title.trim() || !steps.trim() || !expectedResult.trim()) return;
    const casesColRef = collection(db, "rooms", roomId, "testCases");
    await addDoc(casesColRef, {
      suiteId: selectedSuiteId,
      title,
      steps: steps.split('\n'),
      expectedResult,
      status: "untested",
      createdAt: serverTimestamp(),
      createdBy: user.displayName,
    });
    setIsCaseModalOpen(false);
  };

  const handleUpdateStatus = async (caseId, newStatus) => {
    const caseRef = doc(db, "rooms", roomId, "testCases", caseId);
    await updateDoc(caseRef, {
      status: newStatus,
      testedBy: user.displayName,
      testedAt: serverTimestamp(),
    });

    if (newStatus === 'failed') {
      const failedCase = testCases.find(c => c.id === caseId);
      setFailedTestCase(failedCase);
      setIsBugModalOpen(true);
    }
  };

  // (MODIFIED) Handle Bug Logging with Assignee
  const handleLogBug = async ({ description, assigneeId, assigneeName }) => {
    if (!description.trim() || !failedTestCase) return;
    const issuesColRef = collection(db, "rooms", roomId, "issues");
    await addDoc(issuesColRef, {
      title: `Bug in: ${failedTestCase.title}`,
      description,
      assigneeId: assigneeId || null,
      assigneeName: assigneeName || null,
      linkedTestCaseId: failedTestCase.id,
      status: 'open',
      reportedBy: user.displayName,
      createdAt: serverTimestamp(),
    });
    setIsBugModalOpen(false);
    setFailedTestCase(null);
  };
  
  const selectedSuite = useMemo(() => 
    testSuites.find(s => s.id === selectedSuiteId),
    [testSuites, selectedSuiteId]
  );

  if (loading) {
    return <div className="text-center text-slate-400 p-10">Loading Test Suites...</div>;
  }

  return (
    <>
      <div className="bg-slate-900 min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            {/* ... Header and Navigation ... */}
            <div className="flex items-center justify-between mb-6">
                <Link to={`/room/${roomId}/implementation`} className="flex items-center text-sm text-indigo-400 hover:text-indigo-300">
                    <ArrowLeft size={16} className="mr-1" /> Back to Implementation
                </Link>
                <Link to={`/room/${roomId}/deployment`} className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">
                    Next: Deployment Phase <ArrowRight size={16} className="ml-2" />
                </Link>
            </div>
            <div className="text-center mb-10">
                <ClipboardList className="mx-auto h-12 w-12 text-indigo-400" />
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Testing Phase</h1>
                <p className="mt-2 text-lg text-slate-400">Verify functionality through structured manual testing.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 min-h-[60vh]">
                {/* Left Panel: Test Suites */}
                <div className="w-full md:w-1/3 lg:w-1/4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Test Suites</h2>
                        <button onClick={() => setIsSuiteModalOpen(true)} className="p-2 hover:bg-slate-700 rounded-md" title="Create New Suite">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {testSuites.map(suite => (
                            <button key={suite.id} onClick={() => setSelectedSuiteId(suite.id)}
                                className={`w-full text-left flex items-center gap-3 p-2 rounded-md transition ${selectedSuiteId === suite.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700'}`}>
                                <Folder size={16} />
                                <span className="flex-grow truncate">{suite.title}</span>
                                <ChevronRight size={16} />
                            </button>
                        ))}
                         {testSuites.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No suites created yet.</p>}
                    </div>
                </div>

                {/* Right Panel: Test Cases */}
                <div className="flex-1 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    {selectedSuite ? (
                        <>
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
                                <h2 className="text-xl font-semibold truncate">{selectedSuite.title}</h2>
                                <button onClick={() => setIsCaseModalOpen(true)} className="flex items-center gap-2 text-sm bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors">
                                    <Plus size={16} /> Add Test Case
                                </button>
                            </div>
                            <div className="space-y-3">
                                {testCases.map(tc => <TestCaseItem key={tc.id} testCase={tc} onUpdateStatus={handleUpdateStatus} />)}
                                {testCases.length === 0 && <p className="text-sm text-slate-500 text-center py-10">No test cases in this suite.</p>}
                            </div>
                        </>
                    ) : ( <div className="flex items-center justify-center h-full"><p className="text-slate-500">Create or select a test suite to begin.</p></div> )}
                </div>
            </div>
        </div>
      </div>
      
      {/* Modals */}
      <SuiteModal isOpen={isSuiteModalOpen} onClose={() => setIsSuiteModalOpen(false)} onSave={handleCreateSuite} />
      <CaseModal isOpen={isCaseModalOpen} onClose={() => setIsCaseModalOpen(false)} onSave={handleCreateCase} />
      {/* (MODIFIED) Pass members to the bug modal */}
      <BugModal isOpen={isBugModalOpen} onClose={() => setIsBugModalOpen(false)} onSave={handleLogBug} testCase={failedTestCase} members={roomData?.members || []} />
    </>
  );
};


// --- Sub-component for a single Test Case Item ---
const TestCaseItem = ({ testCase, onUpdateStatus }) => {
    // ... no changes here ...
    const [isExpanded, setIsExpanded] = useState(false);
    const statusStyles = {
        untested: { icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-700', label: 'Untested' },
        passed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-800/50', label: 'Passed' },
        failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-800/50', label: 'Failed' },
    };
    const currentStatus = statusStyles[testCase.status];
    const StatusIcon = currentStatus.icon;

    return (
        <div className={`p-4 rounded-lg border ${currentStatus.bg} border-slate-700`}>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <StatusIcon size={20} className={currentStatus.color} />
                    <p className="font-semibold text-slate-200">{testCase.title}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${currentStatus.bg} ${currentStatus.color}`}>{currentStatus.label}</span>
                    <ChevronRight size={20} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
            </div>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '16px' }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                        <div className="pl-8 border-l border-slate-600 ml-2.5">
                            <h4 className="font-semibold text-sm mb-1 text-slate-300">Steps to Reproduce:</h4>
                            <ol className="list-decimal list-inside text-sm text-slate-400 space-y-1">
                                {testCase.steps.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                            <h4 className="font-semibold text-sm mt-4 mb-1 text-slate-300">Expected Result:</h4>
                            <p className="text-sm text-slate-400">{testCase.expectedResult}</p>
                            <div className="flex items-center gap-3 mt-6">
                                <button onClick={() => onUpdateStatus(testCase.id, 'passed')} className="flex-1 text-center py-2 bg-green-600/20 text-green-300 rounded-md hover:bg-green-600/40 transition">Mark as Passed ✅</button>
                                <button onClick={() => onUpdateStatus(testCase.id, 'failed')} className="flex-1 text-center py-2 bg-red-600/20 text-red-300 rounded-md hover:bg-red-600/40 transition">Mark as Failed ❌</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// --- Modal Components ---

const SuiteModal = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    if (!isOpen) return null;
    return (
        <ModalWrapper onClose={onClose}>
            <h2 className="text-xl font-bold mb-4 text-amber-50">Create New Test Suite</h2>
            {/* (STYLES FIX) Added text and placeholder colors */}
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., User Authentication Tests" className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            <div className="flex justify-end mt-6">
                <button onClick={() => onSave(title)} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold">Save Suite</button>
            </div>
        </ModalWrapper>
    );
};

const CaseModal = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState('');
    const [expectedResult, setExpectedResult] = useState('');
    if (!isOpen) return null;
    return (
        <ModalWrapper onClose={onClose}>
            <h2 className="text-xl font-bold mb-4 text-amber-50">Create New Test Case</h2>
            <div className="space-y-4">
                {/* (STYLES FIX) Added text and placeholder colors */}
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Test Case Title" className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea value={steps} onChange={e => setSteps(e.target.value)} placeholder="Steps to reproduce (one per line)" rows="4" className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" value={expectedResult} onChange={e => setExpectedResult(e.target.value)} placeholder="Expected Result" className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={() => onSave({title, steps, expectedResult})} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold">Save Case</button>
            </div>
        </ModalWrapper>
    );
};

// (MODIFIED) BugModal now accepts 'members' prop
const BugModal = ({ isOpen, onClose, onSave, testCase, members }) => {
    const [description, setDescription] = useState('');
    const [assigneeId, setAssigneeId] = useState('');

    const handleSave = () => {
        const assignee = members.find(m => m.uid === assigneeId);
        onSave({
            description,
            assigneeId,
            assigneeName: assignee ? assignee.name : null
        });
    };

    if (!isOpen) return null;
    return (
        <ModalWrapper onClose={onClose}>
            <div className="flex items-center gap-2 mb-4">
                <Bug size={24} className="text-red-400" />
                <h2 className="text-xl font-bold">Log a New Bug</h2>
            </div>
            <p className="text-sm bg-slate-700/50 p-3 rounded-md mb-4">Failed Test Case: <span className="font-semibold text-slate-200">{testCase?.title}</span></p>
            {/* (STYLES FIX) Added text and placeholder colors */}
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the bug... What happened instead?" rows="4" className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            
            {/* (NEW) Assignee Dropdown */}
            <div className="mt-4">
                <label className="text-sm font-medium text-slate-300 mb-1 block">Assign to:</label>
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Unassigned</option>
                    {members.map(member => (
                        <option key={member.uid} value={member.uid}>{member.name}</option>
                    ))}
                </select>
            </div>
            
            <div className="flex justify-end mt-6">
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-sm font-semibold">Log Bug</button>
            </div>
        </ModalWrapper>
    );
};


// Generic Modal Wrapper
const ModalWrapper = ({ children, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 border border-slate-700">
                {children}
            </motion.div>
        </div>
    );
}

export default TestingPhase;