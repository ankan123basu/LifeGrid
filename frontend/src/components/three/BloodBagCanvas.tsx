"use client";

import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float } from "@react-three/drei";
import * as THREE from "three";

function BloodBagMesh({ bloodGroup = "O-" }: { bloodGroup?: string }) {
  const bagRef = useRef<THREE.Group>(null);
  const liquidRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!bagRef.current) return;
    const t = state.clock.getElapsedTime();
    // Subtle rotation and slosh
    bagRef.current.rotation.y = Math.sin(t * 0.6) * 0.45;
    bagRef.current.rotation.z = Math.cos(t * 0.4) * 0.05;

    if (liquidRef.current) {
      // Liquid scale breathing / slosh
      const slosh = 1.0 + Math.sin(t * 2.0) * 0.02;
      liquidRef.current.scale.set(1.0, slosh, 1.0);
    }
  });

  return (
    <group ref={bagRef}>
      {/* 1. Outer Translucent Polymer Pouch */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.6, 2.2, 0.35]} />
        <meshPhysicalMaterial
          color="#EAE6DF"
          transparent
          opacity={0.35}
          roughness={0.15}
          metalness={0.05}
          transmission={0.7}
          thickness={0.4}
        />
      </mesh>

      {/* 2. Top Hanger Seam & Eyelet */}
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[1.55, 0.3, 0.08]} />
        <meshStandardMaterial color="#D1CDC5" roughness={0.4} />
      </mesh>
      {/* Eyelet hole punch */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
        <meshBasicMaterial color="#111111" />
      </mesh>

      {/* 3. Internal Blood Fluid Volume */}
      <mesh ref={liquidRef} position={[0, -0.15, 0]}>
        <boxGeometry args={[1.42, 1.6, 0.28]} />
        <meshPhysicalMaterial
          color="#9E0C22"
          emissive="#4A000A"
          roughness={0.1}
          metalness={0.1}
          clearcoat={0.8}
        />
      </mesh>

      {/* 4. Bottom Port & IV Infusion Tube */}
      <mesh position={[0.3, -1.2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>
      <mesh position={[-0.3, -1.2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>

      {/* 5. Neo-Brutalist Clinical Blood Sticker */}
      <group position={[0, 0.15, 0.19]}>
        {/* Label background plate */}
        <mesh>
          <planeGeometry args={[1.2, 1.2]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Yellow header stripe */}
        <mesh position={[0, 0.45, 0.001]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshBasicMaterial color="#FFE600" />
        </mesh>

        {/* Dynamic Blood Group Text */}
        <Text
          position={[0, 0.45, 0.01]}
          fontSize={0.2}
          color="#000000"
          anchorX="center"
          anchorY="middle"
        >
          {bloodGroup}
        </Text>

        {/* Clinical Specs */}
        <Text
          position={[0, 0.15, 0.01]}
          fontSize={0.08}
          color="#333333"
          anchorX="center"
          anchorY="middle"
        >
          450 mL • CPDA-1
        </Text>
        <Text
          position={[0, -0.05, 0.01]}
          fontSize={0.065}
          color="#666666"
          anchorX="center"
          anchorY="middle"
        >
          LifeGrid Clinical Unit
        </Text>

        {/* Faux Barcode Stripes */}
        <group position={[0, -0.32, 0.01]}>
          {[-0.45, -0.35, -0.28, -0.18, -0.08, 0.0, 0.1, 0.22, 0.32, 0.42].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]}>
              <planeGeometry args={[i % 2 === 0 ? 0.04 : 0.02, 0.18]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

export default function BloodBagCanvas({
  className = "h-80 w-full",
  initialGroup = "O-",
}: {
  className?: string;
  initialGroup?: string;
}) {
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);

  return (
    <div className={`relative border-3 border-black bg-neutral-950 overflow-hidden shadow-[4px_4px_0px_0px_#000] flex flex-col ${className}`}>
      {/* Neo-brutalist header */}
      <div className="absolute top-3 left-3 z-10 bg-[#FF90C8] border-2 border-black px-2.5 py-1 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
        3D Clinical Unit • {selectedGroup}
      </div>

      {/* Quick Group Switcher Pills */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-center gap-1.5 flex-wrap">
        {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((grp) => (
          <button
            key={grp}
            onClick={() => setSelectedGroup(grp)}
            className={`px-2 py-0.5 font-mono text-[10px] font-black border border-black cursor-pointer shadow-[1px_1px_0px_0px_#000] ${
              selectedGroup === grp
                ? "bg-[#FFE600] text-black"
                : "bg-white text-gray-800 hover:bg-neutral-100"
            }`}
          >
            {grp}
          </button>
        ))}
      </div>

      <div className="flex-1 w-full h-full">
        <Canvas
          camera={{ position: [0, 0, 3.8], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.0} />
          <directionalLight position={[4, 5, 4]} intensity={2.0} color="#FFFFFF" />
          <pointLight position={[-3, -2, -2]} intensity={1.2} color="#FF90C8" />
          <spotLight position={[0, 4, 3]} intensity={1.8} angle={0.5} penumbra={1} color="#FFE600" />

          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
            <BloodBagMesh bloodGroup={selectedGroup} />
          </Float>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.6}
            minPolarAngle={Math.PI / 2.6}
          />
        </Canvas>
      </div>
    </div>
  );
}
