"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { motionPresets } from "@/lib/motion.theme";

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
  codeSnippet?: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  allowMultiple?: boolean;
}

/**
 * Accordion: Left-aligned spring height-morph accordion in Paper & Signal theme.
 */
export default function Accordion({
  items,
  className = "",
  allowMultiple = false,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>([items[0]?.id || ""]);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={`flex min-w-0 max-w-full flex-col gap-3 ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div
            key={item.id}
            className={`border rounded-lg transition-colors overflow-hidden ${
              isOpen
                ? "bg-[var(--bg-surface)] border-[var(--accent)]"
                : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
            }`}
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition-colors cursor-pointer"
            >
              <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)] font-display pr-4">
                {item.question}
              </span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={motionPresets.snap}
                className="shrink-0 text-[var(--text-secondary)]"
              >
                <ChevronDown className="w-4 h-4 stroke-[1.75]" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={motionPresets.ui}
                  className="overflow-hidden"
                >
                  <div className="min-w-0 p-4 sm:p-5 pt-0 border-t border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    <p>{item.answer}</p>
                    {item.codeSnippet && (
                      <pre className="mt-3 max-w-full whitespace-pre-wrap break-words p-3.5 bg-[var(--code-bg)] border border-[var(--code-border)] rounded-lg font-mono text-xs text-[var(--code-text)] overflow-x-auto">
                        <code>{item.codeSnippet}</code>
                      </pre>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
