"use client";

import React, { useState } from "react";
import {
  Workflow,
} from "lucide-react";

export const DocumentationView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"quickstart" | "cleaning" | "anomalies" | "api">("quickstart");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[10px] font-bold mb-1.5">
          <Workflow className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />
          <span>PRODUCT WORKFLOW</span>
        </div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
          How Quantura Works
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Follow your data from secure upload to verified analysis, visual insight, and auditable export.
        </p>
      </div>

      {/* Nav Tabs (Clean light tabs) */}
      <div className="flex items-center gap-6 border-b border-[var(--border-subtle)] pb-2 text-xs font-medium">
        {[
          { id: "quickstart", label: "1. Upload & Profile" },
          { id: "cleaning", label: "2. Clean & Version" },
          { id: "anomalies", label: "3. Analyze & Verify" },
          { id: "api", label: "4. Present & Export" },
        ].map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`pb-1.5 transition cursor-pointer ${
                isActive
                  ? "text-[var(--accent)] border-b-2 border-[var(--accent)] font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="card-graphite p-6 space-y-6 shadow-2xs">
        {activeSection === "quickstart" && (
          <div className="space-y-4">
            <h2 className="text-base font-bold font-display text-[var(--text-primary)]">
              Upload once, then understand the dataset immediately
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Quantura accepts CSV, Excel, Parquet, and JSON files. The local compute engine reads the complete dataset, identifies field types, and produces a quality profile before analysis begins.
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)] space-y-1">
                <span className="font-bold text-xs font-mono text-[var(--accent)]">STEP 1: CHOOSE YOUR DATA</span>
                <p className="text-xs text-[var(--text-secondary)]">Upload a supported file and select the sheet or fields you want to analyze.</p>
              </div>

              <div className="p-3 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)] space-y-1">
                <span className="font-bold text-xs font-mono text-[var(--accent)]">STEP 2: REVIEW THE PROFILE</span>
                <p className="text-xs text-[var(--text-secondary)]">Check column types, missing values, duplicates, distributions, and the overall readiness score.</p>
              </div>

              <div className="p-3 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)] space-y-1">
                <span className="font-bold text-xs font-mono text-[var(--accent)]">STEP 3: CHOOSE THE NEXT ACTION</span>
                <p className="text-xs text-[var(--text-secondary)]">Clean issues, build visualizations, ask a question, detect anomalies, or create a report.</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === "cleaning" && (
          <div className="space-y-4">
            <h2 className="text-base font-bold font-display text-[var(--text-primary)]">
              Clean data without losing the original
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Cleaning actions create a new version instead of overwriting the source. Every imputation, rename, deduplication, and calculated field is recorded so the result can be reviewed or rolled back.
            </p>

            <div className="p-4 bg-[var(--code-bg)] text-[var(--code-text)] rounded-lg font-mono text-xs overflow-x-auto">
              <code>Original upload → reviewed cleaning action → new version → reversible history</code>
            </div>
          </div>
        )}

        {activeSection === "anomalies" && (
          <div className="space-y-4">
            <h2 className="text-base font-bold font-display text-[var(--text-primary)]">
              AI plans the work; deterministic engines calculate the answer
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Natural-language requests are translated into validated operations. Pandas, NumPy, DuckDB, and Scikit-learn then perform the calculations against the real data. Anomaly Detection combines IQR, Z-score, and Isolation Forest results with clear evidence and severity.
            </p>
          </div>
        )}

        {activeSection === "api" && (
          <div className="space-y-4">
            <h2 className="text-base font-bold font-display text-[var(--text-primary)]">
              Turn verified results into decisions
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Use Visualizations for interactive dashboards, Customer Analytics and AI Business Insights for concise findings, and Report Generator for a shareable narrative. Export clean data, charts, reports, and audit records while retaining the methodology behind every result.
            </p>
            <div className="p-4 bg-[var(--code-bg)] text-[var(--code-text)] rounded-lg font-mono text-xs space-y-2 overflow-x-auto">
              <p><span className="text-[var(--signal-success)]">RESULT</span> Exact metrics calculated from the active dataset</p>
              <p><span className="text-[var(--signal-success)]">EVIDENCE</span> Columns, filters, methods, and affected records</p>
              <p><span className="text-[var(--signal-success)]">OUTPUT</span> Dashboard, CSV, Excel, HTML report, or audit trail</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
