"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ModelViewer3DProps {
  className?: string;
}

/**
 * ModelViewer3D: 3D Spreadsheet-to-Chart Visualization (Hero)
 * Dynamically reacts to theme changes via CSS custom properties.
 */
export default function ModelViewer3D({ className = "" }: ModelViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(5.5, 6.0, 8.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const matrixGroup = new THREE.Group();
    scene.add(matrixGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    // Grid Dimensions
    const rows = 7;
    const cols = 9;
    const cellWidth = 0.55;
    const cellDepth = 0.4;
    const cellHeight = 0.05;
    const gap = 0.12;

    const cells: {
      mesh: THREE.Mesh;
      baseY: number;
      targetHeight: number;
      isHighlighted: boolean;
      colIdx: number;
      rowIdx: number;
    }[] = [];

    const getThemeColors = () => {
      const style = getComputedStyle(document.documentElement);
      const accentHex = style.getPropertyValue("--accent").trim() || "#2563EB";
      const surfaceHex = style.getPropertyValue("--bg-surface-subtle").trim() || "#E2E8F0";
      const borderHex = style.getPropertyValue("--border-strong").trim() || "#94A3B8";

      return {
        accent: new THREE.Color(accentHex),
        muted: new THREE.Color(surfaceHex),
        border: new THREE.Color(borderHex),
      };
    };

    const currentColors = getThemeColors();
    const colHeights = [0.2, 0.5, 1.2, 2.2, 2.8, 2.0, 1.4, 0.6, 0.3];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const posX = (c - cols / 2) * (cellWidth + gap);
        const posZ = (r - rows / 2) * (cellDepth + gap);

        const isAggregate = r >= 2 && r <= 4;
        const targetH = isAggregate ? colHeights[c] : 0.08;

        const geometry = new THREE.BoxGeometry(cellWidth, cellHeight, cellDepth);
        const material = new THREE.MeshLambertMaterial({
          color: isAggregate ? currentColors.accent : currentColors.muted,
          transparent: true,
          opacity: isAggregate ? 0.95 : 0.65,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(posX, 0, posZ);

        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: currentColors.border,
          transparent: true,
          opacity: 0.8,
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        mesh.add(wireframe);

        matrixGroup.add(mesh);

        cells.push({
          mesh,
          baseY: 0,
          targetHeight: targetH,
          isHighlighted: isAggregate,
          colIdx: c,
          rowIdx: r,
        });
      }
    }

    // Observer to update Three.js colors on theme switch
    const observer = new MutationObserver(() => {
      const newColors = getThemeColors();
      cells.forEach((cell) => {
        const mat = cell.mesh.material as THREE.MeshLambertMaterial;
        mat.color.copy(cell.isHighlighted ? newColors.accent : newColors.muted);
        const wireframe = cell.mesh.children[0] as THREE.LineSegments;
        const wireframeMaterial = wireframe?.material as THREE.LineBasicMaterial | undefined;
        wireframeMaterial?.color.copy(newColors.border);
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mousePos.current.targetX = x * 0.8;
      mousePos.current.targetY = y * 0.8;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    let animationFrameId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = (time - startTime) / 1000;

      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.04;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.04;

      matrixGroup.rotation.y = Math.sin(elapsed * 0.15) * 0.15 + mousePos.current.x;
      matrixGroup.rotation.x = mousePos.current.y * 0.5;

      const cycleProgress = (Math.sin(elapsed * 0.5) + 1) / 2;

      cells.forEach((cell) => {
        if (cell.isHighlighted) {
          const currentH = THREE.MathUtils.lerp(0.08, cell.targetHeight, cycleProgress);
          cell.mesh.scale.y = currentH / cellHeight;
          cell.mesh.position.y = currentH / 2;
        } else {
          const ripple = Math.sin(elapsed * 1.2 + cell.colIdx * 0.3 + cell.rowIdx * 0.2) * 0.03;
          cell.mesh.position.y = ripple;
        }
      });

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      cells.forEach((cell) => {
        cell.mesh.geometry.dispose();
        (cell.mesh.material as THREE.Material).dispose();
        cell.mesh.children.forEach((child) => {
          const line = child as THREE.LineSegments;
          line.geometry?.dispose();
          (line.material as THREE.Material)?.dispose();
        });
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-[360px] sm:h-[440px] flex items-center justify-center cursor-default pointer-events-auto ${className}`}
      aria-label="3D Dynamic Transformation Canvas"
    />
  );
}
