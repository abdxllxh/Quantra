"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QuanturaLogo from "@/components/brand/QuanturaLogo";

const routeLabel = (pathname: string) => {
  if (pathname.startsWith("/workspace")) return "Preparing analytics workspace";
  if (pathname.startsWith("/architecture")) return "Loading system architecture";
  if (pathname.startsWith("/why")) return "Loading deterministic engine";
  return "Preparing data intelligence";
};

export default function GlobalPreloader() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState(() => routeLabel(pathname));

  useEffect(() => {
    // Dismiss preloader quickly so pages are interactive immediately
    setVisible(false);
  }, [pathname]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="quantura-global-preloader"
          className="fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-[var(--bg-primary)] px-6 text-[var(--text-primary)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={label}
        >
          <div className="absolute inset-0 opacity-45" aria-hidden="true" style={{ backgroundImage: "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)", backgroundSize: "42px 42px", maskImage: "radial-gradient(circle at center, black, transparent 72%)" }} />
          <div className="relative flex w-full max-w-sm flex-col items-center text-center">
            <div className="relative grid h-28 w-28 place-items-center" aria-hidden="true">
              <motion.span
                className="absolute inset-0 rounded-[2rem] border border-[var(--border-strong)]"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
              >
                <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[var(--secondary-accent)] shadow-[0_0_18px_var(--secondary-accent)]" />
              </motion.span>
              <span className="absolute inset-3 rounded-[1.6rem] border border-dashed border-[var(--accent)]/45" />
              <QuanturaLogo className="quantura-logo-motion h-16 w-16 drop-shadow-lg" />
            </div>

            <p className="quantura-wordmark mt-5 text-3xl tracking-tight">
              Quant<span className="text-[var(--accent)]">ura</span>
            </p>
            <p className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Local deterministic runtime</p>

            <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-[var(--bg-surface-subtle)]" aria-hidden="true">
              <motion.span
                className="block h-full origin-left rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary-accent)]"
                initial={{ scaleX: 0.08 }}
                animate={reduceMotion ? { scaleX: 1 } : { scaleX: [0.08, 0.46, 0.82, 1] }}
                transition={{ duration: reduceMotion ? 0 : 0.72, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
