"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface QueryPipeline3DProps {
  className?: string;
}

/**
 * QueryPipeline3D: 3D Query Token Traveling through Deterministic Pipeline
 * Visualizes a query token passing through 4 stages: Parse -> AST -> DuckDB Kernel -> Result.
 */
export default function QueryPipeline3D({ className = "" }: QueryPipeline3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.5, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const stageCount = 4;
    const spacing = 1.8;
    const stagePanels: THREE.Mesh[] = [];

    // Stage Names: Parse, AST, Kernel, Output
    for (let i = 0; i < stageCount; i++) {
      const x = (i - (stageCount - 1) / 2) * spacing;
      const planeGeo = new THREE.BoxGeometry(1.2, 1.8, 0.08);
      const planeMat = new THREE.MeshBasicMaterial({
        color: i === 2 ? 0x2454ff : 0xe3e6ea,
        transparent: true,
        opacity: 0.7,
      });
      const panel = new THREE.Mesh(planeGeo, planeMat);
      panel.position.set(x, 0, 0);

      const edges = new THREE.EdgesGeometry(planeGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: i === 2 ? 0x2454ff : 0xcbd2da,
        transparent: true,
        opacity: 0.9,
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      panel.add(wireframe);

      group.add(panel);
      stagePanels.push(panel);
    }

    // Glowing Query Token Orb
    const tokenGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const tokenMat = new THREE.MeshBasicMaterial({ color: 0x2454ff });
    const token = new THREE.Mesh(tokenGeo, tokenMat);
    group.add(token);

    // Connecting Laser Rail
    const railPoints = [
      new THREE.Vector3(-2.8, 0, 0),
      new THREE.Vector3(2.8, 0, 0),
    ];
    const railGeo = new THREE.BufferGeometry().setFromPoints(railPoints);
    const railMat = new THREE.LineDashedMaterial({
      color: 0x2454ff,
      dashSize: 0.2,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.6,
    });
    const rail = new THREE.Line(railGeo, railMat);
    rail.computeLineDistances();
    group.add(rail);

    let animId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const elapsed = (time - startTime) / 1000;

      // Cycle token X from -2.8 to 2.8 over 4 seconds
      const cycle = (elapsed % 3.5) / 3.5;
      const tokenX = -2.8 + cycle * 5.6;
      token.position.x = tokenX;
      token.position.y = Math.sin(elapsed * 4) * 0.1;

      // Pulse active panel
      stagePanels.forEach((panel) => {
        const dist = Math.abs(panel.position.x - tokenX);
        if (dist < 0.6) {
          (panel.material as THREE.MeshBasicMaterial).opacity = 0.95;
          panel.scale.set(1.06, 1.06, 1.06);
        } else {
          (panel.material as THREE.MeshBasicMaterial).opacity = 0.5;
          panel.scale.set(1, 1, 1);
        }
      });

      group.rotation.y = Math.sin(elapsed * 0.3) * 0.2;

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
      className={`relative w-full h-[220px] flex items-center justify-center ${className}`}
      aria-label="3D Deterministic Query Execution Pipeline"
    />
  );
}
