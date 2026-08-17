"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Command,
  Database,
  FileDown,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  MessageSquareCode,
  Package,
  Palette,
  Search,
  Settings,
  Shield,
  Sparkles,
  Terminal,
  TrendingUp,
  UploadCloud,
  Users,
  Wand2,
  Workflow,
  X,
} from "lucide-react";

type TutorialStage = "prompt" | "tour" | "closed";

interface TutorialStep {
  category: string;
  title: string;
  summary: string;
  detail: string;
  outcome: string;
  icon: React.ElementType;
}

const tutorialSteps: TutorialStep[] = [
  { category: "Getting started", title: "Workspace overview", summary: "Your complete analysis project lives in one workspace.", detail: "The navigation groups ingestion, analysis, querying, reporting, and audit tools so every stage stays connected to the active dataset.", outcome: "Start with an import, then move through the workflow in any order.", icon: LayoutDashboard },
  { category: "Getting started", title: "Import a dataset", summary: "Upload CSV, Excel, Parquet, or JSON files.", detail: "Quantura inspects headers, detects sheets, lets you name the dataset, and creates the first immutable project version.", outcome: "Use Upload Dataset in the header or the import action on the empty workspace.", icon: UploadCloud },
  { category: "Getting started", title: "Project datasets", summary: "Keep multiple datasets inside the same workspace.", detail: "The dataset control at the bottom of the sidebar lists saved projects. Selecting one refreshes every analysis surface with that dataset.", outcome: "Switch projects without uploading the same file again.", icon: Database },
  { category: "Getting started", title: "Theme and command controls", summary: "Adjust the palette and reach actions quickly.", detail: "The theme switcher changes the complete token system. The command launcher provides keyboard access to workspace destinations and actions.", outcome: "Use the header controls without interrupting your analysis.", icon: Palette },
  { category: "Data preparation", title: "Data Profiling", summary: "Understand structure and quality before analysis.", detail: "Profiling reports data types, completeness, uniqueness, distributions, and column-level health from deterministic calculations.", outcome: "Review weak columns before making business decisions.", icon: Search },
  { category: "Data preparation", title: "Smart Cleaning", summary: "Repair common quality problems with controlled actions.", detail: "Choose columns and resolve duplicates, missing values, whitespace, dates, outliers, and type inconsistencies.", outcome: "Every applied action creates a recoverable project version.", icon: Sparkles },
  { category: "Data preparation", title: "Transformation", summary: "Reshape columns without editing the source file.", detail: "Create calculated fields, rename or cast columns, filter rows, aggregate values, and prepare analysis-ready structures.", outcome: "Build repeatable transformations with a visible lineage trail.", icon: Wand2 },
  { category: "Analytics", title: "Visualizations", summary: "Build and control charts from the active dataset.", detail: "Add, remove, and configure chart types, then choose the dimension, X axis, Y axis, aggregation, and visual settings.", outcome: "Compose a dashboard that matches the question you need to answer.", icon: BarChart3 },
  { category: "Analytics", title: "Business Insights", summary: "Generate concise findings from computed metrics.", detail: "This view summarizes momentum, efficiency, high-performing groups, tail risk, and practical recommendations using the active data.", outcome: "Turn exact calculations into an executive-ready narrative.", icon: Sparkles },
  { category: "Analytics", title: "Quantura Copilot", summary: "Ask questions about your data or the workspace.", detail: "Copilot routes dataset questions through validated deterministic computation and can guide you to the appropriate workspace feature.", outcome: "Receive grounded answers, follow-up suggestions, and contextual navigation guidance.", icon: MessageSquareCode },
  { category: "Analytics", title: "Forecasting", summary: "Project a numeric measure into future periods.", detail: "Select suitable date and measure columns, inspect the fitted trend, and adjust scenarios while preserving the calculated baseline.", outcome: "Compare expected performance with controlled what-if assumptions.", icon: TrendingUp },
  { category: "Analytics", title: "Anomaly Detection", summary: "Find unusual records and explain why they were flagged.", detail: "The anomaly lab combines IQR, Z-score, and Isolation Forest methods, then summarizes affected columns and severity.", outcome: "Generate and export a focused anomaly report for review.", icon: AlertTriangle },
  { category: "Analytics", title: "Customer Analytics", summary: "Describe customer value and behavior from available fields.", detail: "When customer, transaction, date, and revenue columns exist, this view calculates cohorts, segments, rankings, and brief data-specific explanations.", outcome: "Identify valuable groups and retention opportunities.", icon: Users },
  { category: "Analytics", title: "Issue Center", summary: "Manage detected data quality concerns.", detail: "Issues are grouped by severity and status so analysts can review, resolve, and track the problems that may affect downstream results.", outcome: "Keep unresolved risks visible before publishing analysis.", icon: Package },
  { category: "Query and delivery", title: "SQL and DuckDB", summary: "Query the active dataset directly with SQL.", detail: "Write and run DuckDB queries, inspect returned rows, and use exact columnar computation for custom analysis beyond the prepared views.", outcome: "Validate assumptions or create specialized result sets.", icon: Terminal },
  { category: "Query and delivery", title: "Report Generator", summary: "Assemble findings into a structured report.", detail: "Choose report content from profiles, insights, charts, forecasts, and quality findings, then create an executive-ready document.", outcome: "Turn workspace results into a shareable analysis package.", icon: FileText },
  { category: "Query and delivery", title: "Export Data", summary: "Download cleaned data and analytical outputs.", detail: "Export the active project in supported formats while keeping the selected version and transformation state consistent.", outcome: "Move verified results into the next business workflow.", icon: FileDown },
  { category: "System and audit", title: "Project History", summary: "Review the immutable audit trail.", detail: "History records ingestion, cleaning, transformations, versions, users, timestamps, and status. Entries can be searched and exported.", outcome: "Trace how the current dataset reached its present state.", icon: History },
  { category: "System and audit", title: "Settings", summary: "Configure workspace behavior and connections.", detail: "Manage runtime preferences and product configuration without changing the analytical data stored in a project.", outcome: "Adapt Quantura to the way your team works.", icon: Settings },
  { category: "System and audit", title: "Admin Panel", summary: "Monitor system-level controls and status.", detail: "Administrative information is separated from analysis views so operational controls remain clear and deliberate.", outcome: "Review platform health and governance settings in one place.", icon: Shield },
  { category: "System and audit", title: "How It Works", summary: "Review the complete deterministic workflow.", detail: "This section explains ingestion, intent translation, validated execution, local computation, lineage hashing, and reproducible outputs.", outcome: "Return here whenever you need a technical refresher.", icon: Workflow },
];

