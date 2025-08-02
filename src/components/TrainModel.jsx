import React, { Suspense, useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, OrthographicCamera, Html, Stars, Instance } from "@react-three/drei";
import { useSpring, a } from '@react-spring/three';
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import * as THREE from "three";
import { PenTool, Search, Code, Bot, Rocket, ShieldCheck, ClipboardList, Lightbulb } from "lucide-react";


const phaseIcons = {
  "Analysis": <Search size={28} className="text-cyan-300" />,
  "Design": <PenTool size={28} className="text-purple-300" />,
  "Development": <Code size={28} className="text-green-300" />,
  "Implementation": <Code size={28} className="text-green-300" />,
  "Coding": <Code size={28} className="text-green-300" />,
  "Testing": <Bot size={28} className="text-orange-300" />,
  "Deployment": <Rocket size={28} className="text-red-300" />,
  "Requirements": <ClipboardList size={28} className="text-blue-300" />,
  "Planning": <Lightbulb size={28} className="text-yellow-300" />,
  "Default": <ShieldCheck size={28} className="text-gray-300" />,
};

const getPhaseIcon = (phaseName) => {
  const matchedKey = Object.keys(phaseIcons).find(key => phaseName.includes(key));
  return phaseIcons[matchedKey] || phaseIcons.Default;
};


const PhaseAnnotation = ({ phaseName, onNavigate, position, isHovered, setIsHovered }) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleInteraction = (e) => {
    e.stopPropagation();
    if (isClicked) return;
    setIsClicked(true);
    setTimeout(() => onNavigate(), 400);
  };

  return (
    <Html center position={position}>
      <motion.div
        animate={{ y: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 20, delay: 1.2 } }}
          className="w-48 h-48 flex items-center justify-center cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleInteraction}
        >
          <motion.div
            animate={{ scale: isClicked ? 20 : 1, opacity: isClicked ? 0 : 1 }}
            transition={{ duration: 0.5, ease: [0.85, 0, 0.15, 1] }}
            className="relative flex flex-col items-center justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              className="p-4 bg-gray-900/80 backdrop-blur-sm border-2 border-white/20 rounded-full shadow-lg shadow-black/50"
            >
              {getPhaseIcon(phaseName)}
            </motion.div>
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                  exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.15, ease: "easeIn" } }}
                  className="absolute top-full mt-4 whitespace-nowrap px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg"
                >
                  {phaseName}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </Html>
  );
};


const TrainCompartment = ({ phaseName, position, geometry, material, onNavigate }) => {
    const [isHovered, setIsHovered] = useState(false);
    const glowColor = new THREE.Color("#FFD700"); 

    const { intensity, scale } = useSpring({
        intensity: isHovered ? 5.0 : 0,
        scale: isHovered ? 1.05 : 1,
        config: { tension: 300, friction: 25 }
    });

    return (
        <group position={position}>
            <a.mesh geometry={geometry} scale={scale}>
                <a.meshStandardMaterial
                    {...material}
                    emissive={glowColor}
                    emissiveIntensity={intensity}
                    toneMapped={false}
                    metalness={0.6}
                    roughness={0.4}
                />
            </a.mesh>
            <PhaseAnnotation 
                phaseName={phaseName}
                isHovered={isHovered}
                setIsHovered={setIsHovered}
                onNavigate={onNavigate} 
                position={[0, 0.5, -4.5]}
            />
        </group>
    );
};


const findFirstMesh = (nodes) => Object.values(nodes).find((node) => node.isMesh);

const Train = ({ phases, setTrainInfo, onNavigate }) => {
  const measureRef = useRef();
  const { nodes: engineNodes } = useGLTF("/models/engine.glb");
  const { nodes: compartmentNodes } = useGLTF("/models/compartment.glb");
  const { nodes: endCompartmentNodes } = useGLTF("/models/endCompartment.glb");

  const engineMesh = findFirstMesh(engineNodes);
  const compartmentMesh = findFirstMesh(compartmentNodes);
  const endCompartmentMesh = findFirstMesh(endCompartmentNodes);

  const engineLength = useMemo(() => engineMesh ? (new THREE.Box3().setFromObject(engineMesh)).max.z - (new THREE.Box3().setFromObject(engineMesh)).min.z : 5, [engineMesh]);
  const compartmentLength = useMemo(() => compartmentMesh ? (new THREE.Box3().setFromObject(compartmentMesh)).max.z - (new THREE.Box3().setFromObject(compartmentMesh)).min.z : 4, [compartmentMesh]);
  
  useLayoutEffect(() => {
    if (measureRef.current) {
      const box = new THREE.Box3().setFromObject(measureRef.current);
      setTrainInfo({
        size: box.getSize(new THREE.Vector3()),
        center: box.getCenter(new THREE.Vector3()),
      });
    }
  }, [setTrainInfo, phases, engineLength, compartmentLength]);

  const baseZ = -(engineLength / 2) + 13;
  const numPhases = Array.isArray(phases) ? phases.length : 0;
  const endCompartmentPositionZ = -(-(engineLength / 2) - 40.25 + compartmentLength * numPhases);
  
  if (!engineMesh || !compartmentMesh || !endCompartmentMesh) return null;

  return (
    <group ref={measureRef} rotation={[0, Math.PI / 2, 0]} position-y={-4}>
        <mesh geometry={engineMesh.geometry} material={engineMesh.material} />
        {phases.map((phaseName, index) => (
          <TrainCompartment
            key={phaseName + index}
            phaseName={phaseName}
            position={[0, 0, baseZ - compartmentLength * index]}
            geometry={compartmentMesh.geometry}
            material={compartmentMesh.material}
            onNavigate={() => onNavigate(phaseName)}
          />
        ))}
        <mesh geometry={endCompartmentMesh.geometry} material={endCompartmentMesh.material} position={[0, 0, endCompartmentPositionZ]} />
    </group>
  );
};


