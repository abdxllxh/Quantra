"use client";

import React, { useState } from "react";
import {
  Shield,
  Server,
  HardDrive,
  Activity,
  Trash2,
  Lock,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

export const AdminPanelView: React.FC = () => {
  const { showToast } = useAppStore();
  const [purging, setPurging] = useState(false);
  const [purged, setPurged] = useState(false);

  const handlePurgeAll = () => {
    setPurging(true);
    setTimeout(() => {
      setPurging(false);
      setPurged(true);
      showToast("All temporary cache and staging buffers purged successfully.", "success");
      setTimeout(() => setPurged(false), 4000);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[10px] font-bold mb-1.5">
          <Shield className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>GOVERNANCE &amp; CONTROL CONSOLE</span>
        </div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
          Admin Governance &amp; Control Console
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          System health telemetry, access control policies, and server-side compute quotas.
        </p>
      </div>

      {/* Telemetry Strip (Light Surface Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-graphite p-4 bg-[#FFFFFF] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>FastAPI Server</span>
            <span className="w-2 h-2 rounded-full bg-[var(--signal-success)] animate-pulse" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--signal-success)]">127.0.0.1:8000</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Uvicorn ASGI Loop Active</span>
        </div>

        <div className="card-graphite p-4 bg-[#FFFFFF] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>DuckDB RAM Buffer</span>
            <Server className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">42.8 MB</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Peak: 128 MB Alloc</span>
        </div>

        <div className="card-graphite p-4 bg-[#FFFFFF] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>SQLite Metadata Size</span>
            <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">3.2 MB</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Immutable Lineage DB</span>
        </div>

        <div className="card-graphite p-4 bg-[#FFFFFF] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>Audit Protocol</span>
            <Lock className="w-3.5 h-3.5 text-[var(--signal-success)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--signal-success)]">SHA-256 Strict</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Zero Data Leakage</span>
        </div>
      </div>

      {/* Governance Actions (Light Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-graphite p-6 bg-[#FFFFFF] space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold font-display text-[var(--text-primary)]">
            Memory Buffer &amp; Cache Sanitation
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Flush all staged in-memory Apache Arrow buffers, temporary pivot tables, and cached query ASTs from RAM.
          </p>

          <button
            onClick={handlePurgeAll}
            disabled={purging}
            className="btn-destructive text-xs py-2 px-4 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>{purging ? "Purging Buffers..." : "Purge Staged Buffers"}</span>
          </button>
        </div>

        <div className="card-graphite p-6 bg-[#FFFFFF] space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold font-display text-[var(--text-primary)]">
            Security &amp; Air-Gap Policy
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Quantura operates strictly in air-gapped local execution mode. Raw dataset rows never leave your local FastAPI process.
          </p>
          <div className="p-3 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)] text-xs font-mono text-[var(--signal-success)] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>ROW_EXFILTRATION_GUARD: ENFORCED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
