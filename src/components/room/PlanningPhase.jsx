import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase"; 
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Settings,
  Zap,
  ArrowRight,
  Loader,
  AlertTriangle,
  ArrowLeft,
  Download,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";

// --- PDF Generation Script Loader ---
// This hook dynamically loads the jsPDF library from a CDN.
const useScript = (url) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [url]);
};

// --- Simple Markdown to HTML renderer ---
const MarkdownRenderer = ({ content }) => {
  const renderContent = () => {
    if (!content) return null;
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# "))
        return (
          <h1 key={index} className="text-2xl font-bold mt-4 mb-2">
            {line.substring(2)}
          </h1>
        );
      if (line.startsWith("## "))
        return (
          <h2 key={index} className="text-xl font-bold mt-3 mb-1">
            {line.substring(3)}
          </h2>
        );
      if (line.startsWith("### "))
        return (
          <h3 key={index} className="text-lg font-semibold mt-2">
            {line.substring(4)}
          </h3>
        );
      line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");
      if (line.startsWith("- ") || line.startsWith("* "))
        return (
          <li
            key={index}
            className="ml-6"
            dangerouslySetInnerHTML={{ __html: line.substring(2) }}
          />
        );
      if (line.trim() === "") return <br key={index} />;
      return (
        <p
          key={index}
          className="mb-2"
          dangerouslySetInnerHTML={{ __html: line }}
        />
      );
    });
  };
  return <div className="prose prose-invert max-w-none">{renderContent()}</div>;
};

// --- Reusable Input Field Component ---
const InputField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  rows = 1,
}) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-slate-300 mb-1"
    >
      {label}
    </label>
    {type === "textarea" ? (
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      />
    ) : (
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      />
    )}
  </div>
);

