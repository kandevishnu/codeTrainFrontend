import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from 'three'; // Import THREE for advanced geometries/materials

// Reusable Wheel Component
const Wheel = ({ position }) => (
  <mesh position={position}>
    <cylinderGeometry args={[0.3, 0.3, 0.15, 16]} /> {/* args: radiusTop, radiusBottom, height, radialSegments */}
    <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
  </mesh>
);

// Engine Component
const Engine = ({ position }) => (
  <group position={position}>
    {/* Main Body */}
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[3, 1.2, 1.2]} /> {/* Length, Height, Width */}
      <meshStandardMaterial color="#8B0000" metalness={0.6} roughness={0.3} /> {/* Dark Red */}
    </mesh>

    {/* Front Nose (more rounded) */}
    <mesh position={[1.6, 0.2, 0]}>
      <coneGeometry args={[0.7, 1.0, 16]} /> {/* radius, height, radialSegments */}
      <meshStandardMaterial color="#8B0000" metalness={0.6} roughness={0.3} />
    </mesh>

    {/* Cabin */}
    <mesh position={[-1.0, 0.7, 0]}>
      <boxGeometry args={[1.5, 1.5, 1.2]} />
      <meshStandardMaterial color="#5e5e5e" metalness={0.7} roughness={0.2} />
    </mesh>

    {/* Cabin Windows */}
    <mesh position={[-0.5, 0.7, 0.61]}>
      <boxGeometry args={[0.8, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" /> {/* Light Blue for glass */}
    </mesh>
    <mesh position={[-1.5, 0.7, 0.61]}>
      <boxGeometry args={[0.8, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" />
    </mesh>
     <mesh position={[-1.0, 0.7, -0.61]}>
      <boxGeometry args={[0.8, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" />
    </mesh>

    {/* Chimney */}
    <mesh position={[0.8, 1.0, 0]}>
      <cylinderGeometry args={[0.2, 0.3, 0.8, 12]} />
      <meshStandardMaterial color="#333" />
    </mesh>

    {/* Wheels for Engine */}
    <Wheel position={[-1.0, -0.6, 0.6]} />
    <Wheel position={[-1.0, -0.6, -0.6]} />
    <Wheel position={[0.5, -0.6, 0.6]} />
    <Wheel position={[0.5, -0.6, -0.6]} />
    <Wheel position={[1.5, -0.6, 0.6]} />
    <Wheel position={[1.5, -0.6, -0.6]} />
  </group>
);

// Compartment Component
const Compartment = ({ position }) => (
  <group position={position}>
    {/* Main Body */}
    <mesh>
      <boxGeometry args={[2.5, 1.2, 1.2]} /> {/* Length, Height, Width */}
      <meshStandardMaterial color="#c0c0c0" metalness={0.4} roughness={0.5} />
    </mesh>

    {/* Windows */}
    <mesh position={[-0.8, 0.2, 0.61]}>
      <boxGeometry args={[0.6, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" />
    </mesh>
    <mesh position={[0, 0.2, 0.61]}>
      <boxGeometry args={[0.6, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" />
    </mesh>
    <mesh position={[0.8, 0.2, 0.61]}>
      <boxGeometry args={[0.6, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" />
    </mesh>

    {/* Doors */}
    <mesh position={[-1.2, 0, 0.61]}>
      <boxGeometry args={[0.4, 1.0, 0.05]} />
      <meshStandardMaterial color="#7b7b7b" />
    </mesh>
    <mesh position={[1.2, 0, 0.61]}>
      <boxGeometry args={[0.4, 1.0, 0.05]} />
      <meshStandardMaterial color="#7b7b7b" />
    </mesh>

    {/* Wheels for Compartment */}
    <Wheel position={[-0.8, -0.6, 0.6]} />
    <Wheel position={[-0.8, -0.6, -0.6]} />
    <Wheel position={[0.8, -0.6, 0.6]} />
    <Wheel position={[0.8, -0.6, -0.6]} />

    {/* Coupling (front) */}
    <mesh position={[-1.35, -0.2, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} />
      <meshStandardMaterial color="#444" />
    </mesh>
    {/* Coupling (back) */}
    <mesh position={[1.35, -0.2, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} />
      <meshStandardMaterial color="#444" />
    </mesh>
  </group>
);

// End Compartment Component
const EndCompartment = ({ position }) => (
  <group position={position}>
    {/* Main Body (similar to regular compartment) */}
    <mesh>
      <boxGeometry args={[2.5, 1.2, 1.2]} />
      <meshStandardMaterial color="#7b7b7b" metalness={0.5} roughness={0.4} />
    </mesh>

    {/* Windows */}
    <mesh position={[-0.8, 0.2, 0.61]}>
      <boxGeometry args={[0.6, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" />
    </mesh>
    <mesh position={[0, 0.2, 0.61]}>
      <boxGeometry args={[0.6, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" />
    </mesh>
    <mesh position={[0.8, 0.2, 0.61]}>
      <boxGeometry args={[0.6, 0.6, 0.05]} />
      <meshStandardMaterial color="#ADD8E6" />
    </mesh>

    {/* Doors */}
    <mesh position={[-1.2, 0, 0.61]}>
      <boxGeometry args={[0.4, 1.0, 0.05]} />
      <meshStandardMaterial color="#555" />
    </mesh>
    <mesh position={[1.2, 0, 0.61]}>
      <boxGeometry args={[0.4, 1.0, 0.05]} />
      <meshStandardMaterial color="#555" />
    </mesh>

    {/* Wheels for End Compartment */}
    <Wheel position={[-0.8, -0.6, 0.6]} />
    <Wheel position={[-0.8, -0.6, -0.6]} />
    <Wheel position={[0.8, -0.6, 0.6]} />
    <Wheel position={[0.8, -0.6, -0.6]} />

    {/* Coupling (front) */}
    <mesh position={[-1.35, -0.2, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} />
      <meshStandardMaterial color="#444" />
    </mesh>

    {/* Back Light/Detail */}
    <mesh position={[1.3, 0.2, 0.61]}>
      <boxGeometry args={[0.3, 0.3, 0.05]} />
      <meshStandardMaterial color="red" />
    </mesh>
  </group>
);

// Main Train Group with Animation
const MovingTrain = ({ numCompartments }) => {
  const trainRef = useRef();
  const [xPos, setXPos] = useState(-25); // Start further left
  const [zoomLevel, setZoomLevel] = useState(15);
  const [zooming, setZooming] = useState(false);

  useFrame((state) => {
    // Move train from left to center
    if (xPos < 0) {
      const newX = xPos + 0.15; // Slower movement
      setXPos(newX);
      trainRef.current.position.x = newX;
    } else if (!zooming) {
      // Start zooming when train is centered
      setZooming(true);
    }

    // Zoom the camera in smoothly
    if (zooming && state.camera.position.z > 7) {
      const newZoom = state.camera.position.z - 0.05; // Slower zoom
      state.camera.position.z = newZoom;
      setZoomLevel(newZoom);
    }
  });

  // Calculate the total length of the train to position components correctly
  const engineLength = 3.0; // Approximate length of the engine
  const compartmentLength = 2.5; // Approximate length of a compartment
  const spacing = 0.1; // Small gap between components

  return (
    <group ref={trainRef}>
      <Engine position={[0, 0, 0]} />
      {Array.from({ length: numCompartments }).map((_, i) => (
        <Compartment
          key={i}
          position={[
            engineLength / 2 + (i * (compartmentLength + spacing)) + compartmentLength / 2 + spacing,
            0,
            0,
          ]}
        />
      ))}
      <EndCompartment
        position={[
          engineLength / 2 + (numCompartments * (compartmentLength + spacing)) + compartmentLength / 2 + spacing,
          0,
          0,
        ]}
      />
    </group>
  );
};

// Scene Setup
const TrainScene = () => {
  const [numCompartments, setNumCompartments] = useState(3); // Default number of compartments

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-inter">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body {
            margin: 0;
            overflow: hidden; /* Prevent scrolling due to canvas */
          }
        `}
      </style>
      <div className="w-full h-[70vh] rounded-lg overflow-hidden shadow-lg bg-white">
        <Canvas camera={{ position: [0, 2, 15], fov: 60 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <directionalLight position={[-10, -10, -5]} intensity={0.8} />
          <MovingTrain numCompartments={numCompartments} />
          {/* OrbitControls for debugging/inspection, uncomment if needed */}
          {/* <OrbitControls /> */}
        </Canvas>
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

export default TrainScene;
