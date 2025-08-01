import React, { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useSpring, a } from '@react-spring/three';
import * as THREE from "three";

const findFirstMesh = (nodes) => {
  return Object.values(nodes).find((node) => node.isMesh);
};

const Train = ({ phases, setTrainInfo, scale, animatedPosition }) => {
  const measureRef = useRef();

  const { nodes: engineNodes } = useGLTF("/models/engine.glb");
  const { nodes: compartmentNodes } = useGLTF("/models/compartment.glb");
  const { nodes: endCompartmentNodes } = useGLTF("/models/endCompartment.glb");

  const engineMesh = findFirstMesh(engineNodes);
  const compartmentMesh = findFirstMesh(compartmentNodes);
  const endCompartmentMesh = findFirstMesh(endCompartmentNodes);

  const engineLength = useMemo(() => {
    if (!engineMesh) return 5;
    const box = new THREE.Box3().setFromObject(engineMesh);
    return box.max.z - box.min.z;
  }, [engineMesh]);

  const compartmentLength = useMemo(() => {
    if (!compartmentMesh) return 4;
    const box = new THREE.Box3().setFromObject(compartmentMesh);
    return box.max.z - box.min.z;
  }, [compartmentMesh]);

  useEffect(() => {
    if (measureRef.current) {
      const box = new THREE.Box3().setFromObject(measureRef.current);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      setTrainInfo({ size, center });
    }
  }, [phases, engineLength, compartmentLength, setTrainInfo, scale]);


  const baseZ = -(engineLength / 2) + 13;

  const phaseCompartments = useMemo(() => {
    if (!phases || !compartmentMesh) return null;
    return phases.map((phase, index) => {
      const positionZ = baseZ - compartmentLength * index;
      return (
        <mesh
          key={`${phase}-${index}`}
          geometry={compartmentMesh.geometry}
          material={compartmentMesh.material}
          position={[0, 0, positionZ]}
        />
      );
    });
  }, [phases, compartmentMesh, baseZ, compartmentLength]);

  const endCompartmentPositionZ = useMemo(() => {
    return -(-(engineLength / 2) - 40.25 + compartmentLength * phases.length);
  }, [phases.length, engineLength, compartmentLength]);


  if (!engineMesh || !endCompartmentMesh) return null;

  return (
    <a.group position-x={animatedPosition}>
      <group ref={measureRef} rotation={[0, Math.PI / 2, 0]} scale={scale}>
        <mesh geometry={engineMesh.geometry} material={engineMesh.material} />
        {phaseCompartments}
        <mesh
          geometry={endCompartmentMesh.geometry}
          material={endCompartmentMesh.material}
          position={[0, 0, endCompartmentPositionZ]}
        />
      </group>
    </a.group>
  );
};

const TrainModel = ({ phases = [] }) => {
  const [trainInfo, setTrainInfo] = useState(null);

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { positionX } = useSpring({
    from: { positionX: -150 },
    to: { positionX: trainInfo ? -trainInfo.center.x : -150 },
    config: { mass: 1, tension: 20, friction: 20 },
    delay: 500,
  });

  const zoom = useMemo(() => {
    if (!trainInfo) return 10; 
    const padding = 1.2;
    const effectiveWidth = Math.max(trainInfo.size.x, 25);
    const effectiveHeight = Math.max(trainInfo.size.y, 5);

    if (!windowSize.width || !windowSize.height) return 10;
    const canvasPixelHeight = windowSize.height * 0.4;
    const zoomX = windowSize.width / (effectiveWidth * padding);
    const zoomY = canvasPixelHeight / (effectiveHeight * padding);

    return Math.min(zoomX, zoomY);
  }, [trainInfo, windowSize]);

  return (
    <div className="w-full h-[30vh] md:h-[40vh] lg:h-[50vh] cursor-grab active:cursor-grabbing">
      <Canvas>
        <OrthographicCamera
          makeDefault
          position={[0, 2, 100]}
          zoom={zoom}
          near={0.1}
          far={1000}
        />
        <ambientLight intensity={1.5} color="#ffffff" />
        <directionalLight
            position={[15, 20, 10]}
            intensity={2.0}
            color="#ffffff"
            castShadow
        />
        <Suspense fallback={null}>
          <Train
            phases={phases}
            setTrainInfo={setTrainInfo}
            scale={0.8}
            animatedPosition={positionX}
          />
        </Suspense>
        <OrbitControls
          target={new THREE.Vector3(0, 0, 0)}
          enableRotate={false}
          enableZoom={true}
          enablePan={true}
          minZoom={10}
          maxZoom={150}
        />
      </Canvas>
    </div>
  );
};

export default TrainModel;
