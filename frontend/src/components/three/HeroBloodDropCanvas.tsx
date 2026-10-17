"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

// 1. True Mathematical Teardrop Geometry
// Spherical bottom hemisphere curving seamlessly into an elegant tapered apex
function TeardropMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const R = 0.88;
    const yCenter = -0.2;
    const yTip = 1.35;

    // Bottom spherical cap (south pole up to equator)
    const hemiSteps = 32;
    for (let i = 0; i <= hemiSteps; i++) {
      const theta = (i / hemiSteps) * (Math.PI / 2); // 0 (pole) to PI/2 (equator)
      const r = R * Math.sin(theta);
      const y = yCenter - R * Math.cos(theta);
      points.push(new THREE.Vector2(Math.max(0.001, r), y));
    }

    // Tapered top profile from equator up to apex tip
    const taperSteps = 36;
    for (let i = 1; i <= taperSteps; i++) {
      const u = i / taperSteps; // 0 (equator) to 1 (apex)
      const y = yCenter + u * (yTip - yCenter);
      // Elegant graceful concave taper ending at needle tip
      const r = R * (1 - u) * (1 - 0.28 * u * (1 - u));
      points.push(new THREE.Vector2(Math.max(0.001, r), y));
    }

    const geom = new THREE.LatheGeometry(points, 64);
    geom.computeVertexNormals();
    return geom;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // Gentle natural heartbeat pulse
    const pulse = 1.0 + Math.sin(t * 2.2) * 0.02;
    meshRef.current.scale.set(pulse, pulse, pulse);
    meshRef.current.rotation.y = t * 0.35;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color="#E23744"
        emissive="#590012"
        emissiveIntensity={0.65}
        roughness={0.12}
        metalness={0.15}
        clearcoat={1.0}
        clearcoatRoughness={0.06}
        reflectivity={0.95}
      />
    </mesh>
  );
}

// 2. Accurate Biconcave RBC Disc Geometry (Enlarged and facing camera)
function BiconcaveRBCMesh({ radius = 0.44, color = "#E01838" }: { radius?: number; color?: string }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const steps = 28;
    // Biconcave cross section from center dimple to rounded thick rim
    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0 to 1 (normalized radius)
      const r = t * radius;
      // Authentic erythrocyte formula: thin center dimple, thickened doughnut torus, smooth rim
      const y = 0.14 * (1.0 - 0.65 * Math.exp(-3.5 * t * t)) * Math.sqrt(Math.max(0, 1.0 - t * t));
      points.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const geom = new THREE.LatheGeometry(points, 40);
    geom.computeVertexNormals();
    return geom;
  }, [radius]);

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color={color}
        emissive="#4A000A"
        emissiveIntensity={0.4}
        roughness={0.18}
        metalness={0.1}
        clearcoat={0.8}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

// 3. Two Large RBC Discs Tilted ~35° Toward Camera (fully inside canvas with padding)
function TiltedRBCDiscs() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Gentle counter-orbit
    groupRef.current.rotation.y = -t * 0.25;
  });

  return (
    <group ref={groupRef}>
      {/* Disc 1: Right foreground, tilted ~35° (0.61 rad) toward camera */}
      <group position={[1.3, 0.2, 0.35]} rotation={[0.61, 0.25, 0.15]}>
        <BiconcaveRBCMesh radius={0.44} color="#FF3B56" />
      </group>

      {/* Disc 2: Left lower foreground, tilted ~35° (-0.61 rad) toward camera */}
      <group position={[-1.25, -0.3, 0.35]} rotation={[-0.61, -0.3, -0.2]}>
        <BiconcaveRBCMesh radius={0.4} color="#E01838" />
      </group>
    </group>
  );
}

export default function HeroBloodDropCanvas({
  className = "h-[420px] w-full",
}: {
  className?: string;
}) {
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
        <div className="w-52 h-64 bg-[#E23744] rounded-full border-4 border-white shadow-xl flex flex-col items-center justify-center text-white relative">
          <span className="text-6xl font-black mb-2">🩸</span>
          <span className="font-mono text-xs font-black uppercase tracking-wider bg-black/80 px-3 py-1 rounded-full text-white">
            LifeGrid Active
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* 3D Canvas with generous padding to prevent edge clipping */}
      <Canvas
        camera={{ position: [0, 0.1, 4.2], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 5, 4]} intensity={2.8} color="#FFFFFF" />
        <pointLight position={[-4, -2, 3]} intensity={1.5} color="#FF90C8" />
        <spotLight position={[0, 4, 3]} intensity={2.0} angle={0.6} penumbra={1} color="#FFE600" />

        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.4}>
          <TeardropMesh />
          <TiltedRBCDiscs />
        </Float>
      </Canvas>
    </div>
  );
}
