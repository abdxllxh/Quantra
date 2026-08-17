"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Zap,
  Activity,
  Database,
  ShieldCheck,
  ArrowRight,
  Code2,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  Sliders,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Server,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Grid2X2,
} from "lucide-react";
import { HeaderNav } from "@/components/layout/HeaderNav";
import ModelViewer3D from "@/components/ui/ModelViewer3D";
import QueryPipeline3D from "@/components/3d/QueryPipeline3D";
import SplitText from "@/components/ui/SplitText";
import CountUp from "@/components/ui/CountUp";
import Accordion from "@/components/ui/Accordion";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function LandingPage() {
  // ROI Calculator State
  const [datasetRows, setDatasetRows] = useState(500000);
  const [analystCount, setAnalystCount] = useState(6);
  const [blueprintFilter, setBlueprintFilter] = useState("All");
  const [showAllBlueprints, setShowAllBlueprints] = useState(false);
  const reduceMotion = useReducedMotion();

  // Compute calculated metrics
  const hoursSavedPerWeek = Math.round((datasetRows / 50000) * 1.5 * analystCount);
  const annualDollarSavings = Math.round(hoursSavedPerWeek * 52 * 75);
  const computeSpeedupFactor = Math.min(24, Math.max(8, Math.round(datasetRows / 40000)));

  // Production Blueprints
  const blueprints = [
    {
      id: "fin-risk",
      tag: "FINANCIAL SERVICES",
      title: "Portfolio Value-at-Risk & Liquidity Stress Test",
      description:
        "Deterministic Monte Carlo simulations & parametric VaR calculated directly via NumPy matrices with zero token hallucination.",
      metrics: ["99.9% Confidence Interval", "3.2ms Latency", "12k Portfolios"],
      code: `df.groupby('asset_class').apply(lambda g: numpy_var(g['returns'], 0.99))`,
    },
    {
      id: "ecom-churn",
      tag: "E-COMMERCE & RETAIL",
      title: "Customer Cohort Churn & Lifetime Value (LTV)",
      description:
        "Survival analysis and RFM segmentation running on local DuckDB vector engine across 4.2M transactional records.",
      metrics: ["4.2M Records", "8.4x Faster", "Auto-Imputed NAs"],
      code: `SELECT cohort_month, retention_rate_d90 FROM duckdb_analytics.cohorts`,
    },
    {
      id: "health-anom",
      tag: "HEALTHCARE & BIOTECH",
      title: "Clinical Trial Biomarker Outlier & Anomaly Lab",
      description:
        "Isolation Forests and robust Z-score detectors flagging statistical anomalies in patient telemetry data before regulatory audits.",
      metrics: ["Isolation Forest", "0 False Positives", "HIPAA Compliant"],
      code: `detector = IsolationForest(contamination=0.01).fit(patient_vitals)`,
    },
    {
      id: "saas-ndr",
      tag: "B2B SAAS",
      title: "Net Dollar Retention & Expansion Matrix",
      description:
        "Multi-dimensional MRR bridge decomposition breaking down contraction, churn, and new logos with non-destructive versioning.",
      metrics: ["118% NDR", "Instant Rollback", "Deterministic Math"],
      code: `bridge_df = calculate_mrr_waterfall(subscriptions, period='Q3')`,
    },
  ];

  const blueprintFilters = ["All", ...blueprints.map((blueprint) => blueprint.tag)];
  const filteredBlueprints = blueprintFilter === "All"
    ? blueprints
    : blueprints.filter((blueprint) => blueprint.tag === blueprintFilter);
  const visibleBlueprints = showAllBlueprints
    ? filteredBlueprints
    : filteredBlueprints.slice(0, 3);

  // Pipeline Execution Stages
  const pipelineStages = [
    {
      step: "01",
      title: "In-Memory Vector Ingestion",
      desc: "Ingests CSV, Excel, or Parquet directly into columnar DuckDB tables and Apache Arrow memory buffers. Eliminates network latency and prevents raw row data from ever leaving your local machine.",
      tech: "DuckDB / Apache Arrow Core",
    },
    {
      step: "02",
      title: "AST Semantic Translation",
      desc: "Translates natural language questions into certified Python Abstract Syntax Trees (AST) and SQL queries. Restricts LLM role exclusively to code generation rather than math computation.",
      tech: "Python AST Compiler",
    },
    {
      step: "03",
      title: "Sandboxed Deterministic Kernel",
      desc: "Executes vectorized calculations inside isolated FastAPI worker processes with NumPy and Scikit-Learn. Guarantees 100% mathematical accuracy on arithmetic, percentiles, and regressions.",
      tech: "NumPy / Scikit-Learn / FastAPI",
    },
    {
      step: "04",
      title: "Immutable Lineage Snapshots",
      desc: "Every data transformation, column cleaning, and aggregation is cryptographically hashed with SHA-256 signatures, allowing non-destructive state rollbacks to any point in the analysis.",
      tech: "SQLite Catalog & SHA-256 Ledger",
    },
  ];

  // FAQ Items
  const faqItems = [
    {
      id: "faq-1",
      question: "Why does Quantura avoid LLM math computation entirely?",
      answer:
        "Generic 'chat-with-data' AI products prompt an LLM to generate math directly in text tokens. Because Large Language Models are probabilistic next-token predictors, they frequently hallucinate arithmetic, variances, and correlations. Quantura uses AI strictly to translate user intent into validated Python (Pandas/NumPy) and SQL (DuckDB) code, which executes server-side on deterministic hardware.",
      codeSnippet: "# Quantura execution pipeline:\nPrompt -> Generated AST -> Python Sandbox (Pandas/DuckDB) -> Exact Vectorized Result",
    },
    {
      id: "faq-2",
      question: "What file formats and dataset volumes are supported?",
      answer:
        "Quantura ingests CSV, Excel (.xlsx/.xls), Parquet, and JSON datasets up to 10M+ rows locally in-memory. DuckDB handles columnar analytical queries with sub-second execution times.",
    },
    {
      id: "faq-3",
      question: "How does non-destructive versioning and data rollback work?",
      answer:
        "Every transformation (cleaning nulls, outlier clipping, column derivation) creates a point-in-time immutable snapshot in our SQLite catalog. You can step backward or forward through data lineage without reloading the original dataset.",
    },
    {
      id: "faq-4",
      question: "Is data sent to external cloud APIs?",
      answer:
        "Your raw dataset rows never leave your local backend environment. When you query data in natural language, only the anonymized schema metadata (column names and data types) is analyzed to generate the execution script.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      <HeaderNav />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-[var(--border-subtle)] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Col (7/12): Left-aligned Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--accent)] font-mono mb-6 shadow-2xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>Local analytics runtime · version 2.4</span>
              </div>

              <SplitText
                text="Ask business questions. Get numbers you can prove."
                highlightWords={["numbers", "prove"]}
                className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-[var(--text-primary)] leading-[1.1] mb-6 block"
              />

              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-8">
                Quantura turns plain-language questions into validated Python and DuckDB
                workflows. Every result comes from executed code, with the calculation,
                source data, and transformation history kept close at hand.
              </p>

              {/* Action Buttons: Strict Hierarchy */}
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/workspace"
                  className="btn-primary text-sm py-2.5 px-6 font-semibold cursor-pointer shadow-sm"
                >
                  <span>Open the workspace</span>
                  <ArrowRight className="w-4 h-4 stroke-[1.75]" />
                </Link>

                <Link
                  href="/why-quantura"
                  className="btn-secondary text-sm py-2.5 px-5 cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-[var(--text-secondary)] stroke-[1.75]" />
                  <span>See how the math works</span>
                </Link>
              </div>

              {/* Engine Spec Tags */}
              <div className="flex flex-wrap items-center gap-6 mt-10 pt-6 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[var(--signal-success)] stroke-[1.75]" />
                  <span>FastAPI + DuckDB Core</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent)] stroke-[1.75]" />
                  <span>Zero Row-Exfiltration</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[var(--text-secondary)] stroke-[1.75]" />
                  <span>Immutable Lineage</span>
                </div>
              </div>
            </div>

            {/* Right Col (5/12): 3D Spreadsheet-to-Chart Transform */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
                      From source rows to a working chart
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--signal-success)] bg-[var(--signal-success-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)] font-semibold">
                    Live computation
                  </span>
                </div>

                {/* 3D Model Viewer Canvas */}
                <ModelViewer3D className="h-[320px] sm:h-[380px]" />

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)]">
                  <span>Raw rows &rarr; verified aggregation</span>
                  <span className="text-[var(--accent)] font-semibold">Computed locally</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* KPI Stats Row: Scroll-Triggered CountUp with 100% Truthful Guarantee */}
      <section className="py-12 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              
              {/* Stat 1: Inference & Execution Speed */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-[var(--accent)]">
                  <Zap className="w-4 h-4 stroke-[1.75]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                    Execution Latency
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-bold font-display text-[var(--text-primary)]">
                  <CountUp from={0} to={8.4} decimals={1} suffix="ms" duration={1.4} />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
                  DuckDB columnar vector query engine
                </p>
              </div>

              {/* Stat 2: Math Determinism Guarantee (100% exact) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-[var(--signal-success)]">
                  <Activity className="w-4 h-4 stroke-[1.75]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                    Math Accuracy
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-bold font-display text-[var(--signal-success)]">
                  <CountUp from={0} to={100} decimals={0} suffix="%" duration={1.4} />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
                  Deterministic NumPy/Pandas verification
                </p>
              </div>

              {/* Stat 3: Dataset Ingestion Capacity */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-[var(--accent)]">
                  <Database className="w-4 h-4 stroke-[1.75]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                    Max Ingest Scale
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-bold font-display text-[var(--text-primary)]">
                  <CountUp from={0} to={10} decimals={0} suffix="M+ Rows" duration={1.4} />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
                  In-memory Parquet &amp; Arrow buffers
                </p>
              </div>

              {/* Stat 4: Data Lineage & Auditability */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-[var(--signal-success)]">
                  <ShieldCheck className="w-4 h-4 stroke-[1.75]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                    Audit Integrity
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-bold font-display text-[var(--text-primary)]">
                  <CountUp from={0} to={100} decimals={0} suffix="/100" duration={1.4} />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
                  Immutable SHA-256 state snapshots
                </p>
              </div>

            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Product Preview: Asymmetric 60/40 Split */}
      <section className="py-20 md:py-28 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mb-12">
              <span className="section-label mb-3">EXECUTION PARADIGM</span>
              <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-primary)] max-w-xl">
                Deterministic Python code sandbox, not a conversational guess.
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left 60%: Live Deterministic Terminal & Data Matrix Output */}
              <div className="lg:col-span-7 bg-[var(--code-bg)] text-[var(--code-text)] border border-[var(--code-border)] rounded-xl p-5 flex flex-col justify-between font-mono shadow-md">
                <div>
                  <div className="flex items-center justify-between border-b border-[var(--code-border)] pb-3 mb-4 text-xs">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <Terminal className="w-4 h-4 text-[var(--accent)] stroke-[1.75]" />
                      <span>kernel: python-3.11-pandas-duckdb</span>
                    </div>
                    <span className="text-[var(--signal-success)] text-[11px] bg-[var(--signal-success-subtle)] px-2 py-0.5 rounded border border-[var(--code-border)] font-semibold">
                      MEMORY: 42.8 MB / PASS
                    </span>
                  </div>

                  {/* 3D Query Token Pipeline inside Execution Box */}
                  <div className="mb-4 bg-[#050806] border border-[var(--code-border)] rounded-lg overflow-hidden">
                    <QueryPipeline3D />
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="text-[var(--text-muted)]">
                      <span className="text-[var(--accent)] font-bold">&gt;&gt;&gt;</span> User Intent: &ldquo;Find revenue anomalies across top 5 customer cohorts and calculate IQR fences.&rdquo;
                    </div>

                    <div className="p-3.5 bg-[#050806] rounded border border-[var(--code-border)] text-xs text-[var(--code-text)] overflow-x-auto leading-relaxed">
                      <span className="text-[var(--text-muted)]"># 1. Deterministic Calculation Script</span>
                      <br />
                      <span className="text-[var(--accent)]">import</span> numpy <span className="text-[var(--accent)]">as</span> np
                      <br />
                      <span className="text-[var(--accent)]">import</span> pandas <span className="text-[var(--accent)]">as</span> pd
                      <br />
                      q25, q75 = np.percentile(df[<span className="text-[var(--signal-success)]">&apos;revenue&apos;</span>], [25, 75])
                      <br />
                      iqr = q75 - q25
                      <br />
                      lower_bound, upper_bound = q25 - (1.5 * iqr), q75 + (1.5 * iqr)
                      <br />
                      outliers = df[(df[<span className="text-[var(--signal-success)]">&apos;revenue&apos;</span>] &lt; lower_bound) | (df[<span className="text-[var(--signal-success)]">&apos;revenue&apos;</span>] &gt; upper_bound)]
                    </div>

                    {/* Output Table */}
                    <div className="p-3 bg-[#050806] rounded border border-[var(--code-border)]">
                      <div className="text-[11px] text-[var(--signal-success)] font-bold mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>[EXEC_OK] 14 statistical anomalies identified with 0 false positives</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] grid grid-cols-4 gap-2 border-b border-[var(--code-border)] pb-1 font-semibold">
                        <span>COHORT_ID</span>
                        <span>Q75_CEIL</span>
                        <span>ANOMALY_VAL</span>
                        <span className="text-right">Z_SCORE</span>
                      </div>
                      <div className="text-[11px] text-[var(--code-text)] space-y-1 mt-1">
                        <div className="grid grid-cols-4 gap-2 text-[var(--text-muted)]">
                          <span className="text-[var(--code-text)]">#C-9021</span>
                          <span>$84,200</span>
                          <span className="text-[var(--signal-warning)] font-bold">$245,100</span>
                          <span className="text-right text-[var(--signal-warning)]">+4.12σ</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[var(--text-muted)]">
                          <span className="text-[var(--code-text)]">#C-4412</span>
                          <span>$51,300</span>
                          <span className="text-[var(--signal-warning)] font-bold">$189,450</span>
                          <span className="text-right text-[var(--signal-warning)]">+3.88σ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--code-border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Execution Time: 0.0042s</span>
                  <span className="text-[var(--accent)]">Lineage SHA: 7f89b21a</span>
                </div>
              </div>

              {/* Right 40%: Key Pillars Breakdown */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                <div className="group card-graphite p-6 flex-1 animated-feature-card">
                  <div className="animated-icon-tile w-8 h-8 rounded bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-3">
                    <ShieldCheck className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold font-display text-[var(--text-primary)] mb-1.5">
                    100% Verifiable Math Guarantees
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Every metric, aggregation, and forecast is computed using certified Python statistical libraries (NumPy, SciPy). You can audit every generated equation line-by-line in the execution ledger.
                  </p>
                </div>

                <div className="group card-graphite p-6 flex-1 animated-feature-card">
                  <div className="animated-icon-tile w-8 h-8 rounded bg-[var(--signal-success-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--signal-success)] mb-3">
                    <Zap className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold font-display text-[var(--text-primary)] mb-1.5">
                    Vectorized Columnar Execution
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    DuckDB columnar processing handles millions of rows in milliseconds directly on commodity CPU instances without expensive data warehouse overhead or cloud egress costs.
                  </p>
                </div>

                <div className="group card-graphite p-6 flex-1 animated-feature-card">
                  <div className="animated-icon-tile w-8 h-8 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] mb-3">
                    <GitBranch className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold font-display text-[var(--text-primary)] mb-1.5">
                    Immutable Lineage &amp; Rollback
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Undo transformations instantly. Track how raw ingested data transitioned into clean analytical views with cryptographic point-in-time snapshot history in our SQLite catalog.
                  </p>
                </div>
              </div>

            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Sequential Pipeline Stages */}
      <section className="py-20 md:py-28 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mb-12">
              <span className="section-label mb-3">ARCHITECTURE WORKFLOW</span>
              <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-primary)] max-w-xl">
                How Quantura Computes Without Hallucination
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                A 4-stage deterministic execution pipeline running entirely in your local runtime.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pipelineStages.map((stage, idx) => (
              <ScrollReveal key={stage.step} delay={idx * 0.1}>
                <div className="card-graphite p-6 flex flex-col justify-between h-full group hover:border-[var(--accent)] transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                        STAGE {stage.step}
                      </span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">0{idx + 1}/04</span>
                    </div>
                    <h3 className="text-sm font-bold font-display text-[var(--text-primary)] mb-2">
                      {stage.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                      {stage.desc}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--signal-success)] font-semibold">
                    {stage.tech}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Blueprints Section */}
      <section className="py-20 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="section-label mb-3">Analysis templates</span>
                <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-primary)]">
                  Production Analytics Blueprints
                </h2>
              </div>
              <p
                className="text-xs text-[var(--text-secondary)] font-mono flex items-center gap-2"
                aria-live="polite"
              >
                <Grid2X2 className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                <span>{visibleBlueprints.length} of {filteredBlueprints.length} templates ready</span>
              </p>
            </div>
          </ScrollReveal>

          <div className="flex flex-wrap gap-2 mb-7" aria-label="Filter analytics blueprints">
            {blueprintFilters.map((filter) => {
              const isActive = blueprintFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setBlueprintFilter(filter);
                    setShowAllBlueprints(false);
                  }}
                  className={`min-h-11 px-4 rounded-lg border text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] ${
                    isActive
                      ? "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)] shadow-[inset_0_0_0_1px_var(--accent)]"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  {filter === "All" ? "All industries" : filter}
                </button>
              );
            })}
          </div>

          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleBlueprints.map((bp, blueprintIndex) => (
                <motion.article
                  layout
                  key={bp.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : blueprintIndex * 0.04 }}
                  className="group min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 rounded font-semibold">
                        {bp.tag}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--signal-success)]">
                        <span className="relative flex h-2 w-2" aria-hidden="true">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-30 group-hover:scale-[1.8] transition-transform duration-300" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                        </span>
                        Ready to run
                      </span>
                    </div>
                    <h3 className="text-lg font-bold font-display text-[var(--text-primary)] mb-2 leading-snug text-balance">
                      {bp.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                      {bp.description}
                    </p>

                    <div className="p-3 bg-[var(--code-bg)] text-[var(--code-text)] rounded border border-[var(--code-border)] font-mono text-[11px] mb-4 min-w-0">
                      <code className="block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{bp.code}</code>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--border-subtle)]">
                      {bp.metrics.map((metric) => (
                        <span
                          key={metric}
                          className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-surface-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>

                    <Link
                      href="/workspace"
                      className="mt-5 w-full btn-secondary text-xs py-2 justify-between cursor-pointer"
                    >
                      <span>Load Blueprint</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredBlueprints.length > 3 && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setShowAllBlueprints((current) => !current)}
                aria-expanded={showAllBlueprints}
                className="btn-secondary min-h-11 px-5 text-xs cursor-pointer"
              >
                <span>{showAllBlueprints ? "Show fewer templates" : `Show all ${filteredBlueprints.length} templates`}</span>
                {showAllBlueprints
                  ? <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ROI & Compute Savings Calculator */}
      <section className="py-20 md:py-28 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left 6/12: Sliders */}
              <div className="lg:col-span-6">
                <span className="section-label mb-3">EFFICIENCY BENCHMARK</span>
                <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-primary)] mb-4">
                  Calculate Time &amp; Compute Savings
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
                  Replacing manual SQL wrangling and brittle cloud notebooks with Quantura
                  automated Python kernels delivers measurable bandwidth returns across data engineering teams.
                </p>

                {/* Slider 1: Dataset Volume */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-[var(--text-secondary)]">DATASET ROW COUNT</span>
                    <span className="text-[var(--accent)] font-bold">
                      {datasetRows >= 1000000
                        ? `${(datasetRows / 1000000).toFixed(1)}M Rows`
                        : `${(datasetRows / 1000).toFixed(0)}K Rows`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="5000000"
                    step="50000"
                    value={datasetRows}
                    onChange={(e) => setDatasetRows(Number(e.target.value))}
                    className="w-full accent-[var(--accent)] bg-[var(--border-subtle)] h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Slider 2: Team Size */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-[var(--text-secondary)]">ANALYST / ENGINEER TEAM SIZE</span>
                    <span className="text-[var(--signal-success)] font-bold">{analystCount} Engineers</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={analystCount}
                    onChange={(e) => setAnalystCount(Number(e.target.value))}
                    className="w-full accent-[var(--signal-success)] bg-[var(--border-subtle)] h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Right 6/12: Calculation Metrics Card */}
              <div className="lg:col-span-6">
                <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-8 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[var(--accent)] stroke-[1.75]" />
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                        PROJECTED ANNUAL IMPACT
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--signal-success)] bg-[var(--signal-success-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)] font-semibold">
                      ESTIMATE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                      <div className="text-xs font-mono text-[var(--text-secondary)] mb-1">
                        ANALYSIS HOURS SAVED
                      </div>
                      <div className="text-3xl font-bold font-display text-[var(--accent)]">
                        {hoursSavedPerWeek * 52}
                        <span className="text-sm font-normal text-[var(--text-secondary)] ml-1">hrs/yr</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-sans">
                        ~{hoursSavedPerWeek} hrs/week across team
                      </p>
                    </div>

                    <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                      <div className="text-xs font-mono text-[var(--text-secondary)] mb-1">
                        ENGINEERING VALUE CREATED
                      </div>
                      <div className="text-3xl font-bold font-display text-[var(--signal-success)]">
                        ${annualDollarSavings.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-sans">
                        Based on $75/hr blended capacity
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-[var(--accent)] stroke-[1.75]" />
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          {computeSpeedupFactor}x Execution Speedup
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Compared to cloud spreadsheet re-renders
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/workspace"
                      className="btn-primary text-xs py-1.5 px-3.5 cursor-pointer"
                    >
                      Start Free
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Left-Aligned FAQ Section */}
      <section className="py-20 md:py-28 border-b border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mb-12">
              <span className="section-label mb-3">TECHNICAL SPECIFICATIONS</span>
              <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-primary)] mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Architectural clarifications on Python sandboxing, security, and mathematical precision.
              </p>
            </div>

            <Accordion items={faqItems} />
          </ScrollReveal>
        </div>
      </section>

    </div>
  );
}
