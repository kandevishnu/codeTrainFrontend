import React, { Suspense, useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, OrthographicCamera, Html, Stars, Instances, Instance } from "@react-three/drei";
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

// Sub-components like PhaseAnnotation, TrainCompartment, and Train are unchanged.
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
            <motion.div animate={{ y: [-3, 3, -3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                <motion.div initial={{ opacity: 0, scale: 0.5, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 20, delay: 1.2 } }} className="w-48 h-48 flex items-center justify-center cursor-pointer" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={handleInteraction}>
                    <motion.div animate={{ scale: isClicked ? 20 : 1, opacity: isClicked ? 0 : 1 }} transition={{ duration: 0.5, ease: [0.85, 0, 0.15, 1] }} className="relative flex flex-col items-center justify-center">
                        <motion.div whileHover={{ scale: 1.2 }} className="p-4 bg-gray-900/80 backdrop-blur-sm border-2 border-white/20 rounded-full shadow-lg shadow-black/50">
                            {getPhaseIcon(phaseName)}
                        </motion.div>
                        <AnimatePresence>
                            {isHovered && (
                                <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut" } }} exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.15, ease: "easeIn" } }} className="absolute top-full mt-4 whitespace-nowrap px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg">
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
                <a.meshStandardMaterial {...material} emissive={glowColor} emissiveIntensity={intensity} toneMapped={false} metalness={0.6} roughness={0.4} />
            </a.mesh>
            <PhaseAnnotation phaseName={phaseName} isHovered={isHovered} setIsHovered={setIsHovered} onNavigate={onNavigate} position={[0, 0.5, -4.5]} />
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
            setTrainInfo({ size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()), });
        }
    }, [setTrainInfo, phases, engineLength, compartmentLength]);
    const baseZ = -(engineLength / 2) + 13;
    const numPhases = Array.isArray(phases) ? phases.length : 0;
    const endCompartmentPositionZ = -(-(engineLength / 2) - 40.25 + compartmentLength * numPhases);
    if (!engineMesh || !compartmentMesh || !endCompartmentMesh) return null;
    return (
        <group ref={measureRef} rotation={[0, Math.PI / 2, 0]} position-y={-4}>
            <mesh geometry={engineMesh.geometry} material={engineMesh.material} />
            {phases.map((phaseName, index) => (<TrainCompartment key={phaseName + index} phaseName={phaseName} position={[0, 0, baseZ - compartmentLength * index]} geometry={compartmentMesh.geometry} material={compartmentMesh.material} onNavigate={() => onNavigate(phaseName)} />))}
            <mesh geometry={endCompartmentMesh.geometry} material={endCompartmentMesh.material} position={[0, 0, endCompartmentPositionZ]} />
        </group>
    );
};


// ✨ --- FINAL REALISM UPDATE --- ✨

function Asteroid({ progress }) {
    const ref = useRef();
    const velocity = useRef(new THREE.Vector3());
    const spaceSize = 150;

    // Each asteroid gets its own set of random properties for its entire lifecycle
    const { scale, slowSpeed, rotationSpeed, parallaxSpeed, initialPosition } = useMemo(() => {
        const scale = 0.5 + Math.random() * 1.5;
        return {
            scale: scale,
            initialPosition: new THREE.Vector3((Math.random() - 0.5) * spaceSize * 2, (Math.random() - 0.5) * spaceSize * 2, (Math.random() - 0.5) * spaceSize * 2),
            slowSpeed: 1 + Math.random(),
            rotationSpeed: new THREE.Euler(Math.random() * 0.2, Math.random() * 0.2, Math.random() * 0.2),
            parallaxSpeed: 20 + scale * 25,
        };
    }, []);

    // The velocity logic remains the same, switching between warp and ambient
    const warpVelocity = useMemo(() => new THREE.Vector3(-parallaxSpeed, (Math.random() - 0.5) * 10, 0), [parallaxSpeed]);
    const ambientVelocity = useMemo(() => new THREE.Vector3((Math.random() - 0.5) * slowSpeed, (Math.random() - 0.5) * slowSpeed, (Math.random() - 0.5) * slowSpeed), [slowSpeed]);
    const finalVelocity = useMemo(() => new THREE.Vector3(), []);
    
    useFrame((state, delta) => {
        if (!ref.current) return;
        finalVelocity.lerpVectors(warpVelocity, ambientVelocity, progress.get());
        ref.current.position.addScaledVector(finalVelocity, delta);
        ref.current.rotation.x += rotationSpeed.x * delta;
        ref.current.rotation.y += rotationSpeed.y * delta;
        ref.current.rotation.z += rotationSpeed.z * delta;

        // Wrap around logic
        if (ref.current.position.x > spaceSize * 1.2) ref.current.position.x = -spaceSize * 1.2;
        if (ref.current.position.x < -spaceSize * 1.2) ref.current.position.x = spaceSize * 1.2;
        if (ref.current.position.y > spaceSize) ref.current.position.y = -spaceSize;
        if (ref.current.position.y < -spaceSize) ref.current.position.y = spaceSize;
        if (ref.current.position.z > spaceSize) ref.current.position.z = -spaceSize;
        if (ref.current.position.z < -spaceSize) ref.current.position.z = spaceSize;
    });

    // The 'color' prop is removed from Instance, as it's now handled by the parent material
    return (
        <Instance ref={ref} scale={scale} position={initialPosition} />
    );
}

