"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { DatasetDetail, DatasetProfile } from "@/types/api";
import {
  ShieldCheck,
  X,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface AuditModalProps {
  dataset: DatasetDetail;
  profile: DatasetProfile | null;
}

export const AuditModal: React.FC<AuditModalProps> = ({ dataset, profile }) => {
  const { isAuditModalOpen, setAuditModalOpen, setActiveTab } = useAppStore();
  const [step, setStep] = useState<number>(1);

  useEffect(() => {
    if (isAuditModalOpen) {
      setStep(1);
      const t1 = setTimeout(() => setStep(2), 300);
      const t2 = setTimeout(() => setStep(3), 600);
      const t3 = setTimeout(() => setStep(4), 900);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isAuditModalOpen]);

  if (!isAuditModalOpen) return null;

  const healthScore = profile?.health.overall_score || 95;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--signal-success-subtle)] text-[var(--signal-success)] border border-[var(--signal-success)]/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-sm font-display">
                Automated Integrity Audit Report
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">Verification for {dataset.name}</p>
            </div>
          </div>
          <button
            onClick={() => setAuditModalOpen(false)}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Health Summary Card */}
          <div className="p-4 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                OVERALL INTEGRITY SCORE
              </span>
              <p className="text-2xl font-bold font-display text-[var(--signal-success)]">
                {healthScore} / 100
              </p>
            </div>
            <div className="text-right text-xs font-mono text-[var(--text-secondary)]">
              <span>{dataset.row_count.toLocaleString()} rows</span>
              <br />
              <span>{dataset.column_count} features</span>
            </div>
          </div>

          {/* Test Steps Progression */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs p-2 rounded bg-[var(--bg-surface-subtle)]">
              <span className="font-medium text-[var(--text-primary)]">1. Schema &amp; Type Allocation Check</span>
              {step >= 1 ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)]" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded bg-[var(--bg-surface-subtle)]">
              <span className="font-medium text-[var(--text-primary)]">2. Missing Value Boundary Fences</span>
              {step >= 2 ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)]" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded bg-[var(--bg-surface-subtle)]">
              <span className="font-medium text-[var(--text-primary)]">3. Duplicate Row &amp; Primary Key Test</span>
              {step >= 3 ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)]" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded bg-[var(--bg-surface-subtle)]">
              <span className="font-medium text-[var(--text-primary)]">4. Multi-Variate Isolation Forest Scan</span>
              {step >= 4 ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--signal-success)]" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-end gap-3">
          <button
            onClick={() => setAuditModalOpen(false)}
            className="btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              setAuditModalOpen(false);
              setActiveTab("smart_cleaning");
            }}
            className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm"
          >
            <span>Open Cleaning Workbench</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
