"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface VersionTree3DProps {
  className?: string;
}

/**
 * VersionTree3D: 3D Branching Version Lineage Tree
 * Visualizes non-destructive SHA-256 snapshots with active Cobalt state branch.
 */
export default function VersionTree3D({ className = "" }: VersionTree3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 3.5, 6.0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const treeGroup = new THREE.Group();
    scene.add(treeGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    // Nodes (v1.0 -> v2.0 -> v3.0 [active], v2.1 [branch])
    const nodes = [
      { pos: new THREE.Vector3(-1.8, 0, 0), active: false, label: "v1.0" },
      { pos: new THREE.Vector3(-0.6, 0.5, 0), active: false, label: "v2.0" },
      { pos: new THREE.Vector3(0.8, 1.0, 0), active: true, label: "v3.0 (Active)" },
      { pos: new THREE.Vector3(0.6, -0.7, 0.5), active: false, label: "v2.1 (Rollback)" },
    ];

    const nodeGeo = new THREE.SphereGeometry(0.24, 16, 16);

    nodes.forEach((n) => {
      const mat = new THREE.MeshBasicMaterial({
        color: n.active ? 0x2454ff : 0xcbd2da,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.copy(n.pos);
      treeGroup.add(mesh);
    });

    // Connecting Branches
    const branches = [
      [nodes[0].pos, nodes[1].pos, true],
      [nodes[1].pos, nodes[2].pos, true],
      [nodes[1].pos, nodes[3].pos, false],
    ] as const;

    branches.forEach(([p1, p2, isActive]) => {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({
        color: isActive ? 0x2454ff : 0xcbd2da,
        linewidth: isActive ? 2 : 1,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      treeGroup.add(line);
    });

    let animId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const elapsed = (time - startTime) / 1000;

      treeGroup.rotation.y = Math.sin(elapsed * 0.3) * 0.35;
      treeGroup.rotation.x = Math.cos(elapsed * 0.2) * 0.15;

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
      aria-label="3D Version Lineage Tree"
    />
  );
}
