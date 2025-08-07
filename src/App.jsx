import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AnimatePresence } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";
import { getDatabase, ref, onValue, onDisconnect, set } from "firebase/database";
import { auth } from "./firebase";

import ProtectedRoute from "./routes/ProtectedRoute";
import GuestRoute from "./routes/GuestRoute";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import LandingPage from "./Pages/LandingPage";
import ResetPassword from "./Pages/ResetPassword";
import VerifyEmail from "./Pages/VerifyEmail";
import EmailVerified from "./Pages/EmailVerified";
import Profile from "./Pages/Profile";
import Home from "./Pages/Home";
import RoomView from "./Pages/RoomView";
import TrainModel from "./components/TrainModel";
import EmailVerifiedHandler from "./Pages/EmailVerifiedHandler";

function manageUserPresence() {
  const uid = auth.currentUser.uid;
  const db = getDatabase();
  const userStatusDatabaseRef = ref(db, '/status/' + uid);

  const isOfflineForDatabase = {
    state: 'offline',
    last_changed: serverTimestamp(),
  };

  const isOnlineForDatabase = {
    state: 'online',
    last_changed: serverTimestamp(),
  };

  // Check connection status
  onValue(ref(db, '.info/connected'), (snapshot) => {
    if (snapshot.val() === false) {
      return;
    }

    // If we lose connection, set the user's status to offline
    onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
      // When connection is re-established, set status to online
      set(userStatusDatabaseRef, isOnlineForDatabase);
    });
  });
}

const App = () => {
  const location = useLocation();

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <GuestRoute>
                <LandingPage />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <Signup />
              </GuestRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <RoomView />
              </ProtectedRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/email-verified" element={<EmailVerified />} />
          <Route path="/EmailVerifiedHandler" element={<EmailVerifiedHandler />} />
        </Routes>
      </AnimatePresence>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default App;
