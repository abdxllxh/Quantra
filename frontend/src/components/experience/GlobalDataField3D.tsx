"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import * as THREE from "three";

const MARKETING_PATHS = new Set(["/", "/why-datalens", "/why-quantura", "/architecture"]);

function readThemeColor(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function GlobalDataField3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const marketing = MARKETING_PATHS.has(pathname);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const world = new THREE.Group();
    scene.add(world);
    const accent = new THREE.Color(readThemeColor("--accent", "#2563eb"));
    const secondary = new THREE.Color(readThemeColor("--secondary-accent", "#d97706"));
    const muted = new THREE.Color(readThemeColor("--border-strong", "#94a3b8"));

    const pointsCount = marketing ? 150 : 72;
    const positions = new Float32Array(pointsCount * 3);
    const colors = new Float32Array(pointsCount * 3);
    for (let i = 0; i < pointsCount; i += 1) {
      const radius = 2.8 + ((i * 37) % 100) / 28;
      const angle = i * 2.399963;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = ((i % 29) - 14) * 0.22;
      positions[i * 3 + 2] = Math.sin(angle) * radius - 2;
      const color = i % 9 === 0 ? secondary : i % 3 === 0 ? muted : accent;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pointsMaterial = new THREE.PointsMaterial({ size: marketing ? 0.055 : 0.04, transparent: true, opacity: marketing ? 0.72 : 0.34, vertexColors: true });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    world.add(points);

    const rings = new THREE.Group();
    for (let i = 0; i < 4; i += 1) {
      const curve = new THREE.EllipseCurve(0, 0, 1.55 + i * 0.72, 1.55 + i * 0.72, 0, Math.PI * 2);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(96));
      const ring = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: i % 2 ? secondary : accent, transparent: true, opacity: marketing ? 0.13 : 0.055 }));
      ring.rotation.x = Math.PI / 2 + i * 0.22;
      ring.rotation.y = i * 0.48;
      rings.add(ring);
    }
    world.add(rings);

    const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.32 });
    const cubes = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, marketing ? 28 : 12);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < cubes.count; i += 1) {
      const angle = (i / cubes.count) * Math.PI * 2;
      const radius = 2.2 + (i % 5) * 0.48;
      dummy.position.set(Math.cos(angle) * radius, ((i % 7) - 3) * 0.62, Math.sin(angle) * radius - 1.5);
      dummy.rotation.set(angle * 0.35, angle, angle * 0.2);
      dummy.scale.setScalar(0.7 + (i % 4) * 0.18);
      dummy.updateMatrix();
      cubes.setMatrixAt(i, dummy.matrix);
    }
    world.add(cubes);

    const updateThemeColors = () => {
      const nextAccent = new THREE.Color(readThemeColor("--accent", "#2563eb"));
      const nextSecondary = new THREE.Color(readThemeColor("--secondary-accent", "#d97706"));
      const nextMuted = new THREE.Color(readThemeColor("--border-strong", "#94a3b8"));

      const colorAttribute = pointsGeometry.getAttribute("color") as THREE.BufferAttribute;
      for (let i = 0; i < pointsCount; i += 1) {
        const color = i % 9 === 0 ? nextSecondary : i % 3 === 0 ? nextMuted : nextAccent;
        colorAttribute.setXYZ(i, color.r, color.g, color.b);
      }
      colorAttribute.needsUpdate = true;

      rings.children.forEach((child, index) => {
        const material = (child as THREE.Line).material as THREE.LineBasicMaterial;
        material.color.copy(index % 2 ? nextSecondary : nextAccent);
      });
      cubeMaterial.color.copy(nextAccent);
    };

    const themeObserver = new MutationObserver(updateThemeColors);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    let pointerX = 0;
    let pointerY = 0;
    let scrollProgress = 0;
    let frameId = 0;
    let lastTime = 0;
    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      scrollProgress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate);
      if (time - lastTime < 32) return;
      lastTime = time;
      const seconds = time * 0.001;
      world.rotation.y += (scrollProgress * Math.PI * 1.4 + pointerX * 0.08 - world.rotation.y) * 0.025;
      world.rotation.x += (scrollProgress * 0.46 - pointerY * 0.05 - world.rotation.x) * 0.025;
      world.position.y = Math.sin(seconds * 0.22) * 0.18 - scrollProgress * 0.8;
      rings.rotation.z = seconds * 0.035;
      points.rotation.y = seconds * 0.018;
      camera.position.x += (pointerX * 0.18 - camera.position.x) * 0.03;
      camera.position.y += (-pointerY * 0.14 - camera.position.y) * 0.03;
      camera.lookAt(0, -scrollProgress * 0.3, -1.5);
      renderer.render(scene, camera);
    };

    resize();
    onScroll();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    frameId = requestAnimationFrame(animate);

    return () => {
      themeObserver.disconnect();
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      cubeGeometry.dispose();
      cubeMaterial.dispose();
      rings.children.forEach((child) => {
        const line = child as THREE.Line;
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, [pathname]);

  return <canvas ref={canvasRef} className="global-data-field" aria-hidden="true" />;
}
