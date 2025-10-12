import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AnimatePresence } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";
import {
  getDatabase,
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
} from "firebase/database";
import { auth } from "./firebase";
import { InviteProvider } from "./context/InviteContext";

import SidebarLayout from "./components/SidebarLayout";
import DashboardSkeleton from "./Pages/DashboardSkeleton";
import ProtectedRoute from "./routes/ProtectedRoute";
import GuestRoute from "./routes/GuestRoute";

// Lazy load all pages for better performance
const Signup = lazy(() => import("./Pages/Signup"));
const Login = lazy(() => import("./Pages/Login"));
const Dashboard = lazy(() => import("./Pages/Dashboard"));
const LandingPage = lazy(() => import("./Pages/LandingPage"));
const ResetPassword = lazy(() => import("./Pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./Pages/VerifyEmail"));
const EmailVerified = lazy(() => import("./Pages/EmailVerified"));
const Profile = lazy(() => import("./Pages/Profile"));
const Home = lazy(() => import("./Pages/Home"));
const RoomView = lazy(() => import("./Pages/RoomView"));
const EmailVerifiedHandler = lazy(() => import("./Pages/EmailVerifiedHandler"));
const Invites = lazy(() => import("./Pages/Invites"));
const ProjectSettings = lazy(() => import("./components/room/ProjectSettings"));

// Lazy load phase components
const PlanningPhase = lazy(() => import("./components/room/PlanningPhase"));
const AnalysisPhase = lazy(() => import("./components/room/AnalysisPhase"));
const DesignPhase = lazy(() => import("./components/room/DesignPhase"));
const DevelopmentPhase = lazy(() =>
  import("./components/room/DevelopmentPhase")
);
const TestingPhase = lazy(() => import("./components/room/TestingPhase"));
const DeploymentPhase = lazy(() => import("./components/room/DeploymentPhase"));
const MaintenancePhase = lazy(() =>
  import("./components/room/MaintenancePhase")
);

const GenericContentSkeleton = () => (
  <div className="h-full w-full bg-slate-900 p-8">
    <div className="w-1/2 h-12 bg-slate-700 rounded-md animate-pulse mb-4"></div>
    <div className="w-3/4 h-8 bg-slate-700 rounded-md animate-pulse"></div>
  </div>
);

// This function can be moved to a separate utility file (e.g., 'firebase/presence.js')
function manageUserPresence() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const db = getDatabase();
  const userStatusDatabaseRef = ref(db, "/status/" + uid);

  const isOfflineForDatabase = {
    state: "offline",
    last_changed: serverTimestamp(),
  };
  const isOnlineForDatabase = {
    state: "online",
    last_changed: serverTimestamp(),
  };

  onValue(ref(db, ".info/connected"), (snapshot) => {
    if (snapshot.val() === false) return;
    onDisconnect(userStatusDatabaseRef)
      .set(isOfflineForDatabase)
      .then(() => {
        set(userStatusDatabaseRef, isOnlineForDatabase);
      });
  });
}

const App = () => {
  const location = useLocation();

  // Call presence management on app load
  useEffect(() => {
    manageUserPresence();
  }, [auth.currentUser]);

  return (
    <InviteProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <GuestRoute>
                <Suspense
                  fallback={<div className="w-full h-screen bg-slate-900" />}
                >
                  <LandingPage />
                </Suspense>
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <Suspense
                  fallback={<div className="w-full h-screen bg-slate-900" />}
                >
                  <Signup />
                </Suspense>
              </GuestRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Suspense
                  fallback={<div className="w-full h-screen bg-slate-900" />}
                >
                  <Login />
                </Suspense>
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <Suspense
                fallback={<div className="w-full h-screen bg-slate-900" />}
              >
                <ResetPassword />
              </Suspense>
            }
          />
          <Route
            path="/verify-email"
            element={
              <Suspense
                fallback={<div className="w-full h-screen bg-slate-900" />}
              >
                <VerifyEmail />
              </Suspense>
            }
          />
          <Route
            path="/email-verified"
            element={
              <Suspense
                fallback={<div className="w-full h-screen bg-slate-900" />}
              >
                <EmailVerified />
              </Suspense>
            }
          />
          <Route
            path="/EmailVerifiedHandler"
            element={
              <Suspense
                fallback={<div className="w-full h-screen bg-slate-900" />}
              >
                <EmailVerifiedHandler />
              </Suspense>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <SidebarLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<DashboardSkeleton />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="/home"
              element={
                <Suspense fallback={<GenericContentSkeleton />}>
                  <Home />
                </Suspense>
              }
            />
            <Route
              path="/invites"
              element={
                <Suspense fallback={<GenericContentSkeleton />}>
                  <Invites />
                </Suspense>
              }
            />
            <Route
              path="/profile"
              element={
                <Suspense fallback={<GenericContentSkeleton />}>
                  <Profile />
                </Suspense>
              }
            />
          </Route>

          {/* --- NESTED ROUTE SETUP FOR PROJECT ROOM --- */}
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <Suspense fallback={<GenericContentSkeleton />}>
                  <RoomView />
                </Suspense>
              </ProtectedRoute>
            }
          ></Route>
          <Route
            path="room/:roomId/planning"
            element={
              <ProtectedRoute>
                <PlanningPhase />
              </ProtectedRoute>
            }
          />
          <Route
            path="room/:roomId/design"
            element={
              <ProtectedRoute>
                <DesignPhase />
              </ProtectedRoute>
            }
          />
          <Route
            path="room/:roomId/analysis"
            element={
              <ProtectedRoute>
                <AnalysisPhase />
              </ProtectedRoute>
            }
          />
          <Route
            path="room/:roomId/deployment"
            element={
              <ProtectedRoute>
                <DeploymentPhase />
              </ProtectedRoute>
            }
          />
          <Route
            path="room/:roomId/development"
            element={
              <ProtectedRoute>
                <DevelopmentPhase />
              </ProtectedRoute>
            }
          />
          <Route
            path="room/:roomId/maintenance"
            element={
              <ProtectedRoute>
                <MaintenancePhase />
              </ProtectedRoute>
            }
          />
          <Route
            path="room/:roomId/implementation"
            element={
              <ProtectedRoute>
                <DevelopmentPhase />
              </ProtectedRoute>
            }
          />
          <Route
            path="room/:roomId/testing"
            element={
              <ProtectedRoute>
                <TestingPhase />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>

      <ToastContainer position="top-right" autoClose={3000} />
    </InviteProvider>
  );
};

export default App;
