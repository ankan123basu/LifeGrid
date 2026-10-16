"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Custom Biconcave Erythrocyte (Red Blood Cell) Geometry
function ErythrocyteMesh({ scale = 1 }: { scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate biconcave disc geometry:
  // Mathematical formula for erythrocyte cross section:
  // z(r) = sqrt(1 - r^2) * (c0 + c1 * r^2 + c2 * r^4)
  const geometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(1.6, 1.6, 0.45, 64, 16);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = Math.sqrt(v.x * v.x + v.z * v.z) / 1.6;
      if (r <= 1.0) {
        // Dimple the center (biconcave dip)
        const dip = 1.0 - 0.75 * Math.exp(-3.5 * r * r);
        v.y *= dip;
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    // Heartbeat pulsation: double beat (lub-dub)
    const beat = Math.sin(t * 3.5) * Math.sin(t * 7.0);
    const pulse = 1.0 + Math.max(0, beat) * 0.08;

    meshRef.current.scale.set(scale * pulse, scale * pulse, scale * pulse);
    meshRef.current.rotation.x = Math.sin(t * 0.4) * 0.3 + 0.4;
    meshRef.current.rotation.y += 0.012;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color="#D61A3C"
        emissive="#59000D"
        roughness={0.15}
        metalness={0.2}
        clearcoat={0.9}
        clearcoatRoughness={0.1}
        reflectivity={0.9}
      />
    </mesh>
  );
}

// Hemoglobin micro-particles orbiting the erythrocyte
function HemoglobinCloud({ count = 45 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sc = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = 2.4 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      sc[i] = 0.04 + Math.random() * 0.06;
    }
    return [pos, sc];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    pointsRef.current.rotation.y = t * 0.15;
    pointsRef.current.rotation.x = Math.sin(t * 0.1) * 0.2;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#FF90C8"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function BloodCellCanvas({ className = "h-80 w-full" }: { className?: string }) {
  return (
    <div className={`relative border-3 border-black bg-neutral-950 overflow-hidden shadow-[4px_4px_0px_0px_#000] ${className}`}>
      {/* Neo-brutalist badge */}
      <div className="absolute top-3 left-3 z-10 bg-[#FFE600] border-2 border-black px-2.5 py-1 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
        3D Bio-Sim • Erythrocyte
      </div>

      <Canvas
        camera={{ position: [0, 1.8, 4.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 6, 4]} intensity={2.2} color="#FFF2F2" />
        <pointLight position={[-4, -3, -2]} intensity={1.5} color="#FF90C8" />
        <spotLight position={[0, 4, 2]} angle={0.6} penumbra={1} intensity={2.5} color="#FFE600" />

        <Float speed={2} rotationIntensity={0.6} floatIntensity={0.8}>
          <ErythrocyteMesh scale={1.15} />
          <HemoglobinCloud count={50} />
        </Float>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.8}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}
