"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Database,
  Terminal,
  Sparkles,
  Layers,
  BarChart3,
  ShieldAlert,
  Sliders,
  History,
  ArrowRight,
  X,
} from "lucide-react";
import { motionPresets } from "@/lib/motion.theme";
import { useAppStore } from "@/lib/store";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView?: (viewId: string) => void;
  onOpenUpload?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Workflows" | "Actions";
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

/**
 * CommandPalette: Launcher for Workspace navigation & SQL execution via Cmd+K.
 */
export default function CommandPalette({
  isOpen,
  onClose,
  onSelectView,
  onOpenUpload,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setActiveTab } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          const evt = new CustomEvent("open-command-palette");
          window.dispatchEvent(evt);
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const commands: CommandItem[] = [
    {
      id: "view-overview",
      title: "Jump to Overview & Matrix Health",
      category: "Navigation",
      icon: <Layers className="w-4 h-4 text-[#C4622D] stroke-[1.75]" />,
      shortcut: "G O",
      action: () => {
        if (onSelectView) onSelectView("overview");
        else setActiveTab("overview");
        onClose();
      },
    },
    {
      id: "view-ask-data",
      title: "Quantura Copilot",
      category: "Workflows",
      icon: <Sparkles className="w-4 h-4 text-[#C4622D] stroke-[1.75]" />,
      shortcut: "G A",
      action: () => {
        if (onSelectView) onSelectView("ask");
        else setActiveTab("ask");
        onClose();
      },
    },
    {
      id: "view-sql",
      title: "Launch SQL & DuckDB Workspace",
      category: "Workflows",
      icon: <Terminal className="w-4 h-4 text-[#1E7A4C] stroke-[1.75]" />,
      shortcut: "G S",
      action: () => {
        if (onSelectView) onSelectView("sql_workspace");
        else setActiveTab("sql_workspace");
        onClose();
      },
    },
    {
      id: "view-charts",
      title: "Interactive Visualization Lab",
      category: "Navigation",
      icon: <BarChart3 className="w-4 h-4 text-[#1E7A4C] stroke-[1.75]" />,
      shortcut: "G C",
      action: () => {
        if (onSelectView) onSelectView("charts");
        else setActiveTab("charts");
        onClose();
      },
    },
    {
      id: "view-anomalies",
      title: "Anomaly Detection & Outlier Lab",
      category: "Workflows",
      icon: <ShieldAlert className="w-4 h-4 text-[#B4392C] stroke-[1.75]" />,
      shortcut: "G X",
      action: () => {
        if (onSelectView) onSelectView("anomalies");
        else setActiveTab("anomalies");
        onClose();
      },
    },
    {
      id: "view-clean",
      title: "Smart Data Cleaning & Imputation",
      category: "Workflows",
      icon: <Sliders className="w-4 h-4 text-[#6B6660] stroke-[1.75]" />,
      shortcut: "G D",
      action: () => {
        if (onSelectView) onSelectView("smart_cleaning");
        else setActiveTab("smart_cleaning");
        onClose();
      },
    },
    {
      id: "action-upload",
      title: "Upload New Dataset (CSV, Parquet, JSON, XLSX)",
      category: "Actions",
      icon: <Database className="w-4 h-4 text-[#C4622D] stroke-[1.75]" />,
      shortcut: "U",
      action: () => {
        onOpenUpload?.();
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-[#1A1815]/30 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionPresets.snap}
            onClick={onClose}
          />

          {/* Palette Modal */}
          <motion.div
            className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E8E4DC] rounded-xl shadow-2xl overflow-hidden z-10 text-[#1A1815]"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={motionPresets.ui}
          >
            {/* Search Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-[#E8E4DC] bg-[#FAF9F6]">
              <Search className="w-4 h-4 text-[#C4622D] mr-3 shrink-0 stroke-[1.75]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDownList}
                placeholder="Type a command, search views, or launch tools..."
                className="w-full bg-transparent text-sm text-[#1A1815] placeholder-[#8E8A83] focus:outline-none font-sans"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono text-[#6B6660] bg-[#F4F0E8] px-1.5 py-0.5 rounded border border-[#E8E4DC]">
                  ESC
                </span>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[320px] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B6660]">
                  No commands matching &ldquo;{query}&rdquo;
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#FAF9F6] text-[#1A1815] border border-[#D0CBC0]"
                          : "text-[#6B6660] hover:text-[#1A1815] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1 rounded bg-[#FFFFFF] border border-[#E8E4DC] shrink-0">
                          {cmd.icon}
                        </div>
                        <span className="font-medium truncate text-[#1A1815]">
                          {cmd.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#6B6660] uppercase px-1.5 py-0.5 rounded bg-[#F4F0E8]">
                          {cmd.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {cmd.shortcut && (
                          <span className="text-[10px] font-mono text-[#6B6660] bg-[#F4F0E8] px-1.5 py-0.5 rounded border border-[#E8E4DC]">
                            {cmd.shortcut}
                          </span>
                        )}
                        <ArrowRight
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-[#C4622D]" : "text-transparent"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#FAF9F6] border-t border-[#E8E4DC] text-[11px] text-[#6B6660]">
              <div className="flex items-center gap-3 font-mono">
                <span><strong className="text-[#1A1815]">↑↓</strong> to navigate</span>
                <span><strong className="text-[#1A1815]">↵</strong> to select</span>
              </div>
              <span className="font-mono text-[10px] text-[#C4622D]">Quantura Engine v2.4</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
