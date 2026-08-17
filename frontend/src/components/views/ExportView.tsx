"use client";

import React from "react";
import { api } from "@/lib/api";
import { DatasetDetail } from "@/types/api";
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Download,
  ShieldCheck,
} from "lucide-react";

interface ExportViewProps {
  dataset: DatasetDetail;
}

export const ExportView: React.FC<ExportViewProps> = ({ dataset }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Top Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--signal-success-subtle)] text-[var(--signal-success)] font-mono text-[10px] font-bold mb-1.5">
          <FileDown className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>EXPORT &amp; COMPLIANCE ARTIFACTS</span>
        </div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
          Multi-Format Export &amp; Audit Studio
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Export cleaned data, immutable snapshot versions, executive summaries, and outlier anomaly logs.
        </p>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1: Multi-Sheet Excel Package */}
        <div className="card-graphite p-6 space-y-5 flex flex-col justify-between bg-[var(--bg-surface)] shadow-2xs">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--signal-success-subtle)] text-[var(--signal-success)] border border-[var(--signal-success)]/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="font-bold text-base font-display text-[var(--text-primary)]">
                Multi-Sheet Executive Excel Workbook (.xlsx)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Comprehensive audit package formatted with OpenPyXL containing styled sheets:
              </p>
            </div>

            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)] shrink-0" />
                <span>Sheet 1: Cleaned &amp; Transformed Master Records</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)] shrink-0" />
                <span>Sheet 2: Executive Summary &amp; Health Dial Score</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)] shrink-0" />
                <span>Sheet 3: Flagged Statistical Anomaly Logs &amp; IQR Scores</span>
              </li>
            </ul>
          </div>

          <a
            href={api.getExcelExportUrl(dataset.id)}
            download
            className="btn-primary text-xs py-2.5 px-4 cursor-pointer shadow-sm text-center justify-center"
          >
            <Download className="w-4 h-4" />
            <span>Download Multi-Sheet Excel (.xlsx)</span>
          </a>
        </div>

        {/* Option 2: Cleaned Raw CSV */}
        <div className="card-graphite p-6 space-y-5 flex flex-col justify-between bg-[var(--bg-surface)] shadow-2xs">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center">
              <FileText className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="font-bold text-base font-display text-[var(--text-primary)]">
                Cleaned Dataset Stream (.csv / UTF-8)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Standard comma-separated value snapshot at current version:
              </p>
            </div>

            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)] shrink-0" />
                <span>UTF-8 encoded standard dataset export</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)] shrink-0" />
                <span>Compatible with Snowflake, BigQuery, Pandas &amp; R</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)] shrink-0" />
                <span>Includes non-destructive cleaned column transformations</span>
              </li>
            </ul>
          </div>

          <a
            href={api.getCSVExportUrl(dataset.id)}
            download
            className="btn-secondary text-xs py-2.5 px-4 cursor-pointer text-center justify-center"
          >
            <Download className="w-4 h-4" />
            <span>Download Cleaned CSV (.csv)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
