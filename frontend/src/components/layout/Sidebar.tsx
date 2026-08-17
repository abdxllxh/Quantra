"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { DatasetListItem } from "@/types/api";
import {
  LayoutDashboard,
  UploadCloud,
  Search,
  Sparkles,
  Wand2,
  BarChart3,
  MessageSquareCode,
  TrendingUp,
  AlertTriangle,
  Users,
  Package,
  Terminal,
  FileText,
  FileDown,
  History,
  Settings,
  Shield,
  Workflow,
  Plus,
  Trash2,
  Database,
  Check,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isExternal?: boolean;
  href?: string;
  isModal?: boolean;
  badge?: number;
}

interface SidebarSection {
  id: string;
  title: string;
  items: SidebarItem[];
}

interface SidebarProps {
  datasets?: DatasetListItem[];
  activeDatasetId?: string | null;
  activeDatasetName?: string;
  rowCount?: number;
  colCount?: number;
  onDatasetSelect?: (id: string) => void;
  onDeleteDataset?: (id: string) => void | Promise<void>;
  issueCount?: number;
  anomalyCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  datasets = [],
  activeDatasetId = null,
  activeDatasetName = "No dataset loaded",
  rowCount = 0,
  colCount = 0,
  onDatasetSelect,
  onDeleteDataset,
  issueCount = 0,
  anomalyCount = 0,
}) => {
  const { activeTab, setActiveTab, setUploadModalOpen } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [datasetManagerOpen, setDatasetManagerOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const datasetManagerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toggle = () => setMobileOpen((value) => !value);
    window.addEventListener("toggle-workspace-sidebar", toggle);
    return () => window.removeEventListener("toggle-workspace-sidebar", toggle);
  }, []);

  useEffect(() => {
    if (!datasetManagerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!datasetManagerRef.current?.contains(event.target as Node)) {
        setDatasetManagerOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDatasetManagerOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [datasetManagerOpen]);

  const sections: SidebarSection[] = [
    {
      id: "overview",
      title: "Overview",
      items: [
        { id: "overview", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      id: "data-ingestion",
      title: "Data & ingestion",
      items: [
        { id: "upload_center", label: "Upload Center", icon: UploadCloud, isModal: true },
        { id: "profiling", label: "Data Profiling", icon: Search },
        { id: "smart_cleaning", label: "Smart Cleaning", icon: Sparkles },
        { id: "clean", label: "Transformation", icon: Wand2 },
      ],
    },
    {
      id: "analysis",
      title: "Analysis",
      items: [
        { id: "charts", label: "Visualizations", icon: BarChart3 },
        { id: "analytics", label: "Business Insights", icon: Sparkles },
        { id: "ask", label: "Quantura Copilot", icon: MessageSquareCode },
        { id: "forecasting", label: "Forecasting", icon: TrendingUp },
        {
          id: "anomalies",
          label: "Anomaly Detection",
          icon: AlertTriangle,
          badge: anomalyCount > 0 ? anomalyCount : undefined,
        },
        { id: "grid", label: "Customer Analytics", icon: Users },
        {
          id: "issues",
          label: "Issue Center",
          icon: Package,
          badge: issueCount > 0 ? issueCount : undefined,
        },
      ],
    },
    {
      id: "query-export",
      title: "Query & export",
      items: [
        { id: "sql_workspace", label: "SQL & DuckDB", icon: Terminal },
        { id: "report_generator", label: "Report Generator", icon: FileText },
        { id: "export", label: "Export Data", icon: FileDown },
      ],
    },
    {
      id: "system-audit",
      title: "System & audit",
      items: [
        { id: "project_history", label: "Project History", icon: History },
        { id: "settings", label: "Settings", icon: Settings },
        { id: "admin_panel", label: "Admin Panel", icon: Shield },
        { id: "documentation", label: "How It Works", icon: Workflow },
      ],
    },
  ];

  useEffect(() => {
    const activeSection = sections.find((section) => section.items.some((item) => item.id === activeTab));
    if (!activeSection) return;
    setCollapsedSections((current) => {
      if (!current.has(activeSection.id)) return current;
      const next = new Set(current);
      next.delete(activeSection.id);
      return next;
    });
  }, [activeTab]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <>
    {mobileOpen && (
      <button
        className="fixed inset-0 top-16 z-40 bg-slate-950/25 backdrop-blur-[2px] md:hidden"
        onClick={() => setMobileOpen(false)}
        aria-label="Close workspace navigation"
      />
    )}
    <aside className={`fixed left-0 top-16 z-50 w-64 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] transition-transform duration-300 select-none text-[var(--text-primary)] md:static md:z-auto md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2 md:hidden">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Workspace navigation</span>
        <button onClick={() => setMobileOpen(false)} className="flex h-11 w-11 items-center justify-center text-[var(--text-secondary)]" aria-label="Close workspace navigation">
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Navigation Menu (Scrollable) */}
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        {sections.map((sec) => {
          const isCollapsed = collapsedSections.has(sec.id);
          const sectionPanelId = `sidebar-section-${sec.id}`;
          return (
          <section key={sec.id} className="space-y-1" aria-labelledby={`${sectionPanelId}-toggle`}>
            <button
              id={`${sectionPanelId}-toggle`}
              type="button"
              onClick={() => toggleSection(sec.id)}
              aria-expanded={!isCollapsed}
              aria-controls={sectionPanelId}
              className="group flex min-h-9 w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-[11px] font-semibold tracking-[0.02em] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <span>{sec.title}</span>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded text-[var(--text-muted)] transition-colors group-hover:bg-[var(--bg-surface)] group-hover:text-[var(--accent)]" aria-hidden="true">
                {isCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5 stroke-[2]" />
                  : <ChevronDown className="h-3.5 w-3.5 stroke-[2]" />}
              </span>
            </button>
            <div
              id={sectionPanelId}
              aria-hidden={isCollapsed}
              inert={isCollapsed}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
            >
              <div className="min-h-0 overflow-hidden">
              <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                if (item.isExternal && item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group min-h-11 md:min-h-0 w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
                    >
                      <span className="nav-icon-motion" aria-hidden="true">
                        <Icon className="w-4 h-4 text-[var(--text-secondary)] stroke-[1.75]" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.isModal) {
                        setUploadModalOpen(true);
                      } else {
                        setActiveTab(item.id as any);
                        setMobileOpen(false);
                      }
                    }}
                    className={`group min-h-11 md:min-h-0 w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[var(--bg-surface)] text-[var(--accent)] border border-[var(--border-strong)] shadow-2xs font-semibold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="nav-icon-motion" data-active={isActive} aria-hidden="true">
                        <Icon
                          className={`w-4 h-4 stroke-[1.75] transition-colors ${
                            isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                          }`}
                        />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isActive
                            ? "bg-[var(--signal-warning)] text-white"
                            : "bg-[var(--signal-warning-subtle)] text-[var(--signal-warning)] border border-[var(--signal-warning)]/30"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
              </div>
              </div>
            </div>
          </section>
          );
        })}
      </div>

      {/* Dataset Context Card at Bottom */}
      <div ref={datasetManagerRef} className="relative p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
        {datasetManagerOpen && (
          <div
            className="absolute bottom-full left-3 right-3 z-50 mb-2 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xl"
            role="dialog"
            aria-modal="false"
            aria-label="Choose active dataset"
          >
            <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
              <p className="text-xs font-bold text-[var(--text-primary)]">Project datasets</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                Select a dataset to refresh every workspace feature.
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label="Available datasets">
              {datasets.length === 0 ? (
                <p className="px-2 py-4 text-center text-[11px] text-[var(--text-secondary)]">
                  No datasets have been added yet.
                </p>
              ) : (
                datasets.map((dataset) => {
                  const isActive = dataset.id === activeDatasetId;
                  return (
                    <div
                      key={dataset.id}
                      className={`group flex items-center gap-1 rounded-lg border transition-colors ${
                        isActive
                          ? "border-[var(--border-strong)] bg-[var(--accent-subtle)]"
                          : "border-transparent hover:bg-[var(--bg-surface-subtle)]"
                      }`}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          onDatasetSelect?.(dataset.id);
                          setDatasetManagerOpen(false);
                          setMobileOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left cursor-pointer"
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] text-[var(--accent)]"}`}>
                          <Database className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-bold text-[var(--text-primary)]">{dataset.name}</span>
                          <span className="block text-[9px] font-mono text-[var(--text-secondary)]">
                            {dataset.row_count.toLocaleString()} rows · {dataset.column_count} cols
                          </span>
                        </span>
                        {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-label="Active dataset" />}
                      </button>
                      {onDeleteDataset && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDataset(dataset.id);
                          }}
                          className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition hover:bg-[var(--signal-error-subtle)] hover:text-[var(--signal-error)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-error)] cursor-pointer ${isActive ? "text-[var(--signal-error)] opacity-100" : "text-[var(--text-secondary)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"}`}
                          aria-label={`Remove ${dataset.name}`}
                          title="Remove dataset"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-[var(--border-subtle)] p-1.5">
              <button
                type="button"
                onClick={() => {
                  setDatasetManagerOpen(false);
                  setUploadModalOpen(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold text-[var(--accent)] transition hover:bg-[var(--accent-subtle)] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another dataset
              </button>
            </div>
          </div>
        )}

        <div className="card-graphite p-3 space-y-2 bg-[var(--bg-surface)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.02em] text-[var(--text-secondary)]">
              Active dataset
            </span>
            <button
              type="button"
              onClick={() => setDatasetManagerOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded transition cursor-pointer"
              title="View project datasets"
              aria-label="View project datasets"
              aria-haspopup="dialog"
              aria-expanded={datasetManagerOpen}
            >
              {datasetManagerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 truncate">
            <Database className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span className="font-mono text-xs font-bold text-[var(--text-primary)] truncate">
              {activeDatasetName}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
            <span>{rowCount.toLocaleString()} rows</span>
            <span>{colCount} cols</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
