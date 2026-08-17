"use client";

import React from "react";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/motion.theme";

interface SplitTextProps {
  text: string;
  className?: string;
  highlightWords?: string[];
  highlightClassName?: string;
  delay?: number;
}

/**
 * SplitText: Word-by-word reveal using named motion preset 'gentle'.
 * Dynamically highlights targeted terms using var(--accent).
 */
export default function SplitText({
  text,
  className = "",
  highlightWords = [],
  highlightClassName = "text-[var(--accent)]",
  delay = 0,
}: SplitTextProps) {
  const words = text.split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: delay,
      },
    },
  };

  const childVariants = {
    hidden: {
      opacity: 0,
      y: 16,
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: motionPresets.gentle,
    },
  };

  return (
    <motion.h1
      className={`inline-block max-w-full [overflow-wrap:anywhere] ${className}`}
      aria-label={text}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, i) => {
        const cleanWord = word.replace(/[^a-zA-Z0-9-]/g, "");
        const isHighlighted = highlightWords.some(
          (hw) => hw.toLowerCase() === cleanWord.toLowerCase()
        );

        return (
          <React.Fragment key={i}>
            <motion.span
              variants={childVariants}
              aria-hidden="true"
              className={`inline-block max-w-full [overflow-wrap:anywhere] ${
                isHighlighted ? highlightClassName : ""
              }`}
            >
              {word}
            </motion.span>
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </motion.h1>
  );
}
