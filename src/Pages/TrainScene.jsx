import React, { useState, useEffect, useRef } from "react";

// --- ALL COMPONENTS ---

// Wheel Component (CSS-based for individual wheel)
const Wheel = () => (
  <div className="relative w-10 h-10 bg-gray-800 rounded-full border-2 border-gray-900 shadow-lg flex items-center justify-center">
    <div className="w-5 h-5 bg-gray-600 rounded-full border border-gray-700"></div>
    <div className="absolute w-full h-1 bg-gray-700 transform rotate-45"></div>
    <div className="absolute w-full h-1 bg-gray-700 transform -rotate-45"></div>
  </div>
);

const WheelBogie = () => (
  <div className="flex justify-around w-28 h-10 items-center">
    <Wheel />
    <Wheel />
  </div>
);

const EngineCSS = () => (
  <div className="relative w-80 h-32 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg shadow-2xl overflow-hidden flex flex-col" style={{ clipPath: 'polygon(10% 0%, 100% 0%, 100% 100%, 10% 100%, 0% 50%)' }}>
    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 rounded-lg"></div>
    <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-lg shadow-inner"></div>
    <div className="absolute top-1/2 left-4 w-20 h-16 bg-gradient-to-br from-blue-300 to-blue-500 rounded-md shadow-inner border-2 border-blue-600 z-20 transform -translate-y-1/2" style={{ clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)' }}>
      <div className="absolute top-1 right-1 w-2/3 h-1/3 bg-white opacity-30 rounded-full transform rotate-45"></div>
    </div>
    <div className="absolute top-12 left-28 w-24 h-8 bg-gradient-to-br from-blue-300 to-blue-500 rounded-md shadow-inner border-2 border-blue-600">
      <div className="absolute top-1 right-1 w-2/3 h-1/3 bg-white opacity-30 rounded-full transform rotate-45"></div>
    </div>
    <div className="absolute top-12 left-56 w-24 h-8 bg-gradient-to-br from-blue-300 to-blue-500 rounded-md shadow-inner border-2 border-blue-600">
      <div className="absolute top-1 right-1 w-2/3 h-1/3 bg-white opacity-30 rounded-full transform rotate-45"></div>
    </div>
    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-yellow-300 rounded-full shadow-lg border-2 border-yellow-500 z-30">
      <div className="absolute inset-0 rounded-full bg-yellow-200 opacity-50 animate-pulse"></div>
    </div>
    <div className="absolute -bottom-8 left-8">
      <WheelBogie />
    </div>
    <div className="absolute -bottom-8 right-8">
      <WheelBogie />
    </div>
  </div>
);

const CompartmentCSS = () => (
  <div className="relative w-64 h-32 bg-gradient-to-br from-gray-200 to-gray-400 rounded-lg shadow-xl overflow-hidden flex flex-col">
    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 rounded-lg"></div>
    <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-lg shadow-inner"></div>
    <div className="absolute top-12 left-4 w-24 h-8 bg-gradient-to-br from-blue-300 to-blue-500 rounded-md shadow-inner border-2 border-blue-600">
      <div className="absolute top-1 right-1 w-2/3 h-1/3 bg-white opacity-30 rounded-full transform rotate-45"></div>
    </div>
    <div className="absolute top-12 left-32 w-24 h-8 bg-gradient-to-br from-blue-300 to-blue-500 rounded-md shadow-inner border-2 border-blue-600">
      <div className="absolute top-1 right-1 w-2/3 h-1/3 bg-white opacity-30 rounded-full transform rotate-45"></div>
    </div>
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-24 bg-gradient-to-br from-gray-500 to-gray-600 rounded-t-md shadow-inner border-t-2 border-gray-700">
      <div className="absolute inset-0 border-2 border-gray-700 rounded-t-md opacity-50"></div>
    </div>
    <div className="absolute -bottom-8 left-8">
      <WheelBogie />
    </div>
    <div className="absolute -bottom-8 right-8">
      <WheelBogie />
    </div>
  </div>
);

const EndCompartmentCSS = () => (
  <div className="relative w-80 h-32 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg shadow-2xl overflow-hidden flex flex-col" style={{ clipPath: 'polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%)' }}>
    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 rounded-lg"></div>
    <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-lg shadow-inner"></div>
    <div className="absolute top-1/2 right-4 w-20 h-16 bg-gradient-to-br from-blue-300 to-blue-500 rounded-md shadow-inner border-2 border-blue-600 z-20 transform -translate-y-1/2" style={{ clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)' }}>
      <div className="absolute top-1 right-1 w-2/3 h-1/3 bg-white opacity-30 rounded-full transform rotate-45"></div>
    </div>
    <div className="absolute top-12 left-4 w-24 h-8 bg-gradient-to-br from-blue-300 to-blue-500 rounded-md shadow-inner border-2 border-blue-600">
      <div className="absolute top-1 right-1 w-2/3 h-1/3 bg-white opacity-30 rounded-full transform rotate-45"></div>
    </div>
    <div className="absolute top-12 left-32 w-24 h-8 bg-gradient-to-br from-blue-300 to-blue-500 rounded-md shadow-inner border-2 border-blue-600">
      <div className="absolute top-1 right-1 w-2/3 h-1/3 bg-white opacity-30 rounded-full transform rotate-45"></div>
    </div>
    <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 w-10 h-10 bg-red-500 rounded-full shadow-lg border-2 border-red-700 z-30">
      <div className="absolute inset-0 rounded-full bg-red-300 opacity-50 animate-pulse"></div>
    </div>
    <div className="absolute -bottom-8 left-12">
      <WheelBogie />
    </div>
    <div className="absolute -bottom-8 right-12">
      <WheelBogie />
    </div>
  </div>
);

const Sun = () => (
  <div className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full shadow-lg" style={{ boxShadow: '0 0 40px 10px rgba(255, 255, 0, 0.7)' }}></div>
);

const Cloud = ({ style }) => (
  <div className="absolute bg-white rounded-full shadow-md" style={{ ...style, filter: 'blur(5px)', opacity: 0.8 }}>
    <div className="absolute w-1/2 h-full bg-white rounded-full top-0 left-1/4"></div>
    <div className="absolute w-2/3 h-2/3 bg-white rounded-full bottom-0 right-1/4"></div>
  </div>
);

// --- MAIN SCENE ---

const TrainSceneCSS = () => {
  const [numCompartments, setNumCompartments] = useState(3);
  const containerRef = useRef(null);
  const engineWidth = 320;
  const compartmentWidth = 256;
  const endCompartmentWidth = 320;
  const spacing = 10;
  const [trainScale, setTrainScale] = useState(1);
  const [trainPosition, setTrainPosition] = useState(0);

  useEffect(() => {
    const updateTrainPositionAndScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const currentTotalTrainCompositionWidth = engineWidth + (numCompartments * (compartmentWidth + spacing)) + (endCompartmentWidth + spacing);
        const newScale = (containerWidth * 0.9) / currentTotalTrainCompositionWidth;
        setTrainScale(newScale);
        const scaledTrainWidth = currentTotalTrainCompositionWidth * newScale;
        const newPosition = (containerWidth / 2) - (scaledTrainWidth / 2);
        setTrainPosition(newPosition);
      }
    };
    updateTrainPositionAndScale();
    window.addEventListener('resize', updateTrainPositionAndScale);
    return () => window.removeEventListener('resize', updateTrainPositionAndScale);
  }, [numCompartments]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-300 to-blue-500 font-inter p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { margin: 0; overflow: hidden; }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      <div ref={containerRef} className="w-full h-80 bg-gradient-to-b from-blue-200 to-blue-300 rounded-lg shadow-lg overflow-hidden relative border-4 border-blue-300">
        <Sun />
        <Cloud style={{ width: '120px', height: '60px', top: '20px', left: '10%' }} />
        <Cloud style={{ width: '150px', height: '70px', top: '50px', right: '15%' }} />
        <Cloud style={{ width: '100px', height: '50px', top: '80px', left: '40%' }} />

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gray-700 flex items-center justify-center">
          <div className="w-full h-2 bg-gray-800 absolute top-2"></div>
          <div className="w-full h-2 bg-gray-800 absolute bottom-2"></div>
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="absolute w-16 h-2 bg-gray-600 rounded-sm" style={{ left: `${i * 32}px` }}></div>
          ))}
        </div>

        <div className="absolute bottom-10 flex items-end" style={{ left: `${trainPosition}px`, transform: `scale(${trainScale})`, transformOrigin: 'bottom left' }}>
          <EngineCSS />
          {Array.from({ length: numCompartments }).map((_, i) => (
            <div key={i} className="ml-2"><CompartmentCSS /></div>
          ))}
          <div className="ml-2"><EndCompartmentCSS /></div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-white rounded-lg shadow-md flex items-center space-x-4">
        <label htmlFor="compartment-slider" className="text-gray-700 font-medium">
          Number of Compartments: {numCompartments}
        </label>
        <input
          id="compartment-slider"
          type="range"
          min="0"
          max="10"
          value={numCompartments}
          onChange={(e) => setNumCompartments(parseInt(e.target.value))}
          className="w-64 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
        />
      </div>
    </div>
  );
};

export default TrainSceneCSS;