// --- Main Planning Phase Component ---
const PlanningPhase = () => {
  const { roomId } = useParams();
  useScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
  ); // Load jsPDF library

  const [projectDetails, setProjectDetails] = useState({
    projectTitle: "",
    projectDescription: "",
    keyObjectives: "",
    targetAudience: "",
    coreFeatures: "",
    techStack: "React, Firebase, Tailwind CSS",
    timeline: "3 months",
    budget: "$10,000",
  });
  const [generatedPlan, setGeneratedPlan] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(true); // State for form visibility

  const planDocRef = useCallback(
    () => doc(db, "rooms", roomId, "phases", "planning"),
    [roomId]
  );

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        const docSnap = await getDoc(planDocRef());
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.inputs) setProjectDetails(data.inputs);
          if (data.generatedPlan) setGeneratedPlan(data.generatedPlan);
        }
      } catch (err) {
        console.error("Failed to fetch planning data:", err);
        setError("Couldn't load existing project data.");
      } finally {
        setDataLoaded(true);
      }
    };
    fetchPlanData();
  }, [planDocRef]);

  const handleInputChange = (e) => {
    setProjectDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const savePlanToFirestore = async (inputs, plan) => {
    setIsSaving(true);
    try {
      await setDoc(
        planDocRef(),
        { inputs, generatedPlan: plan, lastUpdated: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to save data:", err);
      setError("Could not save the plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setGeneratedPlan("");

    const systemPrompt = `
You are a senior Project Manager and Solutions Architect (20+ years). 
Your job: generate a highly professional, easy-to-follow project plan from details provided.

REQUIREMENTS:
- Output should be VALID, CLEAN Markdown, using proper Markdown syntax.
- Indent sublists with two spaces per indentation level.
- For all lists, use "-" for main bullet lists, and "  - " (two spaces + dash) for nested bullets.
- Use "**bold**" for phase or task names and "*italic*" for important terms/concepts.
- Use code blocks (\`\`\`) only for actual code, if present in features.
- Each main section should start with a Markdown H2 ("##"), and subsections with H3 ("###").
- For milestones/tasks, present as clearly indented Markdown bullet lists or tables where applicable.
- Wrap project description or summary in a simple Markdown block quote.
- All output should be clean, organized, and copy-paste ready for web/PDF use.

STRUCTURE:
## Project Summary
> {max 4 lines summary}

## Phase Breakdown
### Phase Name
- **Milestone 1**
  - *Task 1*
  - *Task 2*
- **Milestone 2**
  - *Task 1*

## Key Tasks & Milestones
- **Phase:** _Phase name_
  - *Task:* 
    - Description, details

## Technology Recommendations
- Reasoning for each main stack component (bullet list)

## Timeline Estimate
- Gantt-like breakdown as a Markdown bullet list by week(s).

## Risks & Mitigation
| **Risk** | **Mitigation** |
|----------|---------------|
| Risk 1   | Mitigation 1  |
| Risk 2   | Mitigation 2  |
`.trim();


    const userQuery = `
PROJECT DETAILS:
- **Project Title:** ${projectDetails.projectTitle}
- **Project Description:** ${projectDetails.projectDescription}
- **Key Objectives:**${projectDetails.keyObjectives
    .split("\n")
    .map(obj => `\n  - ${obj}`).join("")}
- **Target Audience:** ${projectDetails.targetAudience}
- **Core Features:**${projectDetails.coreFeatures
    .split("\n")
    .map(f => `\n  - ${f}`).join("")}
- **Proposed Tech Stack:**${projectDetails.techStack
    .split(",")
    .map(t => `\n  - ${t.trim()}`).join("")}
- **Timeline:** ${projectDetails.timeline}
- **Budget:** ${projectDetails.budget}

EXPECTATION: Follow the provided format strictly. Use valid Markdown with clear structure, indentation, and list formatting. Return only the plan, no extra comments.
`.trim();

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      const planText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (planText) {
        setGeneratedPlan(planText);
        await savePlanToFirestore(projectDetails, planText);
      } else {
        throw new Error(
          "The generated plan was empty. Please try refining your inputs."
        );
      }
    } catch (err) {
      console.error("Error generating plan:", err);
      setError(
        err.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedPlan || typeof window.jspdf === "undefined") {
      alert("Plan has not been generated or PDF library is not loaded yet.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(projectDetails.projectTitle || "Development Plan", 14, 22);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    let y = 35;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;

    const lines = generatedPlan.split("\n");
    lines.forEach((line) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      let text = line;
      if (line.startsWith("# ")) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        text = line.substring(2);
      } else if (line.startsWith("## ")) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        text = line.substring(3);
      } else if (line.startsWith("### ")) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        text = line.substring(4);
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        text = `  • ${line.substring(2)}`;
      }

      // Handle bold text within a line
      const boldRegex = /\*\*(.*?)\*\*/g;
      let parts = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            text: line.substring(lastIndex, match.index),
            bold: false,
          });
        }
        parts.push({ text: match[1], bold: true });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        parts.push({ text: line.substring(lastIndex), bold: false });
      }

      const splitText = doc.splitTextToSize(
        text,
        doc.internal.pageSize.width - margin * 2
      );

      doc.text(splitText, margin, y);
      y += doc.getTextDimensions(splitText).h + 2;

      // Reset font for the next line
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
    });

    doc.save(
      `${projectDetails.projectTitle.replace(/\s+/g, "-")}-Development-Plan.pdf`
    );
  };

  if (!dataLoaded)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <Loader className="animate-spin mr-3" /> Loading Planning Data...
      </div>
    );

  return (
    <div className="bg-slate-900 min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/room/${roomId}`}
            className="flex items-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to Overview
          </Link>
          <Link
            to={`/room/${roomId}/analysis`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Next: Analysis Phase <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>

        <div className="text-center mb-8">
          <FileText className="mx-auto h-12 w-12 text-indigo-400" />
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Project Planning Phase
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Define your project scope and generate an actionable development
            plan with AI.
          </p>
        </div>

        <div
          className={`grid grid-cols-1 ${
            isFormVisible ? "lg:grid-cols-2" : ""
          } gap-8`}
        >
          <AnimatePresence>
            {isFormVisible && (
              <motion.div
                key="form-panel"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
                transition={{ duration: 0.5 }}
              >
                <form
                  onSubmit={handleGeneratePlan}
                  className="space-y-6 bg-slate-800/70 p-6 rounded-xl border border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="text-slate-400" />
                    <h2 className="text-xl font-semibold">Project Details</h2>
                  </div>
                  <InputField
                    id="projectTitle"
                    label="Project Title"
                    value={projectDetails.projectTitle}
                    onChange={handleInputChange}
                    placeholder="e.g., AI-Powered Fitness Coach"
                  />
                  <InputField
                    id="projectDescription"
                    label="Project Description"
                    value={projectDetails.projectDescription}
                    onChange={handleInputChange}
                    placeholder="Describe the main purpose and value of your project."
                    type="textarea"
                    rows={3}
                  />
                  <InputField
                    id="keyObjectives"
                    label="Key Objectives"
                    value={projectDetails.keyObjectives}
                    onChange={handleInputChange}
                    placeholder="List the main goals, one per line."
                    type="textarea"
                    rows={3}
                  />
                  <InputField
                    id="targetAudience"
                    label="Target Audience"
                    value={projectDetails.targetAudience}
                    onChange={handleInputChange}
                    placeholder="e.g., Busy professionals aged 25-40"
                  />
                  <InputField
                    id="coreFeatures"
                    label="Core Features"
                    value={projectDetails.coreFeatures}
                    onChange={handleInputChange}
                    placeholder="List the most important features, one per line."
                    type="textarea"
                    rows={4}
                  />
                  <InputField
                    id="techStack"
                    label="Technology Stack"
                    value={projectDetails.techStack}
                    onChange={handleInputChange}
                  />
                  <InputField
                    id="timeline"
                    label="Estimated Timeline"
                    value={projectDetails.timeline}
                    onChange={handleInputChange}
                  />
                  <InputField
                    id="budget"
                    label="Estimated Budget"
                    value={projectDetails.budget}
                    onChange={handleInputChange}
                  />
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all"
                    >
                      {isLoading ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <Zap className="mr-2" />
                      )}{" "}
                      {isLoading
                        ? "Generating Plan..."
                        : "Generate Development Plan"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout
            className="bg-slate-800/70 p-6 rounded-xl border border-slate-700 h-full min-h-[400px]"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFormVisible(!isFormVisible)}
                  className="p-2 rounded-md hover:bg-slate-700 transition-colors"
                  title={isFormVisible ? "Hide Form" : "Show Form"}
                >
                  {isFormVisible ? (
                    <PanelLeftClose size={20} />
                  ) : (
                    <PanelLeftOpen size={20} />
                  )}
                </button>
                <h2 className="text-xl font-semibold">Generated Plan</h2>
              </div>
              {generatedPlan && !isLoading && (
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center text-sm p-2 rounded-md hover:bg-slate-700 transition-colors"
                  title="Download as PDF"
                >
                  <Download size={18} />
                </button>
              )}
            </div>
            <div className="prose prose-invert max-w-none text-slate-300 h-[calc(100%-40px)] overflow-y-auto pr-2">
              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <Loader className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
                    <p className="font-semibold">Generating your plan...</p>
                    <p className="text-sm text-slate-400">
                      This may take a moment.
                    </p>
                  </motion.div>
                )}
                {error && !isLoading && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                    <p className="font-semibold text-red-400">
                      An Error Occurred
                    </p>
                    <p className="text-sm text-slate-400">{error}</p>
                  </motion.div>
                )}
                {!isLoading && !error && generatedPlan && (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <MarkdownRenderer content={generatedPlan} />
                  </motion.div>
                )}
                {!isLoading && !error && !generatedPlan && (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <p className="font-semibold">
                      Your AI-generated plan will appear here.
                    </p>
                    <p className="text-sm text-slate-400">
                      Fill in the details and click "Generate" to start.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PlanningPhase;
