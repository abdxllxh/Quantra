"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ColumnarScan3DProps {
  className?: string;
}

/**
 * ColumnarScan3D: Fast Columnar Storage Vector Scan (DuckDB sub-10ms)
 * Renders vertical vector columns highlighting in high-speed sequence left-to-right.
 */
export default function ColumnarScan3D({ className = "" }: ColumnarScan3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 2.5, 6.0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const colCount = 8;
    const spacing = 0.55;
    const columns: THREE.Mesh[] = [];

    const colGeo = new THREE.BoxGeometry(0.38, 2.4, 0.38);

    for (let i = 0; i < colCount; i++) {
      const x = (i - (colCount - 1) / 2) * spacing;
      const colMat = new THREE.MeshBasicMaterial({
        color: 0xe3e6ea,
        transparent: true,
        opacity: 0.6,
      });
      const mesh = new THREE.Mesh(colGeo, colMat);
      mesh.position.set(x, 0, 0);

      const edges = new THREE.EdgesGeometry(colGeo);
      const wireMat = new THREE.LineBasicMaterial({ color: 0xcbd2da });
      const wireframe = new THREE.LineSegments(edges, wireMat);
      mesh.add(wireframe);

      group.add(mesh);
      columns.push(mesh);
    }

    let animId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const elapsed = (time - startTime) / 1000;

      // High-speed scan sweep (sub-10ms aesthetic)
      const scanIndex = Math.floor((elapsed * 6) % colCount);

      columns.forEach((col, idx) => {
        const mat = col.material as THREE.MeshBasicMaterial;
        if (idx === scanIndex) {
          mat.color.setHex(0x2454ff);
          mat.opacity = 0.95;
          col.scale.set(1.08, 1.08, 1.08);
        } else if (idx === (scanIndex - 1 + colCount) % colCount) {
          mat.color.setHex(0x17875a);
          mat.opacity = 0.75;
          col.scale.set(1.02, 1.02, 1.02);
        } else {
          mat.color.setHex(0xe3e6ea);
          mat.opacity = 0.45;
          col.scale.set(1, 1, 1);
        }
      });

      group.rotation.y = Math.sin(elapsed * 0.4) * 0.15;

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
      aria-label="3D Columnar Vector Scan"
    />
  );
}