export default function WorkspaceTutorial() {
  const [stage, setStage] = useState<TutorialStage>("prompt");
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const tourCloseRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const step = tutorialSteps[stepIndex];
  const StepIcon = step.icon;
  const progress = ((stepIndex + 1) / tutorialSteps.length) * 100;

  useEffect(() => {
    if (stage === "closed") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [stage]);

  useEffect(() => {
    if (stage === "tour") tourCloseRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (stage === "closed") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStage("closed");
        return;
      }
      if (stage === "tour" && event.key === "ArrowRight") setStepIndex((current) => Math.min(tutorialSteps.length - 1, current + 1));
      if (stage === "tour" && event.key === "ArrowLeft") setStepIndex((current) => Math.max(0, current - 1));
      if (event.key !== "Tab") return;

      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])") ?? []);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [stage]);

  const closeTutorial = () => setStage("closed");

  return (
    <AnimatePresence>
      {stage !== "closed" && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
        >
          {stage === "prompt" ? (
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tutorial-prompt-title"
              aria-describedby="tutorial-prompt-description"
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl"
              initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="border-b border-[var(--border-subtle)] bg-[var(--accent-subtle)] p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--accent)]/25 bg-[var(--bg-surface)] text-[var(--accent)]">
                    <GraduationCap className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <button type="button" onClick={closeTutorial} className="grid h-11 w-11 place-items-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] cursor-pointer" aria-label="Close tutorial prompt">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">Workspace guide</p>
                <h2 id="tutorial-prompt-title" className="mt-1 font-display text-2xl font-bold">Would you like a quick tutorial?</h2>
              </div>
              <div className="p-6">
                <p id="tutorial-prompt-description" className="text-sm leading-6 text-[var(--text-secondary)]">
                  Take a guided presentation through every Quantura workspace function. It takes about three minutes, and you can close it at any time.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeTutorial} className="btn-secondary min-h-11 px-5 text-sm cursor-pointer">No, continue to workspace</button>
                  <button type="button" autoFocus onClick={() => setStage("tour")} className="btn-primary min-h-11 px-5 text-sm cursor-pointer">
                    <GraduationCap className="h-4 w-4" aria-hidden="true" /> Start tutorial
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tutorial-step-title"
              aria-describedby="tutorial-step-summary"
              className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl"
              initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"><GraduationCap className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0"><p className="font-display text-sm font-bold">Quantura workspace tutorial</p><p className="text-xs text-[var(--text-secondary)]">Step {stepIndex + 1} of {tutorialSteps.length}</p></div>
                </div>
                <button ref={tourCloseRef} type="button" onClick={closeTutorial} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] cursor-pointer" aria-label="Close tutorial">
                  <span className="hidden sm:inline">Close tutorial</span><X className="h-5 w-5" aria-hidden="true" />
                </button>
              </header>

              <div className="h-1 bg-[var(--bg-primary)]" role="progressbar" aria-label="Tutorial progress" aria-valuemin={1} aria-valuemax={tutorialSteps.length} aria-valuenow={stepIndex + 1}><motion.div className="h-full bg-[var(--accent)]" animate={{ width: `${progress}%` }} transition={{ duration: reduceMotion ? 0 : 0.25 }} /></div>

              <div className="grid min-h-0 flex-1 md:grid-cols-[220px_1fr]">
                <aside className="hidden border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 md:block" aria-label="Tutorial sections">
                  <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Presentation sections</p>
                  {["Getting started", "Data preparation", "Analytics", "Query and delivery", "System and audit"].map((category) => {
                    const categorySteps = tutorialSteps.filter((item) => item.category === category);
                    const completed = tutorialSteps.findIndex((item) => item.category === category) < stepIndex && categorySteps.every((item) => tutorialSteps.indexOf(item) <= stepIndex);
                    const active = step.category === category;
                    return <div key={category} className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${active ? "bg-[var(--accent-subtle)] font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>{completed ? <CheckCircle2 className="h-4 w-4 text-[var(--signal-success)]" aria-hidden="true" /> : <span className={`h-2 w-2 rounded-full ${active ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`} aria-hidden="true" />}<span>{category}</span></div>;
                  })}
                  <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-xs leading-5 text-[var(--text-secondary)]"><Command className="mb-2 h-4 w-4 text-[var(--accent)]" aria-hidden="true" />Use Left and Right arrow keys to move between slides.</div>
                </aside>

                <main className="min-h-0 overflow-y-auto p-6 sm:p-9">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={step.title} aria-live="polite" initial={reduceMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -12 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--accent-subtle)] text-[var(--accent)] shadow-sm"><StepIcon className="h-9 w-9 stroke-[1.6]" aria-hidden="true" /></span>
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{step.category}</p>
                          <h2 id="tutorial-step-title" className="mt-2 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">{step.title}</h2>
                          <p id="tutorial-step-summary" className="mt-3 text-base font-semibold text-[var(--text-secondary)]">{step.summary}</p>
                        </div>
                      </div>
                      <div className="mt-8 grid gap-4 lg:grid-cols-2">
                        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">How it works</p><p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{step.detail}</p></section>
                        <section className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)] p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">What you can do</p><p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{step.outcome}</p></section>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </main>
              </div>

              <footer className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-[var(--text-secondary)]">You can close the tutorial at any time without changing your workspace.</p>
                <div className="flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0} className="btn-secondary min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
                  <button type="button" onClick={() => { if (stepIndex === tutorialSteps.length - 1) closeTutorial(); else setStepIndex((current) => current + 1); }} className="btn-primary min-h-11 px-5 text-sm cursor-pointer">{stepIndex === tutorialSteps.length - 1 ? "Finish tutorial" : "Next"}{stepIndex < tutorialSteps.length - 1 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}</button>
                </div>
              </footer>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
