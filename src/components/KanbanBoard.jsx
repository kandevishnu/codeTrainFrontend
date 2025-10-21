import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import { Plus, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// --- (NEW) Import the logger and auth hook ---
import { logActivity } from "../utils/activityLogger";
import { useAuth } from "../routes/AuthContext";

// --- Task Card Component (No Changes) ---
const TaskCard = ({ task, index, onClick }) => (
  <Draggable draggableId={task.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        onClick={() => onClick(task)}
        className={`bg-slate-800 p-3 rounded-lg shadow-md mb-3 border-2 ${
          snapshot.isDragging ? "border-indigo-500" : "border-transparent"
        }`}
      >
        <p className="font-semibold text-sm text-slate-200">{task.title}</p>
        <p className="text-xs text-slate-400 mt-1 truncate">
          {task.description}
        </p>
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>Task ID: {task.id.substring(0, 4)}</span>
          {task.assigneeName && (
            <span className="flex items-center gap-1">
              <User size={12} />
              {task.assigneeName}
            </span>
          )}
        </div>
      </div>
    )}
  </Draggable>
);

// --- Kanban Column Component (No Changes) ---
const KanbanColumn = ({ column, tasks }) => (
  <div className="flex-1 min-w-[280px] bg-slate-900/50 rounded-xl p-3">
    <h3 className="font-bold text-md mb-4 px-2 text-slate-300">
      {column.title} ({tasks.length})
    </h3>
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`h-full transition-colors ${
            snapshot.isDraggingOver ? "bg-indigo-900/20" : ""
          }`}
        >
          {tasks.map((task, index) => (
            <TaskCard key={task.id} task={task} index={index} onClick={() => {}} />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </div>
);

// --- Add/Edit Task Modal (No Changes) ---
const TaskModal = ({ isOpen, onClose, members, onSave, taskData }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  useEffect(() => {
    if (taskData) {
      setTitle(taskData.title || "");
      setDescription(taskData.description || "");
      setAssigneeId(taskData.assigneeId || "");
    } else {
      setTitle("");
      setDescription("");
      setAssigneeId("");
    }
  }, [taskData]);

  const handleSave = () => {
    const assignee = members.find((m) => m.uid === assigneeId);
    onSave({
      title,
      description,
      assigneeId,
      assigneeName: assignee ? assignee.name : "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 border border-slate-700"
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{taskData ? "Edit Task" : "Add New Task"}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><X size={20} /></button>
        </div>
        <div className="space-y-4">
            <input type="text" placeholder="Task Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <textarea placeholder="Task Description" value={description} onChange={(e) => setDescription(e.target.value)} rows="4" className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Unassigned</option>
                {members.map((member) => (<option key={member.uid} value={member.uid}>{member.name}</option>))}
            </select>
        </div>
        <div className="flex justify-end mt-6">
            <button onClick={handleSave} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold">Save Task</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main Kanban Board Component (with Activity Logging) ---
const KanbanBoard = ({ members }) => {
  const { roomId } = useParams();
  const { user } = useAuth(); // (NEW) Get the current user for logging
  const [tasks, setTasks] = useState([]);
  const [columns, setColumns] = useState({
    todo: { id: "todo", title: "To Do", taskIds: [] },
    "in-progress": { id: "in-progress", title: "In Progress", taskIds: [] },
    "for-review": { id: "for-review", title: "For Review", taskIds: [] },
    done: { id: "done", title: "Done", taskIds: [] },
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const tasksColRef = collection(db, "rooms", roomId, "tasks");
    const unsubscribe = onSnapshot(tasksColRef, (snapshot) => {
      const allTasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const newColumns = {
        todo: { id: "todo", title: "To Do", taskIds: [] },
        "in-progress": { id: "in-progress", title: "In Progress", taskIds: [] },
        "for-review": { id: "for-review", title: "For Review", taskIds: [] },
        done: { id: "done", title: "Done", taskIds: [] },
      };
      allTasks.forEach((task) => {
        const normalizedStatus = (task.status || "todo").toLowerCase().replace(/\s+/g, "-");
        if (newColumns[normalizedStatus]) {
          newColumns[normalizedStatus].taskIds.push(task.id);
        } else {
          newColumns.todo.taskIds.push(task.id);
        }
      });
      setTasks(allTasks);
      setColumns(newColumns);
    });
    return () => unsubscribe();
  }, [roomId]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const start = columns[source.droppableId];
    const end = columns[destination.droppableId];

    if (start !== end) {
      const startTaskIds = Array.from(start.taskIds);
      startTaskIds.splice(source.index, 1);
      const endTaskIds = Array.from(end.taskIds);
      endTaskIds.splice(destination.index, 0, draggableId);

      setColumns((prev) => ({
        ...prev,
        [start.id]: { ...start, taskIds: startTaskIds },
        [end.id]: { ...end, taskIds: endTaskIds },
      }));

      const taskRef = doc(db, "rooms", roomId, "tasks", draggableId);
      await updateDoc(taskRef, { status: end.title });

      // --- (NEW) Log this activity ---
      const task = tasks.find(t => t.id === draggableId);
      const currentUserMemberData = members.find(m => m.uid === user.uid);
      if (task && currentUserMemberData) {
          logActivity(
              roomId,
              currentUserMemberData, // <-- Pass the full object, not just 'user'
              `moved the task "${task.title}" to ${end.title}`
          );
      }
    }
    // No logging needed for reordering within the same column
  };

  const handleSaveTask = async (taskData) => {
    try {
      const tasksColRef = collection(db, "rooms", roomId, "tasks");
      await addDoc(tasksColRef, {
        ...taskData,
        status: "To Do",
        createdAt: serverTimestamp(),
      });
      
      // --- (NEW) Log this activity ---
      const currentUserMemberData = members.find(m => m.uid === user.uid);
      if (currentUserMemberData) {
        logActivity(
            roomId,
            currentUserMemberData, // <-- Pass the full object, not just 'user'
            `created a new task titled "${taskData.title}"`
        );
      }

    } catch (err) {
      console.error("❌ Error creating task:", err);
    }
  };

  const columnOrder = ["todo", "in-progress", "for-review", "done"];

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-full">
        <div className="flex justify-end mb-2">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-500">
            <Plus size={14} /> Add Task
          </button>
        </div>

        <div className="flex flex-row flex-wrap gap-2 pb-2 min-h-[320px]">
          {columnOrder.map((columnId) => {
            const column = columns[columnId];
            if (!column) return null;
            const columnTasks = column.taskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean);
            return (<KanbanColumn key={column.id} column={column} tasks={columnTasks} />);
          })}
        </div>

        {tasks.length === 0 && (<p className="text-center text-slate-400 mt-10">No tasks found for this room.</p>)}
      </div>

      <AnimatePresence>
        <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} members={members} onSave={handleSaveTask} />
      </AnimatePresence>
    </DragDropContext>
  );
};

export default KanbanBoard;