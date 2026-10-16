"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

// 1. Smooth Mathematical Teardrop Geometry
function TeardropMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const count = 48;
    for (let i = 0; i <= count; i++) {
      const t = i / count; // 0 (top) to 1 (bottom)
      // Height from tip (+1.3) down to rounded base (-0.9)
      const y = 1.3 - t * 2.2;
      // Teardrop profile equation
      const r = Math.sin(t * Math.PI) * Math.pow(t, 0.42) * 1.1;
      points.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const geom = new THREE.LatheGeometry(points, 48);
    geom.computeVertexNormals();
    return geom;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // Gentle breathing scale and subtle rotation
    const pulse = 1.0 + Math.sin(t * 2.4) * 0.025;
    meshRef.current.scale.set(pulse, pulse, pulse);
    meshRef.current.rotation.y = t * 0.4;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color="#FF2E4D"
        emissive="#590012"
        emissiveIntensity={0.6}
        roughness={0.12}
        metalness={0.15}
        clearcoat={1.0}
        clearcoatRoughness={0.06}
        reflectivity={0.95}
      />
    </mesh>
  );
}

// 2. Accurate Biconcave RBC Disc Geometry
function BiconcaveRBCMesh({ radius = 0.38, color = "#E01838" }: { radius?: number; color?: string }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const steps = 24;
    // Biconcave cross section from center to rim
    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0 to 1 (normalized radius)
      const r = t * radius;
      // Biconcave profile: thin center, thick torus ring, rounded outer edge
      const y = 0.12 * (1.0 - 0.7 * Math.exp(-4.0 * t * t)) * Math.sqrt(Math.max(0, 1.0 - t * t));
      points.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const geom = new THREE.LatheGeometry(points, 32);
    geom.computeVertexNormals();
    return geom;
  }, [radius]);

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color={color}
        emissive="#4A000A"
        roughness={0.18}
        metalness={0.1}
        clearcoat={0.8}
      />
    </mesh>
  );
}

// 3. Orbiting RBC Discs around the Drop
function OrbitingRBCs() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = -t * 0.35;
  });

  return (
    <group ref={groupRef}>
      {/* Disc 1 */}
      <group position={[1.4, 0.4, 0.3]} rotation={[0.4, 0.2, 0.8]}>
        <BiconcaveRBCMesh radius={0.34} color="#FF3B56" />
      </group>
      {/* Disc 2 */}
      <group position={[-1.3, -0.2, 0.5]} rotation={[-0.5, 0.6, -0.4]}>
        <BiconcaveRBCMesh radius={0.3} color="#E01838" />
      </group>
      {/* Disc 3 */}
      <group position={[0.2, -0.8, -1.2]} rotation={[0.8, -0.3, 0.2]}>
        <BiconcaveRBCMesh radius={0.28} color="#FF526B" />
      </group>
    </group>
  );
}

export default function HeroBloodDropCanvas({ className = "h-[420px] w-full" }: { className?: string }) {
  const [isReduced, setIsReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReduced(media.matches);
    }
  }, []);

  // Static Fallback for reduced motion or SSR
  if (!mounted || isReduced) {
    return (
      <div className={`relative flex items-center justify-center p-6 ${className}`}>
        <div className="w-56 h-72 bg-[#FF4D4D] rounded-full border-4 border-black shadow-[6px_6px_0px_#000] flex flex-col items-center justify-center text-white relative">
          <span className="text-6xl font-black mb-2">🩸</span>
          <span className="font-mono text-xs font-black uppercase tracking-wider bg-black px-2 py-0.5 text-[#FFE600]">
            LifeGrid Active
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Clean high-contrast 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0.2, 3.8], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 5, 4]} intensity={2.8} color="#FFFFFF" />
        <pointLight position={[-4, -2, -3]} intensity={1.8} color="#FF90C8" />
        <spotLight position={[0, 4, 3]} intensity={2.2} angle={0.6} penumbra={1} color="#FFE600" />

        <Float speed={2.0} rotationIntensity={0.3} floatIntensity={0.5}>
          <TeardropMesh />
          <OrbitingRBCs />
        </Float>
      </Canvas>
    </div>
  );
}
