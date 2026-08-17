"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  Database,
  GitBranch,
  Terminal,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Code2,
} from "lucide-react";
import { HeaderNav } from "@/components/layout/HeaderNav";
import DivergingPaths3D from "@/components/3d/DivergingPaths3D";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function WhyQuanturaPage() {
  const comparisonMatrix = [
    {
      feature: "Computation Guarantee",
      datalens: "100% Deterministic (Python / NumPy AST execution)",
      traditionalBi: "Deterministic (Requires manual SQL / DAX modeling)",
      genericAi: "Probabilistic (LLM predicts next tokens, hallucinating numbers)",
    },
    {
      feature: "Data Privacy & Row Security",
      datalens: "Zero row exfiltration (Only schema metadata parsed)",
      traditionalBi: "Self-hosted or Enterprise Cloud (SOC2 / VPC)",
      genericAi: "Raw CSV/data rows transmitted to external 3rd-party LLMs",
    },
    {
      feature: "Query & Vector Performance",
      datalens: "Sub-10ms in-memory DuckDB columnar scans",
      traditionalBi: "1s – 60s dependent on warehouse cluster sizing",
      genericAi: "3s – 15s LLM generation latency + inference costs",
    },
    {
      feature: "Non-Destructive Lineage",
      datalens: "Cryptographic SHA-256 rollback to any historical point",
      traditionalBi: "Manual dbt / git warehouse migrations required",
      genericAi: "No state tracking; each chat prompt resets context",
    },
    {
      feature: "Statistical Rigor & Anomaly Detection",
      datalens: "Scikit-Learn Isolation Forests & Parametric IQR",
      traditionalBi: "Basic standard deviation thresholds / static rules",
      genericAi: "Subjective text commentary without statistical validation",
    },
    {
      feature: "Time to First Insight",
      datalens: "< 5 seconds (Instant drag-and-drop auto-profiling)",
      traditionalBi: "Days to weeks (Schema design, ETL pipelines)",
      genericAi: "Instant, but results require manual cross-checking",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)] selection:text-white transition-colors">
      <HeaderNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header Claim with 3D Diverging Paths */}
        <div className="border-b border-[var(--border-subtle)] pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--accent)] font-mono mb-4 shadow-2xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>TECHNICAL SPECIFICATION &amp; ARCHITECTURE PROOF</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-[var(--text-primary)] tracking-tight leading-tight mb-6">
            Why Deterministic Compute Beats LLM Number Guessing
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-3xl mb-8">
            Most &ldquo;AI analytics&rdquo; tools make a fundamental architectural error: they ask Large
            Language Models to compute mathematics. Because LLMs are probabilistic token predictors,
            they frequently generate plausible-sounding but mathematically incorrect sums, variances, and correlations.
          </p>

          {/* 3D Diverging Paths Visualization */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)]">
              <span className="text-[var(--signal-warning)] font-bold">LLM: UNSTABLE FRAGMENTED JITTER</span>
              <span className="text-[var(--accent)] font-bold">QUANTURA: SOLID DETERMINISTIC COMPUTE</span>
            </div>
            <DivergingPaths3D />
            <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] flex justify-between">
              <span>Probabilistic Hallucination Cloud</span>
              <span>100% Deterministic Python / DuckDB Kernel</span>
            </div>
          </div>
        </div>

        {/* 1. Architecture Claim Section */}
        <ScrollReveal>
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-graphite p-6 bg-[var(--bg-surface)]">
                <div className="flex items-center gap-2 mb-3 text-[var(--signal-warning)] font-mono text-xs font-bold uppercase">
                  <XCircle className="w-4 h-4 stroke-[1.75]" />
                  <span>The LLM Hallucination Flaw</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                  When you ask a generic AI chat tool &ldquo;What is the median churn rate across cohort B?&rdquo;,
                  it attempts to output the final number token-by-token from neural weights. It does not run arithmetic.
                  On large tables, calculation accuracy degrades below 65%.
                </p>
                <div className="p-3.5 bg-[var(--code-bg)] text-[var(--code-text)] rounded-lg border border-[var(--code-border)] font-mono text-[11px] text-[var(--signal-warning)]">
                  <code>Prompt &rarr; [LLM Token Predictor] &rarr; &ldquo;The median churn is $41,200&rdquo; (Hallucinated)</code>
                </div>
              </div>

              <div className="card-graphite-active p-6 bg-[var(--bg-surface)]">
                <div className="flex items-center gap-2 mb-3 text-[var(--signal-success)] font-mono text-xs font-bold uppercase">
                  <CheckCircle2 className="w-4 h-4 stroke-[1.75]" />
                  <span>The Quantura Deterministic Approach</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                  Quantura uses AI strictly as a semantic translator to parse your intent into verified
                  Python Abstract Syntax Trees (AST). The generated code runs against localized
                  NumPy/Pandas and DuckDB kernels. The result is mathematically exact every single time.
                </p>
                <div className="p-3.5 bg-[var(--code-bg)] text-[var(--code-text)] rounded-lg border border-[var(--code-border)] font-mono text-[11px] text-[var(--signal-success)]">
                  <code>Intent &rarr; AST Generator &rarr; [NumPy / DuckDB Kernel] &rarr; 41,894.22 (Certified)</code>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 2. Comprehensive Staggered Comparison Matrix */}
        <section className="mb-16">
          <ScrollReveal>
            <div className="mb-6">
              <span className="section-label mb-2">BENCHMARK COMPARISON</span>
              <h2 className="text-2xl font-bold font-display text-[var(--text-primary)]">
                Quantura vs. Traditional BI vs. Generic AI Tools
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-surface)] shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] font-mono text-[var(--text-secondary)]">
                      <th className="p-4 w-1/4">CAPABILITY / AXIS</th>
                      <th className="p-4 w-1/4 text-[var(--accent)] font-bold">QUANTURA</th>
                      <th className="p-4 w-1/4">TRADITIONAL BI (PowerBI / Tableau)</th>
                      <th className="p-4 w-1/4">GENERIC CSV-CHAT AI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {comparisonMatrix.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-surface-subtle)] transition-colors">
                        <td className="p-4 font-semibold text-[var(--text-primary)] font-display">
                          {row.feature}
                        </td>
                        <td className="p-4 text-[var(--text-primary)] bg-[var(--accent-subtle)] font-medium">
                          <div className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--signal-success)] shrink-0 mt-0.5 stroke-[1.75]" />
                            <span>{row.datalens}</span>
                          </div>
                        </td>
                        <td className="p-4 text-[var(--text-secondary)]">
                          <div className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] shrink-0 mt-1.5" />
                            <span>{row.traditionalBi}</span>
                          </div>
                        </td>
                        <td className="p-4 text-[var(--text-secondary)]">
                          <div className="flex items-start gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-[var(--signal-warning)] shrink-0 mt-0.5 stroke-[1.75]" />
                            <span>{row.genericAi}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* 3. Under the Hood: Pipeline Architecture Diagram */}
        <section className="mb-16">
          <ScrollReveal>
            <div className="mb-6">
              <span className="section-label mb-2">SYSTEM ARCHITECTURE</span>
              <h2 className="text-2xl font-bold font-display text-[var(--text-primary)]">
                Under The Hood: End-to-End Execution Pipeline
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Deterministic separation between semantic parsing and vectorized computation.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="card-graphite p-6 space-y-6 bg-[var(--bg-surface)]">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Step 1 */}
                <div className="p-4 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] mb-2">
                      <span>STAGE 01</span>
                      <Database className="w-3.5 h-3.5 text-[var(--accent)] stroke-[1.75]" />
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                      Local Data Ingestion
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      CSV, Parquet, or Excel files parsed in-memory into typed Apache Arrow / DuckDB tables.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--signal-success)] font-semibold">
                    Zero cloud upload
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] mb-2">
                      <span>STAGE 02</span>
                      <Terminal className="w-3.5 h-3.5 text-[var(--accent)] stroke-[1.75]" />
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                      AST Code Translation
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Natural language prompt converted strictly into verified Python/SQL execution scripts.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] font-semibold">
                    AST validated
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] mb-2">
                      <span>STAGE 03</span>
                      <Cpu className="w-3.5 h-3.5 text-[var(--signal-success)] stroke-[1.75]" />
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                      FastAPI Sandboxing
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Sub-second execution in isolated Python runtime with NumPy, Scikit-Learn, and DuckDB.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--signal-success)] font-semibold">
                    Sub-10ms compute
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] mb-2">
                      <span>STAGE 04</span>
                      <GitBranch className="w-3.5 h-3.5 text-[var(--text-secondary)] stroke-[1.75]" />
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                      Immutable Lineage Log
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Results, transformed vectors, and snapshots persisted with cryptographic SHA signatures.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-secondary)] font-semibold">
                    Full rollback capability
                  </div>
                </div>

              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Bottom CTA */}
        <ScrollReveal>
          <div className="card-graphite p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[var(--bg-surface)]">
            <div>
              <h3 className="text-lg font-bold font-display text-[var(--text-primary)] mb-1">
                Verify It On Your Own Data
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Launch the workspace, drag in your dataset, and inspect generated execution code.
              </p>
            </div>
            <Link
              href="/workspace"
              className="btn-primary text-xs py-2.5 px-5 cursor-pointer shrink-0 shadow-sm"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4 stroke-[1.75]" />
            </Link>
          </div>
        </ScrollReveal>
      </main>
    </div>
  );
}
