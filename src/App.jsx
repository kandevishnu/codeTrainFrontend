import React, { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
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

// Layouts and Skeletons
import SidebarLayout from "./components/SidebarLayout";
import DashboardSkeleton from "./Pages/DashboardSkeleton";
import ProtectedRoute from "./routes/ProtectedRoute";
import GuestRoute from "./routes/GuestRoute";

// Page Components - Lazy Loaded
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

// Generic skeleton for page content
const GenericContentSkeleton = () => (
  <div className="h-full w-full bg-slate-900 p-8">
    <div className="w-1/2 h-12 bg-slate-700 rounded-md animate-pulse mb-4"></div>
    <div className="w-3/4 h-8 bg-slate-700 rounded-md animate-pulse"></div>
  </div>
);

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

  return (
    <InviteProvider>
      <AnimatePresence mode="wait">
        <Routes location={location}>
          {/* Guest Routes (No Sidebar) */}
          <Route
            path="/"
            element={
              <GuestRoute>
                <Suspense fallback={<div className="w-full h-screen bg-slate-900" />}>
                  <LandingPage />
                </Suspense>
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <Suspense fallback={<div className="w-full h-screen bg-slate-900" />}>
                  <Signup />
                </Suspense>
              </GuestRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Suspense fallback={<div className="w-full h-screen bg-slate-900" />}>
                  <Login />
                </Suspense>
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <Suspense fallback={<div className="w-full h-screen bg-slate-900" />}>
                <ResetPassword />
              </Suspense>
            }
          />
          <Route
            path="/verify-email"
            element={
              <Suspense fallback={<div className="w-full h-screen bg-slate-900" />}>
                <VerifyEmail />
              </Suspense>
            }
          />
          <Route
            path="/email-verified"
            element={
              <Suspense fallback={<div className="w-full h-screen bg-slate-900" />}>
                <EmailVerified />
              </Suspense>
            }
          />
          <Route
            path="/EmailVerifiedHandler"
            element={
              <Suspense fallback={<div className="w-full h-screen bg-slate-900" />}>
                <EmailVerifiedHandler />
              </Suspense>
            }
          />

          {/* Protected Routes - Keep Sidebar persistent */}
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

          {/* Separate route without sidebar */}
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <Suspense fallback={<GenericContentSkeleton />}>
                  <RoomView />
                </Suspense>
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
