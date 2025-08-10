import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const LandingPage = () => {
  const videoRef = useRef(null);
  const [showTitles, setShowTitles] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime > 4.6) {
        setShowTitles(true);

        video.removeEventListener("timeupdate", handleTimeUpdate);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []); 

  return (
    <div className="w-full h-dvh overflow-hidden bg-slate-900 relative">
      <video
        ref={videoRef}
        src="/train.mp4"
        autoPlay
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      />


      {showTitles && (
        <div className="absolute inset-0 bg-black/40 z-10 transition-opacity duration-1000" />
      )}

      <AnimatePresence>
        {showTitles && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4"
          >
            <motion.h1
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1 }}
              className="text-white text-4xl md:text-6xl font-bold"
            >
              Welcome to <span className="text-cyan-400">CodeTrain</span>
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="text-cyan-100 text-xl md:text-2xl mt-4 max-w-2xl"
            >
              Collaborate. Code. Conquer.
            </motion.p>

            <div className="mt-10 flex gap-6">
              <motion.div
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
              >
                <Link to="/signup">
                  <button className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-6 py-3 rounded-xl shadow">
                    Sign Up
                  </button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
              >
                <Link to="/login">
                  <button className="bg-slate-900 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl border border-cyan-500">
                    Login
                  </button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;