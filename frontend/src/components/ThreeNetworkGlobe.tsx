"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface NetworkGlobeProps {
  activeShortagesCount?: number;
  totalHospitals?: number;
  className?: string;
}

export default function ThreeNetworkGlobe({
  activeShortagesCount = 18,
  totalHospitals = 42,
  className = "",
}: NetworkGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 240;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn("WebGL not available for 3D globe", e);
      return;
    }

    // Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Inner Wireframe Sphere (Earth Core)
    const sphereGeometry = new THREE.SphereGeometry(65, 24, 24);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xe23744,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const sphere = new THREE.Mesh(sphereGeometry, wireframeMaterial);
    globeGroup.add(sphere);

    // Orbital Rings
    const ringGeo1 = new THREE.RingGeometry(75, 76, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xe23744,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    globeGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(82, 83, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 3;
    ring2.rotation.y = Math.PI / 6;
    globeGroup.add(ring2);

    // Floating Regional Blood Bank Nodes (Indian Metros Coordinates on Sphere)
    const metroCoords = [
      { name: "Delhi", lat: 28.6, lon: 77.2, status: "active" },
      { name: "Mumbai", lat: 19.0, lon: 72.8, status: "critical" },
      { name: "Bengaluru", lat: 12.9, lon: 77.6, status: "active" },
      { name: "Chandigarh", lat: 30.7, lon: 76.8, status: "active" },
      { name: "Ludhiana", lat: 30.9, lon: 75.8, status: "critical" },
      { name: "Amritsar", lat: 31.6, lon: 74.8, status: "active" },
      { name: "Jalandhar", lat: 31.3, lon: 75.5, status: "active" },
      { name: "Kolkata", lat: 22.5, lon: 88.3, status: "active" },
      { name: "Chennai", lat: 13.0, lon: 80.2, status: "active" },
    ];

    const nodesGroup = new THREE.Group();
    globeGroup.add(nodesGroup);

    function latLonToVector3(lat: number, lon: number, radius: number) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    }

    const nodePositions: THREE.Vector3[] = [];

    metroCoords.forEach((metro) => {
      const pos = latLonToVector3(metro.lat, metro.lon, 66);
      nodePositions.push(pos);

      // Node pin
      const nodeGeo = new THREE.SphereGeometry(2.5, 12, 12);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: metro.status === "critical" ? 0xff3b30 : 0x10b981,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      nodesGroup.add(nodeMesh);

      // Pulsing outer halo for critical nodes
      if (metro.status === "critical") {
        const haloGeo = new THREE.RingGeometry(3.5, 4.5, 16);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xff3b30,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.position.copy(pos.clone().multiplyScalar(1.02));
        haloMesh.lookAt(new THREE.Vector3(0, 0, 0));
        nodesGroup.add(haloMesh);
      }
    });

    // Spline Connection Curves between blood bank nodes
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        if (Math.random() > 0.45) {
          const p1 = nodePositions[i];
          const p2 = nodePositions[j];
          const mid = p1.clone().add(p2).multiplyScalar(0.5);
          // Elevate mid point to form an arc
          mid.normalize().multiplyScalar(78);

          const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
          const points = curve.getPoints(24);
          const curveGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const curveMaterial = new THREE.LineBasicMaterial({
            color: 0xe23744,
            transparent: true,
            opacity: 0.35,
          });
          const curveObject = new THREE.Line(curveGeometry, curveMaterial);
          nodesGroup.add(curveObject);
        }
      }
    }

    // Surrounding Particle Field (Emergency Telemetry Data Packets)
    const particleCount = 140;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 70 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i + 2] = radius * Math.cos(phi);
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xe23744,
      size: 2,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    globeGroup.add(particles);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) {
        const rect = container.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / width) * 2 - 1;
        mouseY = -(((e.clientY - rect.top) / height) * 2 - 1);
        return;
      }
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      globeGroup.rotation.y += deltaX * 0.006;
      globeGroup.rotation.x += deltaY * 0.006;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous Idle Rotation
      if (!isDragging) {
        globeGroup.rotation.y += 0.0035;
        globeGroup.rotation.x = Math.sin(elapsedTime * 0.4) * 0.08;
      }

      // Orbital Rings Rotation
      ring1.rotation.z += 0.004;
      ring2.rotation.z -= 0.003;

      // Pulse Particles
      particles.rotation.y -= 0.001;

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 3D WebGL Canvas Mount */}
      <div ref={containerRef} className="w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing" />

      {/* Floating HUD Telemetry Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
            3D LOGISTICS TOPOLOGY
          </span>
        </div>
        <div className="text-xs font-black text-slate-800 tracking-tight">
          Pan-India Emergency Mesh
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] font-mono pointer-events-none">
        <div className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs flex items-center gap-1.5 text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{totalHospitals} Connected Blood Banks</span>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-rose-50/90 backdrop-blur-md border border-red-200 shadow-xs flex items-center gap-1.5 text-[#E23744] font-bold">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>{activeShortagesCount} Deficit Nodes Active</span>
        </div>
      </div>
    </div>
  );
}
