"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";

// Coordinates for key Indian medical centers projected onto a unit sphere
const NODES = [
  { name: "Delhi (AIIMS)", lat: 28.61, lng: 77.2, color: "#FFE600", size: 0.08 },
  { name: "Mumbai (Tata)", lat: 19.07, lng: 72.87, color: "#2EE59D", size: 0.07 },
  { name: "Bangalore (Fortis)", lat: 12.97, lng: 77.59, color: "#7CD4FF", size: 0.07 },
  { name: "Chennai (Apollo)", lat: 13.08, lng: 80.27, color: "#FF90C8", size: 0.06 },
  { name: "Kolkata (AMRI)", lat: 22.57, lng: 88.36, color: "#FFE600", size: 0.06 },
  { name: "Hyderabad (NIMS)", lat: 17.38, lng: 78.48, color: "#2EE59D", size: 0.06 },
  { name: "Chandigarh (PGIMER)", lat: 30.73, lng: 76.77, color: "#7CD4FF", size: 0.05 },
  { name: "Ahmedabad (Civil)", lat: 23.02, lng: 72.57, color: "#FF90C8", size: 0.05 },
];

// Helper: Convert Lat/Lng into 3D sphere Cartesian coordinates
function latLngToVector3(lat: number, lng: number, radius = 2.0): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Generate quadratic Bezier arc points between two sphere positions
function createTransitArc(start: THREE.Vector3, end: THREE.Vector3, elevation = 0.5): THREE.Vector3[] {
  const mid = start.clone().lerp(end, 0.5);
  const midLength = mid.length();
  mid.normalize().multiplyScalar(midLength + elevation);
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  return curve.getPoints(32);
}

function GlobeNetworkMesh() {
  const groupRef = useRef<THREE.Group>(null);

  // Compute node positions
  const nodeVectors = useMemo(() => {
    return NODES.map((n) => ({
      ...n,
      pos: latLngToVector3(n.lat, n.lng, 2.02),
    }));
  }, []);

  // Compute transit arcs between major hubs
  const transitArcs = useMemo(() => {
    const pairs = [
      [0, 1], // Delhi <-> Mumbai
      [0, 2], // Delhi <-> Bangalore
      [1, 2], // Mumbai <-> Bangalore
      [0, 4], // Delhi <-> Kolkata
      [2, 3], // Bangalore <-> Chennai
      [1, 5], // Mumbai <-> Hyderabad
      [0, 6], // Delhi <-> Chandigarh
    ];
    return pairs.map(([i, j]) => createTransitArc(nodeVectors[i].pos, nodeVectors[j].pos, 0.45));
  }, [nodeVectors]);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Gentle rotation
    groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.12;
  });

  return (
    <group ref={groupRef}>
      {/* Base Dark Wireframe Sphere */}
      <mesh>
        <sphereGeometry args={[2.0, 36, 36]} />
        <meshBasicMaterial color="#0A0A0A" />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.005, 24, 24]} />
        <meshBasicMaterial color="#222222" wireframe transparent opacity={0.35} />
      </mesh>

      {/* Latitude / Longitude Equator Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.99, 2.01, 64]} />
        <meshBasicMaterial color="#7CD4FF" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Hospital Nodes */}
      {nodeVectors.map((node, idx) => (
        <group key={idx} position={node.pos}>
          {/* Solid Pin */}
          <mesh>
            <sphereGeometry args={[node.size, 16, 16]} />
            <meshBasicMaterial color={node.color} />
          </mesh>
          {/* Pulsing Outer Neon Halo */}
          <mesh>
            <sphereGeometry args={[node.size * 1.8, 16, 16]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.3} />
          </mesh>
        </group>
      ))}

      {/* Emergency Transit Arcs */}
      {transitArcs.map((arcPoints, idx) => (
        <Line
          key={idx}
          points={arcPoints}
          color={idx % 2 === 0 ? "#FFE600" : "#2EE59D"}
          lineWidth={1.8}
          transparent
          opacity={0.75}
        />
      ))}
    </group>
  );
}

export default function NetworkGlobeCanvas({ className = "h-80 w-full" }: { className?: string }) {
  return (
    <div className={`relative border-3 border-black bg-neutral-950 overflow-hidden shadow-[4px_4px_0px_0px_#000] ${className}`}>
      {/* Neo-brutalist badge */}
      <div className="absolute top-3 left-3 z-10 bg-[#2EE59D] border-2 border-black px-2.5 py-1 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
        3D Geospatial Dispatch • 39 Hospitals
      </div>

      <Canvas
        camera={{ position: [0, 1.2, 4.4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[6, 4, 6]} intensity={2.0} color="#FFFFFF" />
        <pointLight position={[-6, -4, -4]} intensity={1.0} color="#7CD4FF" />

        <GlobeNetworkMesh />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          maxPolarAngle={Math.PI / 1.6}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}