function AsteroidField({ count = 100 }) {
    const ref = useRef();
  
    const asteroidGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  
    const asteroids = useMemo(() =>
      Array.from({ length: count }).map(() => ({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200 - 50
        ),
        scale: Math.random() * 1.5 + 0.2,
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04
        ),
        rotationSpeed: new THREE.Euler(
          Math.random() * 0.01,
          Math.random() * 0.01,
          Math.random() * 0.01
        ),
      })),
    [count]);
  
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    useFrame(() => {
      if (!ref.current) return;
      asteroids.forEach((data, i) => {
        data.position.add(data.velocity);
        data.rotation.x += data.rotationSpeed.x;
        data.rotation.y += data.rotationSpeed.y;
        data.rotation.z += data.rotationSpeed.z;
  
        if (data.position.x > 100) data.position.x = -100;
        if (data.position.x < -100) data.position.x = 100;
  
        tempObject.position.copy(data.position);
        tempObject.rotation.copy(data.rotation);
        tempObject.scale.setScalar(data.scale);
        tempObject.updateMatrix();
        ref.current.setMatrixAt(i, tempObject.matrix);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    });
  
    return (
      <instancedMesh ref={ref} args={[asteroidGeometry, undefined, count]}>
        <meshStandardMaterial roughness={0.9} metalness={0.2} color="#999999" />
      </instancedMesh>
    );
  }


const AnimatedEnvironment = ({ speed }) => {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) {
      ref.current.position.x += speed.get() / 5;
    }
  });

  return (
    <group ref={ref}>
      <Stars radius={200} depth={80} count={5000} factor={4} saturation={0} fade speed={0} />
      <Stars radius={100} depth={50} count={1000} factor={7} saturation={0} fade speed={0} />
      <Suspense fallback={null}>
        <AsteroidField />
      </Suspense>
    </group>
  );
};


export default function TrainModel({ phases = [] }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [trainInfo, setTrainInfo] = useState(null);
  
  const [trainSpring, trainApi] = useSpring(() => ({
      positionX: 0,
      config: { mass: 1, tension: 25, friction: 30 }
  }));

  const { envSpeed } = useSpring({
      from: { envSpeed: 0 },
      to: { envSpeed: trainInfo ? 0 : -5 },
      config: { duration: 3000, ease: t => 1 - Math.pow(1 - t, 3) },
      delay: 200,
      immediate: !trainInfo,
  });

  const zoom = useMemo(() => {
    if (!trainInfo) return 10;
    const PADDING = 1.2;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    return (screenWidth / (trainInfo.size.x * PADDING));
  }, [trainInfo]);

  useEffect(() => {
      if (trainInfo && typeof window !== 'undefined') {
          const viewportWidth = window.innerWidth / zoom;
          const fromX = -viewportWidth / 2 - trainInfo.size.x / 2 - 10;
          const toX = -trainInfo.center.x;
          trainApi.start({ from: { positionX: fromX }, to: { positionX: toX }, delay: 200 });
      }
  }, [trainInfo, zoom, trainApi]);

  const handleNavigation = (phaseName) => {
    const formattedPhase = phaseName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/room/${roomId}/${formattedPhase}`);
  };

  return (
    <div className="w-full h-[40vh] md:h-[50vh] bg-black">
      <Canvas>
        <OrthographicCamera makeDefault position={[0, 0, 100]} zoom={zoom || 10} near={0.1} far={2000} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <pointLight position={[-10, 0, -20]} color="#FFD700" intensity={2} />
        <pointLight position={[0, 10, 0]} color="white" intensity={0.5} />
        
        <AnimatedEnvironment speed={envSpeed} />
        
        <Suspense fallback={null}>
            <a.group position-x={trainSpring.positionX}>
              <Train
                phases={phases}
                setTrainInfo={setTrainInfo}
                onNavigate={handleNavigation}
              />
            </a.group>
        </Suspense>
        <OrbitControls
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
};