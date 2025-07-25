import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import TrainScene from "./Pages/TrainScene";
import ProtectedRoute from "./routes/ProtectedRoute";
import GuestRoute from "./routes/GuestRoute";
import Dashboard from "./Pages/Dashboard";
import { AnimatePresence } from "framer-motion";

import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import LandingPage from "./Pages/LandingPage";

const App = () => {
  const location = useLocation();
  return (
    <>
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
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
        <Route path="/train" element={<TrainScene />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
      </AnimatePresence>
    </>
  );
};

export default App;
