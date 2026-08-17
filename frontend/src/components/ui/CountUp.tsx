"use client";

import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface CountUpProps {
  from?: number;
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * CountUp: Scroll-triggered number counter.
 * Guaranteed to animate smoothly to `to` when scrolled into view,
 * with zero risk of remaining frozen at 0.
 */
export default function CountUp({
  from = 0,
  to,
  duration = 1.6,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>(() => {
    return `${prefix}${to.toFixed(decimals)}${suffix}`;
  });

  // Trigger animation on scroll or mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduceMotion) {
      setDisplayValue(`${prefix}${to.toFixed(decimals)}${suffix}`);
      return;
    }

    // Set initial from value on mount
    setDisplayValue(`${prefix}${from.toFixed(decimals)}${suffix}`);

    let observer: IntersectionObserver | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const startCounting = () => {
      setHasStarted(true);
      if (observer) observer.disconnect();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startCounting();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
    } else {
      startCounting();
    }

    // Safety fallback: start count after 500ms even if observer didn't trigger
    fallbackTimer = setTimeout(() => {
      startCounting();
    }, 500);

    return () => {
      if (observer) observer.disconnect();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [from, to, decimals, prefix, suffix, reduceMotion]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number | null = null;
    let animId: number;

    const easeOutExpo = (x: number): number => {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    };

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeVal = easeOutExpo(progress);
      const current = from + (to - from) * easeVal;

      setDisplayValue(`${prefix}${current.toFixed(decimals)}${suffix}`);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(`${prefix}${to.toFixed(decimals)}${suffix}`);
      }
    };

    animId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animId);
  }, [hasStarted, from, to, duration, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {displayValue}
    </span>
  );
}
