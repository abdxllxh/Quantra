"use client";

import React from "react";
import { motion } from "framer-motion";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
}

/**
 * BorderBeam: Perimeter sweep beam for active dataset card in Paper & Signal theme.
 */
export default function BorderBeam({
  className = "",
  size = 60,
  duration = 4,
  colorFrom = "#C4622D",
  colorTo = "transparent",
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden ${className}`}
      style={{ padding: `${borderWidth}px` }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          repeat: Infinity,
          duration,
          ease: "linear",
        }}
        style={{
          width: "200%",
          height: "200%",
          left: "-50%",
          top: "-50%",
          background: `conic-gradient(from 0deg, transparent 0deg, ${colorFrom} 40deg, ${colorTo} 90deg, transparent 100deg)`,
        }}
      />
      <div className="absolute inset-[1px] rounded-[inherit] bg-[#FFFFFF]" />
    </div>
  );
}
