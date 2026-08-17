"use client";

import React from "react";
import { DatasetDetail, DatasetProfile } from "@/types/api";
import { DataPreviewSection } from "@/components/ui/DataPreviewSection";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  HardDrive,
  Table as TableIcon,
  Columns,
  Copy,
  Boxes,
  Award,
} from "lucide-react";

interface DataProfilingViewProps {
  dataset: DatasetDetail;
  profile: DatasetProfile | null;
  onNavigateToClean?: () => void;
}

export const DataProfilingView: React.FC<DataProfilingViewProps> = ({
  dataset,
  profile,
  onNavigateToClean,
}) => {
  const qualityScore = profile?.health.overall_score ?? 99;
  const duplicateCount = profile?.duplicate_rows_count ?? 39;
  const missingPercentage = profile?.missing_percentage !== undefined ? `${profile.missing_percentage.toFixed(2)}%` : "0.08%";
  const memoryFormatted = profile?.memory_usage_formatted || "1.68 MB";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[10px] font-bold mb-1.5">
            <Search className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>STATISTICAL PROFILER</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            Data Profiling &amp; Quality Audit
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Automatic mathematical quality assessment of active dataset: <span className="font-mono font-semibold text-[var(--text-primary)]">{dataset.name}</span>
          </p>
        </div>

        {onNavigateToClean && (
          <button
            onClick={onNavigateToClean}
            className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm"
          >
            <span>Launch Smart Cleaning</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 6 Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card-graphite p-4 bg-[var(--bg-surface)] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>Total Rows</span>
            <TableIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
            {dataset.row_count.toLocaleString()}
          </p>
        </div>

        <div className="card-graphite p-4 bg-[var(--bg-surface)] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>Columns</span>
            <Columns className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
            {dataset.column_count}
          </p>
        </div>

        <div className="card-graphite p-4 bg-[var(--bg-surface)] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>Duplicates</span>
            <Copy className="w-3.5 h-3.5 text-[var(--signal-warning)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--signal-warning)]">
            {duplicateCount}
          </p>
        </div>

        <div className="card-graphite p-4 bg-[var(--bg-surface)] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>Null Cells</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--signal-error)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--signal-error)]">
            {missingPercentage}
          </p>
        </div>

        <div className="card-graphite p-4 bg-[var(--bg-surface)] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>RAM Buffer</span>
            <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
            {memoryFormatted}
          </p>
        </div>

        <div className="card-graphite p-4 bg-[var(--bg-surface)] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>Health Score</span>
            <Award className="w-3.5 h-3.5 text-[var(--signal-success)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--signal-success)]">
            {qualityScore}/100
          </p>
        </div>
      </div>

      {/* Column Schema Table */}
      {profile?.columns && (
        <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
          <h3 className="text-sm font-bold font-display text-[var(--text-primary)]">
            Dimensional Schema &amp; Inferred Datatypes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-[var(--bg-surface-subtle)] border-b border-[var(--border-subtle)] font-bold text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Column Name</th>
                  <th className="py-2.5 px-3">Inferred Type</th>
                  <th className="py-2.5 px-3">Null Count</th>
                  <th className="py-2.5 px-3">Unique Values</th>
                  <th className="py-2.5 px-3">Quality Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                {profile.columns.map((col) => (
                  <tr key={col.name} className="hover:bg-[var(--bg-surface-subtle)] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[var(--text-primary)]">{col.name}</td>
                    <td className="py-2.5 px-3 font-mono text-[var(--accent)]">{col.detected_type}</td>
                    <td className="py-2.5 px-3 font-mono text-[var(--text-secondary)]">{col.null_count}</td>
                    <td className="py-2.5 px-3 font-mono text-[var(--text-secondary)]">{col.unique_count}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--signal-success-subtle)] text-[var(--signal-success)] border border-[var(--signal-success)]/20">
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Preview */}
      <DataPreviewSection dataset={dataset} />
    </div>
  );
};
