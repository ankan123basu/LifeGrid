"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// 1. Teardrop: ONE LatheGeometry profile
// Points: (radius, height), t from 0 to PI:
// N=96, A=1.4, B=1.0, M=1.35
// r = B * sin(t) * pow(sin(t/2), M)
// y = A * cos(t)
// 128 radial segments, smooth normals
function TeardropMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const N = 96;
    const A = 1.4;
    const B = 1.0;
    const M = 1.35; // Tuned for authentic drop curvature

    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI;
      const r = B * Math.sin(t) * Math.pow(Math.sin(t / 2), M);
      const y = A * Math.cos(t);
      points.push(new THREE.Vector2(Math.max(0.0001, r), y));
    }

    // Reverse points so normals face outward in LatheGeometry
    points.reverse();

    const geom = new THREE.LatheGeometry(points, 128);
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
        emissiveIntensity={0.5}
        roughness={0.15}
        metalness={0.1}
        clearcoat={1.0}
        clearcoatRoughness={0.06}
        reflectivity={0.92}
      />
    </mesh>
  );
}

// 2. RBC discs: biconcave lathe profile
// For u from 0 to 1: h(u) = sqrt(1-u*u) * (c0 + 0.5006*u*u - 0.0702*u^4), c0 = 0.12
// Built as (u, h) going outward, then (u, -h) coming back.
// Scaled ~0.45 of drop, tilted 25 to 40 degrees toward camera.
function createBiconcaveRBCGeometry(radius = 0.45) {
  const points: THREE.Vector2[] = [];
  const steps = 48;
  const c0 = 0.12;

  // Outward: u from 0 to 1
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const h = Math.sqrt(Math.max(0, 1.0 - u * u)) * (c0 + 0.5006 * u * u - 0.0702 * Math.pow(u, 4));
    points.push(new THREE.Vector2(Math.max(0.0001, u * radius), h * radius));
  }

  // Returning: u from 1 back down to 0
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    const h = Math.sqrt(Math.max(0, 1.0 - u * u)) * (c0 + 0.5006 * u * u - 0.0702 * Math.pow(u, 4));
    points.push(new THREE.Vector2(Math.max(0.0001, u * radius), -h * radius));
  }

  const geom = new THREE.LatheGeometry(points, 64);
  geom.computeVertexNormals();
  return geom;
}

// 3. RBC Discs positioned via viewport coordinates to eliminate straight-edge clipping
function ViewportAwareRBCDiscs() {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const rbcGeom = useMemo(() => createBiconcaveRBCGeometry(0.44), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = -t * 0.22;
  });

  // Calculate safe X offsets from viewport so discs always stay fully visible at 1440 and 1024
  const dX = Math.min(Math.max(viewport.width * 0.28, 1.15), 1.45);

  return (
    <group ref={groupRef}>
      {/* Disc 1: Right foreground, tilted ~32° (0.55 rad) toward camera */}
      <group position={[dX, 0.3, 0.45]} rotation={[0.55, 0.25, 0.1]}>
        <mesh geometry={rbcGeom}>
          <meshPhysicalMaterial
            color="#FF4D6A"
            emissive="#4A000A"
            emissiveIntensity={0.35}
            roughness={0.16}
            metalness={0.08}
            clearcoat={0.9}
            clearcoatRoughness={0.08}
          />
        </mesh>
      </group>

      {/* Disc 2: Left lower foreground, tilted ~36° (-0.62 rad) toward camera */}
      <group position={[-dX, -0.35, 0.5]} rotation={[-0.62, -0.28, -0.15]}>
        <mesh geometry={rbcGeom}>
          <meshPhysicalMaterial
            color="#E01838"
            emissive="#4A000A"
            emissiveIntensity={0.35}
            roughness={0.16}
            metalness={0.08}
            clearcoat={0.9}
            clearcoatRoughness={0.08}
          />
        </mesh>
      </group>

      {/* Disc 3: Center-lower depth disc, tilted ~28° (0.48 rad) toward camera */}
      <group position={[dX * 0.42, -0.85, 0.35]} rotation={[0.48, -0.3, 0.2]}>
        <mesh geometry={rbcGeom}>
          <meshPhysicalMaterial
            color="#C8102E"
            emissive="#3A0008"
            emissiveIntensity={0.3}
            roughness={0.18}
            metalness={0.08}
            clearcoat={0.85}
            clearcoatRoughness={0.1}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function HeroBloodDropCanvas({
  className = "h-[450px] w-full",
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
          <span className="text-xs font-bold tracking-normal bg-black/80 px-3 py-1 rounded-full text-white">
            LifeGrid Active
          </span>
        </div>
      </div>
    );
  }

  return (
    // Bleed container wider than the column with overflow visible and pointer-events none
    <div className={`relative w-[116%] -ml-[8%] overflow-visible pointer-events-none select-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0.05, 4.4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 5, 4]} intensity={2.6} color="#FFFFFF" />
        <pointLight position={[-4, -2, 3]} intensity={1.4} color="#FF90C8" />
        <spotLight position={[0, 4, 3]} intensity={1.8} angle={0.6} penumbra={1} color="#FFE600" />

        <Environment preset="city" />

        <Float speed={1.6} rotationIntensity={0.18} floatIntensity={0.35}>
          <TeardropMesh />
          <ViewportAwareRBCDiscs />
        </Float>

        <ContactShadows
          position={[0, -1.55, 0]}
          opacity={0.35}
          scale={5.5}
          blur={2.4}
          far={3.8}
        />
      </Canvas>
    </div>
  );
}
