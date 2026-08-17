/**
 * Quantura - Motion Physics Theme
 * 
 * Named physics presets according to motion.dev house rules.
 * All transitions in Quantura must resolve from these named presets
 * rather than one-off durations scattered across components.
 */

import { Transition } from "framer-motion";

export const motionPresets = {
  /** Snappy, high-frequency response for active clicks, toggles, micro-interactions */
  snap: {
    type: "spring",
    stiffness: 500,
    damping: 32,
    mass: 0.8,
  } as const,

  /** Standard UI interaction preset for modals, dropdowns, panels, and sheets */
  ui: {
    type: "spring",
    stiffness: 380,
    damping: 28,
    mass: 1,
  } as const,

  /** Soft, graceful transition for reveals, card switches, and layout morphing */
  gentle: {
    type: "spring",
    stiffness: 220,
    damping: 24,
    mass: 1.1,
  } as const,

  /** Energetic, bouncy transition for celebratory state, success badges, metric counters */
  lively: {
    type: "spring",
    stiffness: 340,
    damping: 16,
    mass: 0.9,
  } as const,

  /** Slow, continuous breathing/ambient background elements and hover highlights */
  ambient: {
    type: "spring",
    stiffness: 90,
    damping: 20,
    mass: 1.4,
  } as const,
};

export type MotionPresetName = keyof typeof motionPresets;

/**
 * Helper to get a typed transition with an optional delay or override
 */
export function getMotionPreset(preset: MotionPresetName = "ui", extra?: Partial<Transition>): Transition {
  return {
    ...motionPresets[preset],
    ...extra,
  };
}

/** Standard viewport reveal animation variants */
export const viewportReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (customDelay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...motionPresets.gentle,
      delay: customDelay,
    },
  }),
};

/** Stagger container animation helper */
export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0.05) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});
