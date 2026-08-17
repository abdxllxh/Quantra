"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { motionPresets } from "@/lib/motion.theme";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

/**
 * ScrollReveal: Hardware-accelerated viewport scroll reveal.
 * Applies the 'gentle' physics preset with clean translateY entrance.
 */
export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();
  const getOffset = () => {
    switch (direction) {
      case "up":
        return { y: 24, x: 0 };
      case "down":
        return { y: -24, x: 0 };
      case "left":
        return { x: 24, y: 0 };
      case "right":
        return { x: -24, y: 0 };
      case "none":
      default:
        return { x: 0, y: 0 };
    }
  };

  const offset = getOffset();

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        ...motionPresets.gentle,
        delay: reduceMotion ? 0 : delay,
      }}
      className={`reveal-layer ${className}`}
    >
      {children}
    </motion.div>
  );
}
