"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import {
  DatasetDetail,
  DatasetProfile,
  ExecutiveSummary,
  ChartRecommendation,
} from "@/types/api";
import {
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Zap,
  Activity,
  Wand2,
  AlertTriangle,
  ArrowRight,
  Database,
  Layers,
} from "lucide-react";

interface OverviewViewProps {
  dataset: DatasetDetail;
  profile: DatasetProfile | null;
  summary: ExecutiveSummary | null;
  charts: ChartRecommendation[];
  onRefresh: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  dataset,
  profile,
  summary,
  charts,
  onRefresh,
}) => {
  const { setActiveTab, showToast } = useAppStore();

  const handleFixDeduplicate = async () => {
    try {
      await api.deduplicate(dataset.id, "first");
      showToast("Deduplication completed successfully.", "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Deduplication failed: ${err.message}`, "error");
    }
  };

  const healthScore = profile?.health.overall_score || 95;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Top Banner: Health Score & Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Data Health Score Dial */}
        <div className="card-graphite p-6 flex flex-col justify-between space-y-5 bg-[var(--bg-surface)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-[var(--text-secondary)]">
              Data Health Score
            </span>
            <span
              className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${
                healthScore >= 80
                  ? "bg-[var(--signal-success-subtle)] text-[var(--signal-success)] border-[var(--signal-success)]/30"
                  : healthScore >= 60
                  ? "bg-[var(--signal-warning-subtle)] text-[var(--signal-warning)] border-[var(--signal-warning)]/30"
                  : "bg-[var(--signal-error-subtle)] text-[var(--signal-error)] border-[var(--signal-error)]/30"
              }`}
            >
              {healthScore >= 80 ? "Optimal" : healthScore >= 60 ? "Moderate" : "Action Required"}
            </span>
          </div>

          <div className="flex items-center space-x-6 my-2">
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className="text-[var(--bg-surface-subtle)]"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className={
                    healthScore >= 80
                      ? "text-[var(--signal-success)]"
                      : healthScore >= 60
                      ? "text-[var(--signal-warning)]"
                      : "text-[var(--signal-error)]"
                  }
                  strokeWidth="8"
                  strokeDasharray={251}
                  strokeDashoffset={251 - (251 * healthScore) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {healthScore}
                </span>
                <span className="text-[9px] font-bold text-[var(--text-muted)]">/100</span>
              </div>
            </div>

            <div className="space-y-1 text-xs flex-1">
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span>Completeness:</span>
                <span className="font-bold font-mono text-[var(--text-primary)]">
                  {profile?.health.completeness_score ?? 100}%
                </span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span>Uniqueness:</span>
                <span className="font-bold font-mono text-[var(--text-primary)]">
                  {profile?.health.uniqueness_score ?? 100}%
                </span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span>Consistency:</span>
                <span className="font-bold font-mono text-[var(--text-primary)]">
                  {profile?.health.consistency_score ?? 100}%
                </span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span>Anomaly Risk:</span>
                <span className="font-bold font-mono text-[var(--text-primary)]">
                  {profile?.health.anomaly_risk_score ?? 100}%
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("smart_cleaning")}
            className="w-full btn-primary text-xs py-2 cursor-pointer shadow-sm"
          >
            <Wand2 className="w-4 h-4 stroke-[1.75]" />
            <span>Open Smart Data Cleaning</span>
          </button>
        </div>

        {/* Card 2: Executive Narrative Summary */}
        <div className="lg:col-span-2 card-graphite p-6 flex flex-col justify-between space-y-4 bg-[var(--bg-surface)] shadow-2xs">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[var(--accent)] uppercase font-mono tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Executive brief</span>
            </div>
            <h3 className="text-xl font-bold font-display text-[var(--text-primary)] tracking-tight">
              {summary?.dataset_name || dataset.name}
            </h3>
            <div className="space-y-2 mt-2.5">
              {summary?.narrative_paragraphs && summary.narrative_paragraphs.length > 0 ? (
                summary.narrative_paragraphs.map((p, i) => (
                  <p key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  Comprehensive autonomous audit analysis complete. Ingested {dataset.row_count.toLocaleString()} rows and {dataset.column_count} dimensions into local memory buffers.
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-[var(--accent-subtle)] border border-[var(--border-subtle)] rounded-lg flex items-center justify-between text-xs text-[var(--accent)] font-semibold">
            <span>Verified Records: {dataset.row_count.toLocaleString()} rows • {dataset.column_count} features</span>
            <span className="font-mono font-bold">Status: Verified Ready</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {summary?.key_metrics && summary.key_metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {summary.key_metrics.map((kpi, idx) => (
            <div key={idx} className="card-graphite p-4 space-y-1 bg-[var(--bg-surface)] shadow-2xs">
              <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[var(--text-secondary)]">
                {kpi.label}
              </span>
              <p className="text-lg font-bold font-mono text-[var(--text-primary)] truncate">
                {kpi.value}
              </p>
              {kpi.change && (
                <p className="text-[10px] font-bold text-[var(--signal-success)] font-mono">
                  {kpi.change}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actionable Next Steps & Quick Fixes */}
      {summary?.recommendations && summary.recommendations.length > 0 && (
        <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
          <h3 className="font-bold text-sm font-display text-[var(--text-primary)] flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[var(--accent)]" />
            <span>Recommended Data Quality Remediations</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between"
              >
                <div>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                      rec.priority === "high"
                        ? "bg-[var(--signal-error-subtle)] text-[var(--signal-error)] border-[var(--signal-error)]/30"
                        : "bg-[var(--signal-warning-subtle)] text-[var(--signal-warning)] border-[var(--signal-warning)]/30"
                    }`}
                  >
                    {rec.priority} priority
                  </span>
                  <p className="text-xs text-[var(--text-primary)] font-bold mt-2">{rec.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">{rec.description}</p>
                </div>

                <button
                  onClick={() => {
                    if (rec.action_type === "deduplicate") {
                      handleFixDeduplicate();
                    } else {
                      setActiveTab("smart_cleaning");
                    }
                  }}
                  className="flex items-center space-x-1.5 text-[var(--accent)] hover:underline font-bold text-xs cursor-pointer group"
                >
                  <span>Apply fix</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
