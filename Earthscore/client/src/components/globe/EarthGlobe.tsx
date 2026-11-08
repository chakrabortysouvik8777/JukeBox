
import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  useTexture
} from "@react-three/drei";

import * as THREE from "three";

// Actual Earth sphere
function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);

  const earthTexture = useTexture(
    "/textures/earth-day.jpg"
  );

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[2, 64, 64]} />

      <meshStandardMaterial
        map={earthTexture}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

// Blue atmosphere surrounding Earth
function Atmosphere() {
  return (
    <mesh scale={1.06}>
      <sphereGeometry args={[2, 64, 64]} />

      <meshBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.13}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// Complete 3D scene
function EarthScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.7} />

      <directionalLight
        position={[5, 3, 5]}
        intensity={2}
      />

      {/* Background stars */}
      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Earth and atmosphere */}
      <Suspense fallback={null}>
        <Earth />
        <Atmosphere />
      </Suspense>

      {/* User interaction */}
      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={3}
        maxDistance={9}
        autoRotate={false}
        rotateSpeed={0.6}
      />
    </>
  );
}

function EarthGlobe() {
  return (
    <div className="w-full h-125 rounded-xl overflow-hidden bg-[#080c14]">

      <Canvas
        camera={{
          position: [0, 0, 6],
          fov: 45
        }}
        dpr={[1, 2]}
      >
        <EarthScene />
      </Canvas>

    </div>
  );
}

export default EarthGlobe;
