"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DatasetDetail } from "@/types/api";
import { ColumnMultiSelect } from "@/components/ui/ColumnMultiSelect";
import { DataPreviewSection } from "@/components/ui/DataPreviewSection";
import {
  Wand2,
  CopyX,
  CheckCircle2,
  Sparkles,
  Calculator,
  Calendar,
  Loader2,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckSquare,
  Square,
  Type,
  PlusCircle,
} from "lucide-react";

interface CleanTransformViewProps {
  dataset: DatasetDetail;
  onRefresh: () => void;
}

export const CleanTransformView: React.FC<CleanTransformViewProps> = ({ dataset, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<"impute" | "dedup" | "casing" | "formula" | "date">("impute");
  const [loading, setLoading] = useState<boolean>(false);

  const columns = dataset.columns || [];
  const totalNulls = columns.reduce((acc, c) => acc + (c.null_count || 0), 0);
  const missingColumns = columns.filter((c) => (c.null_count || 0) > 0);
  const textColumns = columns.filter((c) =>
    ["text", "string", "categorical", "category"].includes((c.detected_type || "").toLowerCase())
  );
  const dateColumns = columns.filter((c) =>
    ["date", "datetime", "timestamp"].includes((c.detected_type || "").toLowerCase())
  );

  // Missing Imputation State
  const [imputeCols, setImputeCols] = useState<string[]>(
    missingColumns.length ? [missingColumns[0].name] : columns[0] ? [columns[0].name] : []
  );
  const [imputeStrategy, setImputeStrategy] = useState<string>("mean");
  const [fillValue, setFillValue] = useState<string>("");

  // Deduplication State
  const [dedupCols, setDedupCols] = useState<string[]>([]);
  const [dedupKeep, setDedupKeep] = useState<"first" | "last">("first");

  // Text / Casing State
  const [textCols, setTextCols] = useState<string[]>(
    textColumns.length ? [textColumns[0].name] : columns[0] ? [columns[0].name] : []
  );
  const [textOp, setTextOp] = useState<string>("title");

  // Formula State
  const [formulaName, setFormulaName] = useState<string>("Derived_Metric");
  const [formulaExpr, setFormulaExpr] = useState<string>("");

  // Date Engineering State
  const [dateCols, setDateCols] = useState<string[]>(
    dateColumns.length ? [dateColumns[0].name] : columns[0] ? [columns[0].name] : []
  );
  const [datePart, setDatePart] = useState<string>("year");

  const { showToast } = useAppStore();

  // Impute execution for multiple or all columns
  const handleRunImpute = async () => {
    if (!imputeCols.length) {
      showToast("Please select at least one column to impute.", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await api.batchImpute(dataset.id, imputeCols, imputeStrategy, fillValue || undefined);
      showToast(
        res.message || `Imputation applied to ${imputeCols.length} column${imputeCols.length > 1 ? "s" : ""}.`,
        "success"
      );
      onRefresh();
    } catch (err: any) {
      showToast(`Imputation failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Deduplication execution
  const handleRunDedup = async () => {
    setLoading(true);
    try {
      await api.deduplicate(dataset.id, dedupKeep, dedupCols.length ? dedupCols : undefined);
      showToast("Deduplication transformation executed successfully.", "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Deduplication failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Text & Casing formatting for multiple or all columns
  const handleRunCasing = async () => {
    if (!textCols.length) {
      showToast("Please select at least one column for text formatting.", "warning");
      return;
    }
    setLoading(true);
    try {
      for (const col of textCols) {
        await api.cleanText(dataset.id, col, textOp);
      }
      showToast(
        `Text formatting applied to ${textCols.length} column${textCols.length > 1 ? "s" : ""}.`,
        "success"
      );
      onRefresh();
    } catch (err: any) {
      showToast(`Text cleaning failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Formula derivation
  const handleRunFormula = async () => {
    if (!formulaName.trim() || !formulaExpr.trim()) {
      showToast("Please enter a target column name and formula expression.", "warning");
      return;
    }
    setLoading(true);
    try {
      await api.addCalculatedColumn(dataset.id, formulaName.trim(), formulaExpr.trim());
      showToast(`Added calculated column '${formulaName}'.`, "success");
      setFormulaName("");
      setFormulaExpr("");
      onRefresh();
    } catch (err: any) {
      showToast(`Formula execution failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Date feature extraction
  const handleRunDate = async () => {
    if (!dateCols.length) {
      showToast("Please select a date column.", "warning");
      return;
    }
    setLoading(true);
    try {
      for (const col of dateCols) {
        await api.extractDateFeature(dataset.id, col, datePart);
      }
      showToast(`Extracted ${datePart} from ${dateCols.join(", ")}.`, "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Date extraction failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[10px] font-bold mb-1.5">
            <Wand2 className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>TRANSFORMATION STUDIO</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            Clean &amp; Transform Studio
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Perform deterministic column derivations, batch casing adjustments, and multi-column value imputations.
          </p>
        </div>
      </div>

      {/* Metrics Row (Requested: Total Rows, Columns, Null Cells) */}
      <div className="flex items-center gap-12 border-b border-[var(--border-subtle)] pb-4">
        <div className="space-y-0.5">
          <span className="text-xs font-mono text-[var(--text-secondary)]">Total Rows</span>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
            {dataset.row_count.toLocaleString()}
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-xs font-mono text-[var(--text-secondary)]">Columns</span>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
            {dataset.column_count}
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-xs font-mono text-[var(--text-secondary)]">Null Cells</span>
          <p className="text-xl font-bold font-mono text-[var(--signal-warning)]">
            {totalNulls.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-6 border-b border-[var(--border-subtle)] pb-2 text-xs font-medium overflow-x-auto">
        {[
          { id: "impute", label: "Missing Values" },
          { id: "dedup", label: "Deduplication" },
          { id: "casing", label: "Casing & Whitespace" },
          { id: "formula", label: "Calculated Columns" },
          { id: "date", label: "Date Engineering" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "text-[var(--accent)] border-b-2 border-[var(--accent)] font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Missing Values Tab */}
          {activeTab === "impute" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                  Impute Null &amp; Missing Values
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImputeCols(missingColumns.map((c) => c.name))}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select all missing ({missingColumns.length})</span>
                  </button>
                  <span className="text-[var(--text-secondary)]">·</span>
                  <button
                    type="button"
                    onClick={() => setImputeCols(columns.map((c) => c.name))}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select all columns ({columns.length})</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono font-bold text-[var(--text-primary)]">
                      TARGET COLUMNS ({imputeCols.length} SELECTED)
                    </label>
                  </div>
                  <ColumnMultiSelect
                    columns={columns}
                    selectedColumns={imputeCols}
                    onChange={setImputeCols}
                    placeholder="Choose columns to impute..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                    IMPUTATION STRATEGY
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: "mean", label: "Mean (Average)" },
                      { id: "median", label: "Median (Robust)" },
                      { id: "mode", label: "Mode (Most Frequent)" },
                      { id: "ffill", label: "Forward Fill" },
                      { id: "bfill", label: "Backward Fill" },
                      { id: "drop", label: "Drop Rows" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setImputeStrategy(st.id)}
                        className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                          imputeStrategy === st.id
                            ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs"
                            : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {imputeStrategy === "constant" && (
                  <div>
                    <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                      CONSTANT FILL VALUE
                    </label>
                    <input
                      type="text"
                      value={fillValue}
                      onChange={(e) => setFillValue(e.target.value)}
                      placeholder="e.g. 0 or N/A"
                      className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunImpute}
                  disabled={loading || !imputeCols.length}
                  className="btn-primary text-xs py-2.5 px-5 cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  <span>Execute Imputation ({imputeCols.length} columns)</span>
                </button>
              </div>
            </div>
          )}

          {/* Deduplication Tab */}
          {activeTab === "dedup" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                  Deduplication Strategy &amp; Key Subset
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDedupCols(columns.map((c) => c.name))}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select all columns ({columns.length})</span>
                  </button>
                  <span className="text-[var(--text-secondary)]">·</span>
                  <button
                    type="button"
                    onClick={() => setDedupCols([])}
                    className="text-[11px] font-mono text-[var(--text-secondary)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Clear (Match all columns)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                  MATCHING SUBSET COLUMNS ({dedupCols.length === 0 ? "ALL COLUMNS" : `${dedupCols.length} SELECTED`})
                </label>
                <ColumnMultiSelect
                  columns={columns}
                  selectedColumns={dedupCols}
                  onChange={setDedupCols}
                  placeholder="Choose columns to match on (leave blank to match all)..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                  PRESERVATION STRATEGY
                </label>
                <div className="flex items-center gap-6 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]">
                    <input
                      type="radio"
                      name="keepOption"
                      checked={dedupKeep === "first"}
                      onChange={() => setDedupKeep("first")}
                      className="accent-[var(--accent)]"
                    />
                    <span>Keep First (Standard FIFO)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]">
                    <input
                      type="radio"
                      name="keepOption"
                      checked={dedupKeep === "last"}
                      onChange={() => setDedupKeep("last")}
                      className="accent-[var(--accent)]"
                    />
                    <span>Keep Last Occurrence</span>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-[var(--accent-subtle)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--accent)] font-semibold">
                Deduplication scans all {dataset.row_count.toLocaleString()} rows and deterministically removes duplicate records.
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunDedup}
                  disabled={loading}
                  className="btn-primary text-xs py-2.5 px-5 cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CopyX className="w-3.5 h-3.5" />}
                  <span>Execute Deduplication</span>
                </button>
              </div>
            </div>
          )}

          {/* Text & Casing Tab */}
          {activeTab === "casing" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                  Batch Text &amp; Casing Formatting
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTextCols(textColumns.map((c) => c.name))}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select all text ({textColumns.length})</span>
                  </button>
                  <span className="text-[var(--text-secondary)]">·</span>
                  <button
                    type="button"
                    onClick={() => setTextCols(columns.map((c) => c.name))}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select all columns ({columns.length})</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                    TARGET COLUMNS ({textCols.length} SELECTED)
                  </label>
                  <ColumnMultiSelect
                    columns={columns}
                    selectedColumns={textCols}
                    onChange={setTextCols}
                    placeholder="Choose text columns to format..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                    OPERATION
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "trim", label: "Trim Whitespace" },
                      { id: "title", label: "Title Case" },
                      { id: "upper", label: "UPPERCASE" },
                      { id: "lower", label: "lowercase" },
                    ].map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setTextOp(op.id)}
                        className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                          textOp === op.id
                            ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs"
                            : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunCasing}
                  disabled={loading || !textCols.length}
                  className="btn-primary text-xs py-2.5 px-5 cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Type className="w-3.5 h-3.5" />}
                  <span>Execute Text Formatting ({textCols.length} columns)</span>
                </button>
              </div>
            </div>
          )}

          {/* Formula / Calculated Column Tab */}
          {activeTab === "formula" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                Derived &amp; Calculated Column Builder
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                    NEW COLUMN NAME
                  </label>
                  <input
                    type="text"
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    placeholder="e.g. Net_Revenue or Profit_Margin"
                    className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                    FORMULA EXPRESSION
                  </label>
                  <input
                    type="text"
                    value={formulaExpr}
                    onChange={(e) => setFormulaExpr(e.target.value)}
                    placeholder="e.g. Revenue - Cost or Price * 1.15"
                    className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1.5">
                    QUICK INSERT COLUMN PILLS
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-subtle)]">
                    {columns.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormulaExpr((prev) => (prev ? `${prev} [${c.name}]` : `[${c.name}]`))}
                        className="px-2 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent)] text-[11px] font-mono rounded cursor-pointer transition text-[var(--text-primary)]"
                      >
                        +{c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunFormula}
                  disabled={loading || !formulaName.trim() || !formulaExpr.trim()}
                  className="btn-primary text-xs py-2.5 px-5 cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                  <span>Compute &amp; Append Column</span>
                </button>
              </div>
            </div>
          )}

          {/* Date Feature Extraction Tab */}
          {activeTab === "date" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                  Date Feature Extraction
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDateCols(dateColumns.map((c) => c.name))}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select all dates ({dateColumns.length})</span>
                  </button>
                  <span className="text-[var(--text-secondary)]">·</span>
                  <button
                    type="button"
                    onClick={() => setDateCols(columns.map((c) => c.name))}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select all columns ({columns.length})</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                    DATE COLUMNS ({dateCols.length} SELECTED)
                  </label>
                  <ColumnMultiSelect
                    columns={columns}
                    selectedColumns={dateCols}
                    onChange={setDateCols}
                    placeholder="Choose date columns..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                    PART TO EXTRACT
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "year", label: "Year" },
                      { id: "month", label: "Month" },
                      { id: "quarter", label: "Quarter" },
                      { id: "day_of_week", label: "Day of Week" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDatePart(p.id)}
                        className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                          datePart === p.id
                            ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs"
                            : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunDate}
                  disabled={loading || !dateCols.length}
                  className="btn-primary text-xs py-2.5 px-5 cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>Extract Date Feature ({dateCols.length} columns)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Information Card */}
        <div className="space-y-4 h-fit">
          <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-[var(--signal-success)]">
              <CheckCircle2 className="w-4 h-4" />
              <span>NON-DESTRUCTIVE LEDGER</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Every clean and transformation step creates an immutable new version with instantaneous cryptographic rollback.
            </p>
          </div>

          <div className="card-graphite p-6 space-y-3 bg-[var(--bg-surface)] shadow-2xs border border-[var(--border-subtle)]">
            <h4 className="text-xs font-mono font-bold text-[var(--text-primary)]">
              TRANSFORMATION TIPS
            </h4>
            <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc list-inside leading-relaxed">
              <li>Use <strong>Select All</strong> to batch impute missing values across multiple columns in one pass.</li>
              <li>Deduplication default FIFO keeps the earliest occurrence of each unique record.</li>
              <li>Text trimming strips leading, trailing, and redundant internal whitespace.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Preview */}
      <DataPreviewSection dataset={dataset} onRefresh={onRefresh} />
    </div>
  );
};
