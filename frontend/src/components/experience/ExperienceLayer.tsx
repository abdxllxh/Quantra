"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";
import GlobalDataField3D from "./GlobalDataField3D";

export default function ExperienceLayer() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 32, mass: 0.45 });
  const [pointer, setPointer] = useState({ x: -200, y: -200 });

  useEffect(() => {
    if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;
    const move = (event: PointerEvent) => setPointer({ x: event.clientX, y: event.clientY });
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduceMotion]);

  return (
    <div className="experience-layer" data-route={pathname} aria-hidden="true">
      <div className="experience-grid" />
      <GlobalDataField3D />
      <motion.div className="pointer-aura" animate={{ x: pointer.x - 170, y: pointer.y - 170 }} transition={{ type: "spring", stiffness: 75, damping: 24, mass: 0.55 }} />
      <motion.div className="route-progress" style={{ scaleX }} />
    </div>
  );
}
