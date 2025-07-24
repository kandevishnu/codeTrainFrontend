import React from "react";
import { Routes, Route } from "react-router-dom";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import TrainScene from "./Pages/TrainScene";

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<div className="flex justify-center h-screen items-center"><h1 className="text-center text-4xl bg-amber-50">Home Page</h1> </div>} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/train" element={<TrainScene />} />
      </Routes>
    </>
  );
};

export default App;
