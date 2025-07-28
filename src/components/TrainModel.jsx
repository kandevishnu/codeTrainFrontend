import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const Train = () => {
  const gltf = useGLTF("/models/bullet-train.glb");
  const trainRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const train = trainRef.current;

    if (train) {
      const speed = 5; 
      const width = 20; 
      const x = ((t * speed) % (width + 10)) - (width / 2 + 5);
      train.position.x = x;
    }
  });

  return (
    <group
      ref={trainRef}
      position={[-15, -1.2, 0]} 
      rotation={[0, Math.PI / 2, 0]} 
      scale={0.6}
    >
      <primitive object={gltf.scene} />
    </group>
  );
};

const TrainModel = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 1, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Train />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default TrainModel;
