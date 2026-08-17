"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface DivergingPaths3DProps {
  className?: string;
}

/**
 * DivergingPaths3D: 3D Deterministic vs Hallucinating Compute Paths
 * Path 1 (LLM): Jittering unstable fragment cloud.
 * Path 2 (Quantura): Solid, crisp, sharp-edged Cobalt cube.
 */
export default function DivergingPaths3D({ className = "" }: DivergingPaths3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 3.5, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 8);
    scene.add(dirLight);

    // 1. Solid Deterministic Quantura Cube (Right side)
    const solidGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const solidMat = new THREE.MeshLambertMaterial({
      color: 0x2454ff,
      transparent: true,
      opacity: 0.95,
    });
    const solidCube = new THREE.Mesh(solidGeo, solidMat);
    solidCube.position.set(1.8, 0, 0);

    const solidEdges = new THREE.EdgesGeometry(solidGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x14161c, linewidth: 2 });
    const solidWire = new THREE.LineSegments(solidEdges, wireMat);
    solidCube.add(solidWire);
    group.add(solidCube);

    // 2. Scattered Fragmented Jittering LLM Cloud (Left side)
    const fragCount = 28;
    const fragGroup = new THREE.Group();
    fragGroup.position.set(-1.8, 0, 0);
    group.add(fragGroup);

    const fragGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const fragMat = new THREE.MeshBasicMaterial({
      color: 0xd9822b,
      transparent: true,
      opacity: 0.55,
      wireframe: true,
    });

    const frags: { mesh: THREE.Mesh; basePos: THREE.Vector3; offsetSpeed: number }[] = [];

    for (let i = 0; i < fragCount; i++) {
      const mesh = new THREE.Mesh(fragGeo, fragMat);
      const basePos = new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 1.8
      );
      mesh.position.copy(basePos);
      fragGroup.add(mesh);
      frags.push({ mesh, basePos, offsetSpeed: 2 + Math.random() * 4 });
    }

    let animId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const elapsed = (time - startTime) / 1000;

      // Stable solid rotation
      solidCube.rotation.y = elapsed * 0.4;
      solidCube.rotation.x = elapsed * 0.2;

      // Jittering fragmented LLM cloud
      frags.forEach((f) => {
        f.mesh.position.x = f.basePos.x + Math.sin(elapsed * f.offsetSpeed) * 0.12;
        f.mesh.position.y = f.basePos.y + Math.cos(elapsed * f.offsetSpeed) * 0.12;
        f.mesh.rotation.x = elapsed * 1.5;
        f.mesh.rotation.y = elapsed * 2.0;
      });

      group.rotation.y = Math.sin(elapsed * 0.2) * 0.15;

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
      className={`relative w-full h-[260px] flex items-center justify-center ${className}`}
      aria-label="3D Diverging Paths: Deterministic Solidity vs Fragmented Guessing"
    />
  );
}
