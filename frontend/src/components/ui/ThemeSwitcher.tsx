"use client";

import React, { useEffect, useState, useRef } from "react";
import { Palette, ChevronDown, Check } from "lucide-react";

export type ThemeId = "theme-1" | "theme-2" | "theme-3" | "theme-4";

interface ThemeDefinition {
  id: ThemeId;
  name: string;
  dot1: string;
  dot2: string;
  dot3: string;
  label: string;
  description: string;
}

const themeOptions: ThemeDefinition[] = [
  {
    id: "theme-1",
    name: "Cobalt Mist",
    dot1: "#EEF2F7", // Grey
    dot2: "#2563EB", // Light Blue
    dot3: "#DC2626", // Red
    label: "1. Cobalt Mist",
    description: "Cool technical canvas with cobalt compute signals",
  },
  {
    id: "theme-2",
    name: "Sage Ledger",
    dot1: "#F2F6F0",
    dot2: "#2F6B4F",
    dot3: "#A66A2C",
    label: "2. Sage Ledger",
    description: "Calm operational green with a warm ledger accent",
  },
  {
    id: "theme-3",
    name: "Clay Signal",
    dot1: "#F8F1EA",
    dot2: "#B55233",
    dot3: "#315F70",
    label: "3. Clay Signal",
    description: "Warm editorial clay balanced by a precise blue signal",
  },
  {
    id: "theme-4",
    name: "Graphite Aurora",
    dot1: "#EF4444",
    dot2: "#F8FAFC",
    dot3: "#FACC15",
    label: "4. Graphite Aurora",
    description: "Soft-black surfaces with red, white, and yellow signals",
  },
];

interface ThemeSwitcherProps {
  compact?: boolean;
}

export default function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("theme-1");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("datalens-user-theme") as ThemeId;
    if (saved && themeOptions.some((option) => option.id === saved)) {
      setCurrentTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "theme-1");
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchTheme = (theme: ThemeId) => {
    setCurrentTheme(theme);
    localStorage.setItem("datalens-user-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    setIsOpen(false);
  };

  const activeOption = themeOptions.find((t) => t.id === currentTheme) || themeOptions[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dedicated Theme Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          compact
            ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--accent)] shadow-2xs transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer"
            : "flex min-h-11 items-center gap-2 px-2 sm:px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent)] text-xs text-[var(--text-primary)] transition shadow-2xs cursor-pointer font-medium"
        }
        aria-label={`Theme: ${activeOption.name}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Change Theme Palette"
      >
        <Palette className={`${compact ? "h-4 w-4" : "h-3.5 w-3.5"} text-[var(--accent)] stroke-[1.75]`} aria-hidden="true" />
        {!compact && <span className="hidden sm:inline font-bold">Theme</span>}

        {/* Mini 3-Color Swatch Preview of Active Theme */}
        {!compact && <div className="hidden sm:flex items-center -space-x-1 ml-0.5 shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/20"
            style={{ backgroundColor: activeOption.dot1 }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/20"
            style={{ backgroundColor: activeOption.dot2 }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/20"
            style={{ backgroundColor: activeOption.dot3 }}
          />
        </div>}

        {!compact && <ChevronDown
          className={`hidden sm:block w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />}
      </button>

      {/* Dropdown Menu with all themes */}
      {isOpen && (
        <div role="menu" aria-label="Theme palettes" className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl p-2 z-50 space-y-1 animate-in fade-in duration-150 text-[var(--text-primary)]">
          <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
            SELECT ACTIVE PALETTE (4 THEMES):
          </div>

          <div className="space-y-1 pt-1">
            {themeOptions.map((t) => {
              const isActive = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTheme(t.id)}
                  role="menuitemradio"
                  aria-checked={isActive}
                  className={`w-full min-h-11 flex items-start justify-between p-2.5 rounded-lg text-left transition cursor-pointer ${
                    isActive
                      ? "bg-[var(--accent-subtle)] border border-[var(--accent)]"
                      : "hover:bg-[var(--bg-surface-subtle)] border border-transparent"
                  }`}
                >
                  <div className="space-y-0.5 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center -space-x-1 shrink-0">
                        <span
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: t.dot1 }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: t.dot2 }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: t.dot3 }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          isActive ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {t.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] pl-5">
                      {t.description}
                    </p>
                  </div>

                  {isActive && (
                    <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
