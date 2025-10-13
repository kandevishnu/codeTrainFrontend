import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Zap,
  Loader,
  AlertTriangle,
  ArrowLeft,
  Download,
  BookOpen,
  ClipboardList,
  Target,
  CheckSquare,
  ArrowRight,
} from "lucide-react";

// --- Script Loader Hook with Callback ---
const useScript = (url, onLoad) => {
  useEffect(() => {
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      if (onLoad) onLoad();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = onLoad;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [url, onLoad]);
};

// --- Advanced Markdown to HTML Renderer (FIXED) ---
const MarkdownRenderer = ({ content }) => {
    const parseMarkdown = (text) => {
        if (!text) return "";

        // Process tables first as they are multi-line blocks that need special handling
        let html = text.replace(
            /^\|(.+?)\|\s*\n\|( *[-:]+ *\|)+([\s\S]+?)(?=\n\n|\n*$)/gm,
            (tableMatch) => {
                const rows = tableMatch.trim().split("\n");
                const headerRow = rows[0];
                const headerCells = headerRow.split('|').slice(1, -1).map(cell => `<th class="p-3 text-left font-semibold text-slate-300 bg-slate-700/50">${cell.trim()}</th>`).join('');

                const bodyRows = rows.slice(2);
                const bodyHtml = bodyRows.map(row => {
                    const cells = row.split('|').slice(1, -1).map(cell => {
                        const cellContent = cell.trim()
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            .replace(/`([^`]+)`/g, '<code class="bg-slate-900 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
                        return `<td class="p-3 border-t border-slate-700">${cellContent}</td>`;
                    }).join('');
                    return `<tr>${cells}</tr>`;
                }).join('');

                return `<div class="overflow-x-auto my-6 rounded-lg border border-slate-700"><table class="w-full border-collapse text-sm"><thead><tr>${headerCells}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
            }
        );
        
        // Process other elements block by block
        const blocks = html.split('\n\n').map(block => {
            if (block.startsWith('<div class="overflow-x-auto')) return block; // Keep table blocks intact

            if (block.startsWith('# ')) return `<h1 class="text-3xl font-bold mt-8 mb-4 text-indigo-300 border-b-2 border-slate-600 pb-2">${block.substring(2)}</h1>`;
            if (block.startsWith('## ')) return `<h2 class="text-2xl font-bold mt-6 mb-3 text-slate-200">${block.substring(3)}</h2>`;
            if (block.startsWith('### ')) return `<h3 class="text-xl font-semibold mt-4 text-slate-300">${block.substring(4)}</h3>`;
            if (block.trim() === '---' || block.trim() === '***') return '<hr class="my-8 border-slate-700" />';

            if (block.startsWith('> ')) {
                const quoteContent = block.split('\n').map(line => line.replace(/^> ?/, '')).join('<br/>');
                return `<blockquote class="border-l-4 border-slate-500 pl-4 my-4 italic text-slate-400">${quoteContent}</blockquote>`;
            }

            if (block.match(/^\s*[-*] /)) {
                const listItems = block.split('\n').map(item => {
                    let processedItem = item
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`([^`]+)`/g, '<code class="bg-slate-900 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
                    
                    const indent = item.match(/^\s*/)[0].length;
                    return `<li style="margin-left: ${indent * 1}ch;">${processedItem.replace(/^\s*[-*] /, '')}</li>`;
                }).join('');
                return `<ul class="list-disc pl-5 my-4 space-y-2">${listItems}</ul>`;
            }
            
            // Default to paragraph for remaining blocks
            return `<p class="mb-4 leading-relaxed">${block
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-slate-900 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
            }</p>`;
        }).join('');

        return blocks;
    };
    
    return <div id="srs-content-for-pdf" className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />;
};


const StatCard = ({ icon, label, value }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg flex items-center space-x-4 border border-slate-700">
        <div className="bg-indigo-500/10 p-3 rounded-lg">{icon}</div>
        <div>
            <p className="text-sm text-indigo-200 font-medium">{label}</p>
            <p className="text-lg text-white font-semibold truncate">{value}</p>
        </div>
    </div>
);

// --- Main Analysis Phase Component ---
const AnalysisPhase = () => {
  const { roomId } = useParams();
  const [isPdfLibLoaded, setIsPdfLibLoaded] = useState(false);
  useScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', () => setIsPdfLibLoaded(true));

  const [planningData, setPlanningData] = useState(null);
  const [generatedSrs, setGeneratedSrs] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  const planningDocRef = useCallback(() => doc(db, "rooms", roomId, "phases", "planning"), [roomId]);
  const analysisDocRef = useCallback(() => doc(db, "rooms", roomId, "phases", "analysis"), [roomId]);

  useEffect(() => {
    const fetchPhaseData = async () => {
      try {
        const planningSnap = await getDoc(planningDocRef());
        if (!planningSnap.exists() || !planningSnap.data().generatedPlan) {
          setError("Planning phase not complete. Please generate a development plan first.");
          return;
        }
        setPlanningData(planningSnap.data());

        const analysisSnap = await getDoc(analysisDocRef());
        if (analysisSnap.exists()) {
          setGeneratedSrs(analysisSnap.data().generatedSrs || "");
        }
      } catch (err) {
        console.error("Failed to fetch phase data:", err);
        setError("Couldn't load project data.");
      } finally {
        setDataLoaded(true);
      }
    };
    fetchPhaseData();
  }, [planningDocRef, analysisDocRef]);
  
  const handleGenerateSrs = async () => {
    if (!planningData) return setError("Cannot generate SRS without planning data.");
    setIsLoading(true);
    setError("");

    const systemPrompt = `You are a Senior Business Analyst tasked with creating a formal Software Requirements Specification (SRS) document. Use the provided Project Plan and Details as the single source of truth. The output MUST be a complete, professionally formatted SRS document using strict Markdown.

**FORMATTING RULES:**
- Use H1 for the main title: \`# Software Requirements Specification for [Project Title]\`.
- Use H2 for major sections (e.g., \`## 1. Introduction\`).
- Use H3 for subsections (e.g., \`### 1.1 Purpose\`).
- Use nested bullet points with proper indentation for lists.
- Use \`**bold**\` for key terms and \`*italics*\` for emphasis.
- For tables, ensure the header row, separator line, and body rows are all on their own separate lines to form a valid Markdown table.

**SRS DOCUMENT STRUCTURE:**
1.  **Introduction**:
    * 1.1 Purpose
    * 1.2 Document Conventions
    * 1.3 Intended Audience and Reading Suggestions
    * 1.4 Project Scope
2.  **Overall Description**:
    * 2.1 Product Perspective
    * 2.2 Product Functions (Summarize from the plan's core features)
    * 2.3 User Classes and Characteristics (Based on the target audience)
3.  **System Features & Functional Requirements**:
    * Create a subsection for each core feature from the plan.
    * For each feature, create a valid Markdown table like this:
| ID | Requirement | Details |
| :--- | :--- | :--- |
| FR-01 | User Login | The system SHALL allow users to log in. |
4.  **Non-Functional Requirements**:
    * 4.1 Performance
    * 4.2 Security
    * 4.3 Usability
5.  **Appendices**:
    * This section is optional. Include it only if there are specific terms to define. If not, you can state "No appendices are included in this document."
    `.trim();

    const userQuery = `
    Project Details and Plan:
    <ProjectDetails>
      ${JSON.stringify(planningData.inputs, null, 2)}
    </ProjectDetails>
    <DevelopmentPlan>
      ${planningData.generatedPlan}
    </DevelopmentPlan>
    
    Generate the SRS document based on these inputs, following the specified structure and formatting rules precisely.
    `.trim();

    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const payload = { contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const result = await response.json();
        const srsText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (srsText) {
            setGeneratedSrs(srsText);
            await setDoc(analysisDocRef(), { generatedSrs: srsText, lastUpdated: serverTimestamp() }, { merge: true });
        } else {
            throw new Error("The generated SRS was empty.");
        }
    } catch (err) {
        console.error("Error generating SRS:", err);
        setError(err.message || "An unexpected error occurred.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownloadPdf = () => {
      if (!isPdfLibLoaded || typeof window.html2pdf === 'undefined') {
          alert("PDF generator is still loading. Please wait a moment.");
          return;
      }
      const element = document.getElementById('srs-content-for-pdf');
      if (!element) return alert("Content to download not found.");

      const style = `<style> body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #333; } h1, h2, h3, strong { font-family: 'Helvetica', 'Arial', sans-serif; font-weight: bold; color: #1e293b; } h1 { font-size: 22pt; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #dde6f1; } h2 { font-size: 16pt; margin-top: 24px; margin-bottom: 12px; } h3 { font-size: 14pt; margin-top: 16px; margin-bottom: 8px; } p { margin-bottom: 12px; } ul { list-style-type: disc; margin-left: 20px; } li { margin-bottom: 4px; } strong { color: black !important; font-weight: bold; } em { font-style: italic; } code { font-family: 'Courier New', monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 10pt; } hr { border: none; border-top: 1px solid #cbd5e1; margin: 24px 0; } blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; margin: 1rem 0; font-style: italic; color: #64748b; } table { border-collapse: collapse; width: 100%; margin: 1rem 0; } th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; } th { background-color: #f8fafc; } </style>`;
      const html = style + element.innerHTML;
      
      const opt = { margin: 0.75, filename: `${planningData?.inputs?.projectTitle || 'SRS-Document'}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas:  { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }};
      window.html2pdf().from(html).set(opt).save();
  };

  if (!dataLoaded) return <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white"><Loader className="animate-spin mr-3" /> Loading Analysis Data...</div>;

  return (
    <div className="bg-slate-900 min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to={`/room/${roomId}/planning`} className="flex items-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors"><ArrowLeft size={16} className="mr-1" /> Back to Planning</Link>
          <Link to={`/room/${roomId}/design`} className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">Next: Design Phase <ArrowRight size={16} className="ml-2" /></Link>
        </div>

        <div className="text-center mb-10">
          <ClipboardList className="mx-auto h-12 w-12 text-indigo-400" />
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Analysis & Requirements</h1>
          <p className="mt-2 text-lg text-slate-400">Review project inputs and generate a formal SRS document.</p>
        </div>

        <div className="space-y-8">
          {/* Top Section: Analysis & Actions */}
          <div className="bg-slate-800/70 p-6 rounded-xl border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><BookOpen size={20} className="mr-3 text-indigo-400"/> Project Plan Summary</h2>
              {planningData?.inputs ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                      <StatCard icon={<Target size={20} className="text-indigo-300"/>} label="Project Title" value={planningData.inputs.projectTitle} />
                      <StatCard icon={<CheckSquare size={20} className="text-indigo-300"/>} label="Core Features" value={planningData.inputs.coreFeatures.split('\n').filter(f => f.trim() !== '').length} />
                       <div className="pt-4 sm:col-span-2 lg:col-span-1">
                           <button onClick={handleGenerateSrs} disabled={isLoading || !planningData} className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all">
                               {isLoading ? <Loader className="animate-spin" /> : <Zap className="mr-2" />}
                               {isLoading ? 'Generating SRS...' : 'Generate SRS Document'}
                           </button>
                       </div>
                  </div>
              ) : (
                  <p className="text-slate-400 text-sm">{error || "No planning data found."}</p>
              )}
          </div>
          
          {/* Bottom Section: Generated SRS */}
          <div className="bg-slate-800/70 p-6 rounded-xl border border-slate-700 flex flex-col min-h-[600px]">
            <div className="flex-shrink-0 flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold flex items-center"><FileText size={20} className="mr-3 text-indigo-400"/>SRS Document</h2>
                {generatedSrs && !isLoading && (
                    <button onClick={handleDownloadPdf} disabled={!isPdfLibLoaded} className="flex items-center text-sm p-2 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" title={isPdfLibLoaded ? "Download as PDF" : "PDF library loading..."}>
                        <Download size={18} />
                    </button>
                )}
            </div>
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="wait">
                    {isLoading && <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center"><Loader className="w-12 h-12 animate-spin text-indigo-400 mb-4" /><p className="font-semibold">Generating SRS Document...</p></motion.div>}
                    {error && !isLoading && <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center"><AlertTriangle className="w-12 h-12 text-red-400 mb-4" /><p className="font-semibold text-red-400">An Error Occurred</p><p className="text-sm text-slate-400">{error}</p></motion.div>}
                    {!isLoading && !error && generatedSrs && <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><MarkdownRenderer content={generatedSrs} /></motion.div>}
                    {!isLoading && !error && !generatedSrs && (
                        <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                             <p className="font-semibold text-slate-300">Your SRS document will appear here.</p>
                             <p className="text-sm mt-1">{planningData ? "Click 'Generate SRS Document' to start." : "Complete the Planning Phase first."}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPhase;

