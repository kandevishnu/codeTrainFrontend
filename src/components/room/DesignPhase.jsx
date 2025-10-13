import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { db } from "/src/firebase.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  ArrowRight,
  Loader,
  ArrowLeft,
  Upload,
  File as FileIcon,
  Type,
  LayoutTemplate,
  Save,
  Trash2,
  Square,
  Circle,
  MousePointer,
  Paintbrush,
  Maximize,
  Minimize,
  CornerUpLeft,
  CornerUpRight,
  Text as TextIcon,
} from "lucide-react";

// Custom hook to dynamically load Fabric.js script
const useFabricScript = (url) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.fabric) {
      console.log("Fabric.js already present");
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    const onScriptLoad = () => {
      console.log("Fabric.js script loaded");
      setLoaded(true);
    };
    const onScriptError = () => {
      console.error("Error loading Fabric.js script");
      setError(new Error("Failed to load Fabric.js script"));
    };

    script.addEventListener("load", onScriptLoad);
    script.addEventListener("error", onScriptError);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", onScriptLoad);
      script.removeEventListener("error", onScriptError);
    };
  }, [url]);

  return { loaded, error };
};

const TabButton = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
      isActive
        ? "border-indigo-400 text-white"
        : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-300"
    }`}
  >
    {icon}
    {label}
  </button>
);

const WhiteboardControls = ({ canvas, handleUndo, handleRedo }) => {
  if (!canvas) return null;

  const addShape = (type) => {
    canvas.isDrawingMode = false;
    let obj;
    if (type === "rect") {
      obj = new window.fabric.Rect({
        left: 100,
        top: 100,
        width: 150,
        height: 100,
        fill: "transparent",
        stroke: "#e2e8f0",
        strokeWidth: 3,
      });
    } else if (type === "circle") {
      obj = new window.fabric.Circle({
        left: 200,
        top: 150,
        radius: 50,
        fill: "transparent",
        stroke: "#e2e8f0",
        strokeWidth: 3,
      });
    } else if (type === "arrow") {
      const line = new window.fabric.Line([50, 50, 200, 50], {
        stroke: "#ffffff",
        strokeWidth: 3,
      });
      const triangle = new window.fabric.Triangle({
        left: 200,
        top: 50,
        width: 10,
        height: 15,
        angle: 90,
        fill: "#ffffff",
      });
      obj = new window.fabric.Group([line, triangle], { selectable: true });
    } else if (type === "text") {
      obj = new window.fabric.IText("Double-click to edit", {
        left: 100,
        top: 100,
        fill: "#ffffff",
        fontSize: 18,
      });
    }
    if (obj) {
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    }
  };

  const toggleDrawingMode = (drawing) => {
    canvas.isDrawingMode = drawing;
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-2 flex items-center gap-2 shadow-lg z-20">
      <button
        onClick={() => toggleDrawingMode(false)}
        title="Select Tool"
        className="p-2 hover:bg-slate-700 rounded-md"
      >
        <MousePointer size={18} />
      </button>
      <button
        onClick={() => toggleDrawingMode(true)}
        title="Brush Tool"
        className="p-2 hover:bg-slate-700 rounded-md"
      >
        <Paintbrush size={18} />
      </button>

      <div className="w-px h-6 bg-slate-700 mx-1"></div>

      <button
        onClick={() => addShape("rect")}
        title="Rectangle"
        className="p-2 hover:bg-slate-700 rounded-md"
      >
        <Square size={18} />
      </button>
      <button
        onClick={() => addShape("circle")}
        title="Circle"
        className="p-2 hover:bg-slate-700 rounded-md"
      >
        <Circle size={18} />
      </button>
      <button
        onClick={() => addShape("arrow")}
        title="Arrow"
        className="p-2 hover:bg-slate-700 rounded-md"
      >
        <CornerUpRight size={18} />
      </button>
      <button
        onClick={() => addShape("text")}
        title="Text"
        className="p-2 hover:bg-slate-700 rounded-md"
      >
        <TextIcon size={18} />
      </button>

      <div className="w-px h-6 bg-slate-700 mx-1"></div>

      <button
        onClick={handleUndo}
        title="Undo"
        className="p-2 hover:bg-slate-700 rounded-md"
      >
        <CornerUpLeft size={18} />
      </button>
      <button
        onClick={handleRedo}
        title="Redo"
        className="p-2 hover:bg-slate-700 rounded-md"
      >
        <CornerUpRight size={18} />
      </button>

      <div className="w-px h-6 bg-slate-700 mx-1"></div>

      <input
        type="color"
        defaultValue="#818cf8"
        onChange={(e) => (canvas.freeDrawingBrush.color = e.target.value)}
        className="w-8 h-8 bg-transparent border-none cursor-pointer"
        title="Brush Color"
      />
      <input
        type="range"
        min="1"
        max="30"
        defaultValue="4"
        onChange={(e) => (canvas.freeDrawingBrush.width = parseInt(e.target.value, 10))}
        className="w-20 cursor-pointer"
        title="Brush Width"
      />

      <div className="w-px h-6 bg-slate-700 mx-1"></div>

      <button
        onClick={() => {
          canvas.clear();
          console.log("Canvas cleared");
        }}
        title="Clear Canvas"
        className="p-2 text-red-400 hover:bg-red-500/20 rounded-md"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

const DesignPhase = () => {
  const { roomId } = useParams();

  const [activeTab, setActiveTab] = useState("whiteboard");
  const [designNotes, setDesignNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const designDocRef = useCallback(() => doc(db, "rooms", roomId, "phases", "design"), [roomId]);
  const storage = getStorage();

  const { loaded: fabricLoaded, error: fabricError } = useFabricScript(
    "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.2.4/fabric.min.js"
  );

  useEffect(() => {
    console.log("Effect triggered: fabricLoaded =", fabricLoaded, ", activeTab =", activeTab);

    if (!fabricLoaded) {
      console.log("Waiting for Fabric.js to load...");
      return;
    }
    if (activeTab !== "whiteboard") {
      console.log("Active tab not whiteboard, skipping canvas init");
      return;
    }

    let cancel = false;
    let canvas;

    async function waitForCanvasThenInit() {
      let tries = 0;
      while (!canvasRef.current && tries < 20) {
        await new Promise((r) => setTimeout(r, 50));
        tries++;
      }
      if (cancel) return;
      if (!canvasRef.current) {
        console.warn("canvasRef still null after waiting, aborting init");
        return;
      }
      try {
        const parentEl = canvasRef.current.parentElement;
        canvas = new window.fabric.Canvas(canvasRef.current, {
          isDrawingMode: false,
          backgroundColor: "#111827",
          width: parentEl.clientWidth,
          height: parentEl.clientHeight,
        });
        canvas.freeDrawingBrush.color = "#818cf8";
        canvas.freeDrawingBrush.width = 4;
        setFabricCanvas(canvas);
        setCanvasReady(true);
        console.log("Fabric canvas initialized");
      } catch (err) {
        console.error("Error initializing Fabric canvas:", err);
        return;
      }

      const saveState = () => {
        const json = canvas.toJSON();
        setHistory((prev) => [...prev, json]);
        setRedoStack([]);
      };

      canvas.on("object:added", saveState);
      canvas.on("object:modified", saveState);
      canvas.on("object:removed", saveState);

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        if (canvas && canvas.upperCanvasEl && canvas.lowerCanvasEl) {
          canvas.setDimensions({ width, height });
          canvas.renderAll();
        } else {
          console.warn("Canvas disposed or invalid when resizing");
        }
      });
      resizeObserver.observe(canvasRef.current.parentElement);

      return () => {
        console.log("Cleaning up Fabric.js canvas");
        canvas.off("object:added", saveState);
        canvas.off("object:modified", saveState);
        canvas.off("object:removed", saveState);
        resizeObserver.disconnect();
        canvas.dispose();
        setFabricCanvas(null);
        setCanvasReady(false);
      };
    }

    waitForCanvasThenInit();

    return () => {
      cancel = true;
      if (canvas) {
        canvas.dispose();
        setFabricCanvas(null);
        setCanvasReady(false);
      }
    };
  }, [fabricLoaded, activeTab]);

  useEffect(() => {
    const fetchOtherData = async () => {
      try {
        const docSnap = await getDoc(designDocRef());
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDesignNotes(data.designNotes || "");
          setUploadedFiles(data.uploadedFiles || []);
        }
      } catch (err) {
        setError("Couldn't load existing design data.");
      } finally {
        setDataLoaded(true);
      }
    };
    fetchOtherData();
  }, [designDocRef]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Auto tab toggle to remount whiteboard reliably but stay on it finally
  useEffect(() => {
    let timer1, timer2;
    timer1 = setTimeout(() => {
      setActiveTab("notes");
      timer2 = setTimeout(() => {
        setActiveTab("whiteboard");
      }, 400);
    }, 1000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleUndo = () => {
    if (!fabricCanvas || history.length < 2) return;
    console.log("Performing undo");
    const newHistory = [...history];
    const lastState = newHistory.pop();
    setRedoStack((prev) => [lastState, ...prev]);
    const prevState = newHistory[newHistory.length - 1];
    fabricCanvas.loadFromJSON(prevState, fabricCanvas.renderAll.bind(fabricCanvas));
    setHistory(newHistory);
  };

  const handleRedo = () => {
    if (!fabricCanvas || redoStack.length === 0) return;
    console.log("Performing redo");
    const [nextState, ...rest] = redoStack;
    fabricCanvas.loadFromJSON(nextState, fabricCanvas.renderAll.bind(fabricCanvas));
    setHistory((prev) => [...prev, nextState]);
    setRedoStack(rest);
  };

  // Save whiteboard export (download JSON file)
  const handleSaveWhiteboard = () => {
    if (!fabricCanvas) {
      console.warn("No fabric canvas to save");
      return;
    }
    const json = fabricCanvas.toJSON();
    const jsonStr = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whiteboard.json";
    a.click();
    URL.revokeObjectURL(url);
    console.log("Whiteboard exported as JSON file");
  };

  if (fabricError)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-red-500">
        Error loading Fabric.js Library: {fabricError.message}
      </div>
    );

  if (!fabricLoaded || !dataLoaded)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <Loader className="animate-spin mr-3" /> Loading...
      </div>
    );

  return (
    <div className="bg-slate-900 min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to={`/room/${roomId}/analysis`} className="flex items-center text-sm text-indigo-400 hover:text-indigo-300">
            <ArrowLeft size={16} className="mr-1" /> Back to Analysis
          </Link>
          <Link to={`/room/${roomId}/implementation`} className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">
            Next: Implementation <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>

        <div className="text-center mb-10">
          <Palette className="mx-auto h-12 w-12 text-indigo-400" />
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Design & Architecture</h1>
          <p className="mt-2 text-lg text-slate-400">Create wireframes, document notes, and upload design assets.</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col min-h-[70vh]">
          <div className="flex-shrink-0 border-b border-slate-700 px-4">
            <div className="flex items-center space-x-2">
              <TabButton
                label="Whiteboard"
                icon={<LayoutTemplate size={16} />}
                isActive={activeTab === "whiteboard"}
                onClick={() => setActiveTab("whiteboard")}
              />
              <TabButton
                label="Design Notes"
                icon={<Type size={16} />}
                isActive={activeTab === "notes"}
                onClick={() => setActiveTab("notes")}
              />
              <TabButton
                label="Uploaded Files"
                icon={<Upload size={16} />}
                isActive={activeTab === "files"}
                onClick={() => setActiveTab("files")}
              />
            </div>
          </div>

          <div className="flex-grow p-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                {activeTab === "whiteboard" && (
                  <div ref={canvasContainerRef} className="w-full h-[65vh] p-2 relative bg-[#111827]">
                    <canvas ref={canvasRef} />
                    {canvasReady && fabricCanvas ? (
                      <WhiteboardControls canvas={fabricCanvas} handleUndo={handleUndo} handleRedo={handleRedo} />
                    ) : (
                      <p className="text-center text-slate-400 mt-4">Loading whiteboard...</p>
                    )}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                      <button
                        onClick={handleSaveWhiteboard}
                        className="px-3 py-1 bg-indigo-600 rounded-md text-sm hover:bg-indigo-700 flex items-center gap-2"
                        title="Export Whiteboard"
                      >
                        <Save size={16} /> Export
                      </button>
                      <button
                        onClick={() => {
                          if (canvasContainerRef.current) {
                            if (!document.fullscreenElement) {
                              canvasContainerRef.current.requestFullscreen();
                            } else {
                              document.exitFullscreen();
                            }
                          }
                        }}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        className="p-2 bg-slate-900/50 rounded-md hover:bg-slate-700"
                      >
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "notes" && (
                  <div className="p-4 h-full flex flex-col">
                    <textarea
                      value={designNotes}
                      onChange={(e) => setDesignNotes(e.target.value)}
                      placeholder="Document high-level architecture decisions..."
                      className="w-full flex-grow bg-slate-900/50 p-4 rounded-lg border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                    />
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={async () => {
                          setIsSavingNotes(true);
                          try {
                            await setDoc(designDocRef(), { designNotes, lastUpdated: serverTimestamp() }, { merge: true });
                          } catch {
                            setError("Failed to save notes.");
                          } finally {
                            setIsSavingNotes(false);
                          }
                        }}
                        disabled={isSavingNotes}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-500"
                      >
                        {isSavingNotes && <Loader className="animate-spin mr-2" size={16} />}
                        {isSavingNotes ? "Saving..." : "Save Notes"}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "files" && (
                  <div className="p-4 space-y-6">
                    <div>
                      <label
                        htmlFor="file-upload"
                        className="w-full cursor-pointer bg-slate-700/50 hover:bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg p-8 flex flex-col items-center justify-center text-center"
                      >
                        <Upload className="h-10 w-10 text-slate-400 mb-2" />
                        <span className="font-semibold">Click to upload files</span>
                        <span className="text-xs text-slate-500">PNG, JPG, SVG, etc.</span>
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setIsUploading(true);
                          setError("");

                          const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                          const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

                          if (!cloudName || !uploadPreset) {
                            setError("Cloudinary env variables not configured.");
                            setIsUploading(false);
                            return;
                          }

                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("upload_preset", uploadPreset);
                          formData.append("folder", `rooms/${roomId}/designs`);

                          try {
                            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                              method: "POST",
                              body: formData,
                            });
                            if (!res.ok) throw new Error("Upload failed");
                            const data = await res.json();
                            const newFile = {
                              name: data.original_filename || file.name,
                              url: data.secure_url,
                              uploadedAt: new Date().toISOString(),
                            };
                            await setDoc(designDocRef(), { uploadedFiles: arrayUnion(newFile) }, { merge: true });
                            setUploadedFiles((prev) => [...prev, newFile]);
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                        disabled={isUploading}
                      />
                    </div>
                    {isUploading && (
                      <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div
                          className="bg-indigo-500 h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                    {error && <p className="text-sm text-center text-red-400">{error}</p>}

                    <div>
                      <h3 className="font-semibold mb-3">Uploaded Assets</h3>
                      {uploadedFiles.length > 0 ? (
                        <ul className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <li key={index} className="bg-slate-700/50 p-3 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileIcon className="h-5 w-5 text-slate-400" />
                                <span className="text-sm font-medium">{file.name}</span>
                              </div>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
                              >
                                Download
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No files uploaded yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignPhase;