function AsteroidField({ count = 200, progress }) {
    // ✨ NEW GEOMETRY ✨
    // We create one, single, lumpy, irregular rock shape and share it among all instances.
    const asteroidGeometry = useMemo(() => {
        const baseGeometry = new THREE.SphereGeometry(1, 24, 24); // Start with a more detailed sphere
        const vertices = baseGeometry.attributes.position.array;
        // Go through each vertex and move it randomly to create an irregular surface
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];
            const displacement = 0.2 * Math.random(); // How lumpy it is
            const vec = new THREE.Vector3(x, y, z).normalize().multiplyScalar(displacement);
            vertices[i] = x + vec.x;
            vertices[i + 1] = y + vec.y;
            vertices[i + 2] = z + vec.z;
        }
        baseGeometry.computeVertexNormals(); // Recalculate lighting normals
        return baseGeometry;
    }, []);

    return (
        <Instances limit={count} geometry={asteroidGeometry}>
            {/* ✨ NEW MATERIAL ✨ - Single, consistent color for all asteroids */}
            <meshStandardMaterial roughness={0.9} metalness={0.2} color="#888888" />
            {Array.from({ length: count }).map((_, i) => (
                <Asteroid key={i} progress={progress} />
            ))}
        </Instances>
    );
}

const PanningStars = ({ speed }) => {
    const ref = useRef();
    useFrame(() => { if (ref.current) { ref.current.position.x = speed.get(); } });
    return (
        <group ref={ref}>
            <Stars radius={300} depth={100} count={10000} factor={5} saturation={0} fade speed={0} />
            <Stars radius={200} depth={80} count={5000} factor={7} saturation={0} fade speed={0} />
            <Stars radius={100} depth={50} count={2500} factor={10} saturation={0} fade speed={0} />
        </group>
    );
};

export default function TrainModel({ phases = [] }) {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [trainInfo, setTrainInfo] = useState(null);

    const { progress } = useSpring({
        from: { progress: 0 },
        to: { progress: trainInfo ? 1 : 0 },
        config: { duration: 4000, easing: t => 1 - Math.pow(1 - t, 4) },
        delay: 200,
    });

    const [fromX, toX, zoom] = useMemo(() => {
        if (!trainInfo) return [0, 0, 10];
        const PADDING = 1.2;
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const calculatedZoom = screenWidth / (trainInfo.size.x * PADDING);
        const viewportWidth = window.innerWidth / calculatedZoom;
        const from = -viewportWidth / 2 - trainInfo.size.x / 2 - 10;
        const to = -trainInfo.center.x;
        return [from, to, calculatedZoom];
    }, [trainInfo]);

    const trainPositionX = progress.to(p => fromX + (toX - fromX) * p);
    const starPanningX = progress.to(p => p * 50);

    const handleNavigation = (phaseName) => {
        const formattedPhase = phaseName.toLowerCase().replace(/\s+/g, '-');
        navigate(`/room/${roomId}/${formattedPhase}`);
    };

    return (
        <div className="w-full h-[40vh] md:h-[50vh]">
            <Canvas
                gl={{ alpha: true }}
                onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}
            >
                <OrthographicCamera makeDefault position={[0, 0, 100]} zoom={zoom} near={0.1} far={2000} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <pointLight position={[-10, 0, -20]} color="#FFD700" intensity={2} />
                <pointLight position={[0, 10, 0]} color="white" intensity={0.5} />
                <PanningStars speed={starPanningX} />
                <Suspense fallback={null}>
                    <AsteroidField progress={progress} />
                </Suspense>
                <Suspense fallback={null}>
                    <a.group position-x={trainPositionX} visible={!!trainInfo}>
                        <Train
                            phases={phases}
                            setTrainInfo={setTrainInfo}
                            onNavigate={handleNavigation}
                        />
                    </a.group>
                </Suspense>
                <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} />
            </Canvas>
        </div>
    );
};