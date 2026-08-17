"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { motionPresets } from "@/lib/motion.theme";

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
  emptyState?: React.ReactNode;
}

/**
 * AnimatedList: Staggered, spring-animated list for live datasets,
 * audit history entries, and anomaly alerts.
 */
export default function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className = "",
  emptyState,
}: AnimatedListProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <AnimatePresence initial={false}>
        {items.map((item, index) => {
          const key = keyExtractor(item);
          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: motionPresets.snap }}
              transition={motionPresets.ui}
            >
              {renderItem(item, index)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
