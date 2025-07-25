// src/components/LandingPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const LandingPage = () => {
  const videoRef = useRef(null);
  const secondSectionRef = useRef(null);

  const [showTitles, setShowTitles] = useState(false);
  const [fadeOutVideo, setFadeOutVideo] = useState(false);
  const [showSecondSection, setShowSecondSection] = useState(false);

  useEffect(() => {
    // Show title text after a delay
    const titleTimer = setTimeout(() => setShowTitles(true), 4000);

    // Fade out video
    const fadeOutTimer = setTimeout(() => setFadeOutVideo(true), 7000);

    // Scroll to second section & show login/signup
    const scrollTimer = setTimeout(() => {
      setShowSecondSection(true);
      secondSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 8000);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(scrollTimer);
    };
  }, []);

  return (
    <div className="w-full overflow-x-hidden bg-slate-900">
      {/* Video Section */}
      <div className="relative h-screen w-full overflow-hidden">
        <video
          ref={videoRef}
          src="/train.mp4"
          autoPlay
          muted
          playsInline
          className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
            fadeOutVideo ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Overlay Titles */}
        {showTitles && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 pointer-events-none">
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-white text-4xl md:text-6xl font-bold text-center"
            >
              Welcome to <span className="text-cyan-400">CodeTrain</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-cyan-100 text-xl md:text-2xl mt-4 text-center"
            >
              Collaborate. Code. Conquer.
            </motion.p>
          </div>
        )}
      </div>

      {/* Second Section with Login/Signup */}
      <section
        ref={secondSectionRef}
        className={`w-full min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 transition-opacity duration-1000 ${
          showSecondSection ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          animate={{
            opacity: showSecondSection ? 1 : 0,
            y: showSecondSection ? 0 : 50,
          }}
          transition={{ duration: 1 }}
          className="text-3xl md:text-5xl font-semibold text-center mb-6"
        >
          CodeTrain: The Future of Team Coding
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showSecondSection ? 1 : 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="text-lg md:text-xl text-center max-w-3xl mb-10 text-cyan-100"
        >
          Streamline your Software Development Life Cycle. Collaborate across
          phases — from requirements to deployment — all on a real-time platform
          designed for developers, by developers.
        </motion.p>

        <div className="flex gap-6">
          <Link to="/signup">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-6 py-3 rounded-xl shadow"
            >
              Sign Up
            </motion.button>
          </Link>
          <Link to="/login">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="bg-slate-900 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl border border-cyan-500"
          >
            Login
          </motion.button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
