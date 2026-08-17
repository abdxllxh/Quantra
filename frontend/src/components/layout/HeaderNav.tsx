"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Command,
  Upload,
  Menu,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import CommandPalette from "@/components/ui/CommandPalette";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import QuanturaLogo from "@/components/brand/QuanturaLogo";

export const HeaderNav: React.FC = () => {
  const pathname = usePathname();
  const { setUploadModalOpen } = useAppStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleOpenCmd = () => setCommandPaletteOpen(true);
    window.addEventListener("open-command-palette", handleOpenCmd);
    return () => window.removeEventListener("open-command-palette", handleOpenCmd);
  }, []);

  const navLinks = [
    { href: "/", label: "Overview" },
    { href: "/workspace", label: "Analytics Workspace" },
    { href: "/why-quantura", label: "Deterministic Engine" },
    { href: "/architecture", label: "Architecture" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2 group" aria-label="Quantura home">
              <QuanturaLogo className="quantura-logo-motion h-8 w-8 sm:h-9 sm:w-9" />
              <span className="quantura-wordmark text-base text-[var(--text-primary)] sm:text-lg">
                Quant<span className="text-[var(--accent)]">ura</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-[var(--border-subtle)]">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--bg-surface)] text-[var(--accent)] border border-[var(--border-strong)] shadow-2xs font-semibold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {pathname === "/workspace" && (
              <button
                onClick={() => window.dispatchEvent(new Event("toggle-workspace-sidebar"))}
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                aria-label="Open workspace navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
            {/* Multi-Palette Theme Switcher */}
            <ThemeSwitcher compact />

            {/* Quick Cmd+K Launcher Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer shadow-2xs"
              title="Search & Commands (Cmd+K)"
            >
              <Command className="w-3.5 h-3.5 text-[var(--accent)] stroke-[1.75]" />
              <span className="font-mono text-[11px]">Cmd+K</span>
            </button>

            {pathname === "/workspace" ? (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="btn-primary text-xs py-1.5 px-3.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 stroke-[1.75]" />
                <span className="hidden sm:inline">Upload Dataset</span>
              </button>
            ) : (
              <div className="hidden sm:block">
                <Link
                  href="/workspace"
                  className="btn-primary text-xs py-1.5 px-3.5 cursor-pointer shadow-xs"
                >
                  <span>Launch App</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[1.75]" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
};
