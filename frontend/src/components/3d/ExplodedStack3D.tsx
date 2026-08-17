"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ExplodedStack3DProps {
  className?: string;
}

/**
 * ExplodedStack3D: 3D Exploded-View Architecture Stack
 * Visualizes 3 decoupled floating planes (UI -> API -> Compute Kernel) with connecting pillars.
 */
export default function ExplodedStack3D({ className = "" }: ExplodedStack3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(5.5, 4.5, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const stackGroup = new THREE.Group();
    scene.add(stackGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const layers = [
      { y: 1.4, color: 0x2454ff, label: "Client UI Layer (Next.js 16)" },
      { y: 0.0, color: 0xe3e6ea, label: "Async API Gateway (FastAPI)" },
      { y: -1.4, color: 0x17875a, label: "Vector Math Kernel (DuckDB/NumPy)" },
    ];

    const planeGeo = new THREE.BoxGeometry(4.2, 0.12, 2.6);

    layers.forEach((layer) => {
      const planeMat = new THREE.MeshLambertMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.color === 0xe3e6ea ? 0.7 : 0.9,
      });
      const mesh = new THREE.Mesh(planeGeo, planeMat);
      mesh.position.y = layer.y;

      const edges = new THREE.EdgesGeometry(planeGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xcbd2da,
        transparent: true,
        opacity: 0.9,
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      mesh.add(wireframe);

      stackGroup.add(mesh);
    });

    // Vertical connecting data rails (4 corners)
    const corners = [
      [-1.8, -1.0],
      [1.8, -1.0],
      [-1.8, 1.0],
      [1.8, 1.0],
    ];

    corners.forEach(([x, z]) => {
      const linePoints = [
        new THREE.Vector3(x, -1.4, z),
        new THREE.Vector3(x, 1.4, z),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x2454ff,
        transparent: true,
        opacity: 0.5,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      stackGroup.add(line);
    });

    let animId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const elapsed = (time - startTime) / 1000;

      stackGroup.rotation.y = elapsed * 0.15;
      stackGroup.rotation.x = Math.sin(elapsed * 0.1) * 0.05;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

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
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-[320px] flex items-center justify-center ${className}`}
      aria-label="3D Decoupled Architecture Exploded Stack"
    />
  );
}
