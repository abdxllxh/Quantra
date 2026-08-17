"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { motionPresets } from "@/lib/motion.theme";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: string;
}

export default function Sheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  width = "max-w-xl",
}: SheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionPresets.snap}
            onClick={onClose}
          />

          {/* Slide-in Panel */}
          <motion.div
            className={`relative w-full ${width} h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] shadow-xl flex flex-col z-10 overflow-hidden text-[var(--text-primary)]`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={motionPresets.ui}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  <h2 className="text-base font-bold text-[var(--text-primary)] font-display">
                    {title}
                  </h2>
                </div>
                {description && (
                  <p className="text-xs text-[var(--text-secondary)]">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition border border-transparent hover:border-[var(--border-subtle)] cursor-pointer"
                aria-label="Close panel"
              >
                <X className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
