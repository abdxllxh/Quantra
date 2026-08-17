"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HeaderNav } from "@/components/layout/HeaderNav";
import ExplodedStack3D from "@/components/3d/ExplodedStack3D";
import ColumnarScan3D from "@/components/3d/ColumnarScan3D";
import VersionTree3D from "@/components/3d/VersionTree3D";
import ScrollReveal from "@/components/ui/ScrollReveal";
import {
  Cpu,
  Server,
  Layers,
  Terminal,
  Database,
  ShieldCheck,
  Zap,
  Code2,
  GitBranch,
  ArrowRight,
  Activity,
  CheckCircle2,
  HardDrive,
  Loader2,
} from "lucide-react";

export default function ArchitecturePage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pinging, setPinging] = useState<boolean>(false);

  const runHealthPing = async () => {
    setPinging(true);
    const start = performance.now();
    try {
      const res = await fetch("http://localhost:8000/health");
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);
      setHealthData(data);
      setPingLatency(elapsed);
    } catch (err: any) {
      setHealthData({ status: "offline", error: err.message });
      setPingLatency(null);
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    runHealthPing();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)] selection:text-white transition-colors">
      <HeaderNav />

      {/* Header with 3D Exploded Architecture Stack */}
      <section className="py-12 md:py-16 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Col (7/12) */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--accent)] font-mono mb-4 shadow-2xs font-bold">
                <Cpu className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>FULL TECHNICAL ARCHITECTURE &amp; SPECIFICATIONS</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-[var(--text-primary)] tracking-tight mb-4">
                System Architecture &amp; Engine Design
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                A high-performance decoupled architecture combining a reactive Next.js 16 frontend with a vectorized Python FastAPI and DuckDB computational engine.
              </p>
            </div>

            {/* Right Col (5/12): 3D Exploded Layer Stack */}
            <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)]">
                <span>EXPLODED_STACK_3D</span>
                <span className="text-[var(--accent)] font-semibold">DECOUPLED TIERS</span>
              </div>
              <ExplodedStack3D />
              <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] flex justify-between">
                <span>UI &rarr; API Gateway &rarr; Vector Kernel</span>
                <span className="text-[var(--signal-success)] font-semibold">3 Service Layers</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 flex-1">
        {/* Architecture Blueprint 3-Layer Breakdown */}
        <section className="space-y-6">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="section-label mb-2">MODULAR LAYERS</span>
                <h2 className="text-xl font-bold font-display text-[var(--text-primary)]">
                  Decoupled Service Architecture
                </h2>
              </div>
              <span className="text-xs font-mono text-[var(--signal-success)] bg-[var(--signal-success-subtle)] border border-[var(--border-subtle)] px-2.5 py-1 rounded font-semibold self-start sm:self-auto">
                Decoupled Local Microservices
              </span>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Layer 1 */}
            <ScrollReveal delay={0}>
              <div className="card-graphite p-6 space-y-4 h-full bg-[var(--bg-surface)]">
                <div className="w-10 h-10 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--accent)] flex items-center justify-center font-mono font-bold text-sm">
                  01
                </div>
                <div>
                  <h3 className="font-bold text-base font-display text-[var(--text-primary)]">
                    Client Interface Layer
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Next.js 16 • Turbopack • Port 3000</p>
                </div>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>Turbopack Reactive Component Tree</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>Zustand In-Memory State &amp; Lineage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>Recharts Dynamic Color Vector Visualizations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>3 Dynamic Adaptive Theme System</span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>

            {/* Layer 2 */}
            <ScrollReveal delay={0.1}>
              <div className="card-graphite p-6 space-y-4 h-full bg-[var(--bg-surface)]">
                <div className="w-10 h-10 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--accent)] flex items-center justify-center font-mono font-bold text-sm">
                  02
                </div>
                <div>
                  <h3 className="font-bold text-base font-display text-[var(--text-primary)]">
                    Asynchronous API Gateway
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">FastAPI ASGI • Python 3.11 • Port 8000</p>
                </div>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>Uvicorn High-Concurrency Event Loop</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>Pydantic v2 Strict Request Validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>Zero-Loss Snapshot Versioning Tree</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>OpenAPI Interactive Swagger Endpoints</span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>

            {/* Layer 3 */}
            <ScrollReveal delay={0.2}>
              <div className="card-graphite p-6 space-y-4 h-full bg-[var(--bg-surface)]">
                <div className="w-10 h-10 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--signal-success)] flex items-center justify-center font-mono font-bold text-sm">
                  03
                </div>
                <div>
                  <h3 className="font-bold text-base font-display text-[var(--text-primary)]">
                    Vectorized Math &amp; ML Engine
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">DuckDB • Pandas • Scikit-Learn</p>
                </div>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>DuckDB Sub-10ms Columnar Execution</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>Pandas Vectorized Statistical Profiler</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>Scikit-Learn Isolation Forest Outliers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 stroke-[1.75]" />
                    <span>SQLite Persistence with SQLAlchemy ORM</span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* 3D Visualizers */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ScrollReveal>
            <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                    DuckDB Columnar Vector Scan
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">Sub-10ms column-level vectorized memory scans</p>
                </div>
                <span className="text-[10px] font-mono text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)] font-bold">
                  VECTOR_SCAN
                </span>
              </div>
              <ColumnarScan3D />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                    Immutable Lineage &amp; State Tree
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">SHA-256 cryptographic snapshot rollbacks</p>
                </div>
                <span className="text-[10px] font-mono text-[var(--signal-success)] bg-[var(--signal-success-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)] font-bold">
                  LINEAGE_TREE
                </span>
              </div>
              <VersionTree3D />
            </div>
          </ScrollReveal>
        </section>

        {/* Live Backend Telemetry Console (Dark Panel) */}
        <ScrollReveal>
          <section className="p-6 bg-[var(--code-bg)] text-[var(--code-text)] border border-[var(--code-border)] rounded-xl space-y-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base font-display text-[var(--code-text)] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--signal-success)] stroke-[1.75]" />
                  <span>Live Backend Engine Diagnostic Monitor</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                  Diagnostic ping to http://localhost:8000/health
                </p>
              </div>

              <button
                onClick={runHealthPing}
                disabled={pinging}
                className="btn-primary text-xs py-2 px-4 cursor-pointer disabled:opacity-50"
              >
                {pinging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>Test Live Ping</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#050806] border border-[var(--code-border)] rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Engine Status</span>
                <p className="text-base font-bold font-mono text-[var(--signal-success)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--signal-success)] animate-pulse" />
                  <span>{healthData?.status?.toUpperCase() || "ONLINE"}</span>
                </p>
              </div>

              <div className="p-4 bg-[#050806] border border-[var(--code-border)] rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">HTTP Response Latency</span>
                <p className="text-base font-bold font-mono text-[var(--code-text)]">
                  {pingLatency !== null ? `${pingLatency} ms` : "Measuring..."}
                </p>
              </div>

              <div className="p-4 bg-[#050806] border border-[var(--code-border)] rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Target Service</span>
                <p className="text-base font-bold font-mono text-[var(--accent)]">
                  {healthData?.service || "Quantura FastAPI Engine"}
                </p>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>
    </div>
  );
}
