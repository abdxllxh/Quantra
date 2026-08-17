"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DatasetDetail } from "@/types/api";
import { ColumnMultiSelect } from "@/components/ui/ColumnMultiSelect";
import { DataPreviewSection } from "@/components/ui/DataPreviewSection";
import {
  Wand2,
  CopyX,
  Sparkles,
  Calendar,
  Layers,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
} from "lucide-react";

interface SmartDataCleaningViewProps {
  dataset: DatasetDetail;
  onRefresh: () => void;
}

export const SmartDataCleaningView: React.FC<SmartDataCleaningViewProps> = ({
  dataset,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "duplicates" | "missing" | "text" | "dates" | "outliers" | "types" | "columns"
  >("duplicates");

  const [loading, setLoading] = useState<boolean>(false);

  // Duplicates State
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [dedupKeep, setDedupKeep] = useState<"first" | "last">("first");

  // Missing Values State
  const [imputeCols, setImputeCols] = useState<string[]>([]);
  const [imputeStrategy, setImputeStrategy] = useState<string>("mean");

  // Text & Whitespace State
  const [textCols, setTextCols] = useState<string[]>([]);
  const [textAction, setTextAction] = useState<string>("trim");

  // Dates State
  const [dateCols, setDateCols] = useState<string[]>([]);
  const [datePart, setDatePart] = useState<string>("year");

  // Outliers State
  const [outlierCols, setOutlierCols] = useState<string[]>([]);
  const [outlierMethod, setOutlierMethod] = useState<string>("iqr");
  const [outlierAction, setOutlierAction] = useState<string>("cap");

  // Types State
  const [typeCols, setTypeCols] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<string>("string");

  const { showToast, smartCleaningTarget, setSmartCleaningTarget } = useAppStore();

  useEffect(() => {
    if (!smartCleaningTarget) return;
    setActiveSubTab(smartCleaningTarget);
    setSmartCleaningTarget(null);
  }, [smartCleaningTarget, setSmartCleaningTarget]);
  const columns = dataset.columns || [];
  const totalNulls = columns.reduce((acc, c) => acc + (c.null_count || 0), 0);
  // The execution layer validates numeric eligibility from real values. Keep all
  // columns available here because imported numeric columns can carry imperfect
  // schema labels (for example, currency-looking numbers detected as text).
  const numericColumns = columns;
  const missingColumns = columns.filter((column) => column.null_count > 0);
  const textColumns = columns.filter((column) =>
    ["text", "string", "categorical", "category"].includes(column.detected_type.toLowerCase())
  );
  const dateColumns = columns.filter((column) =>
    ["date", "datetime", "timestamp"].includes(column.detected_type.toLowerCase())
  );

  const handleRunDuplicates = async () => {
    setLoading(true);
    try {
      await api.deduplicate(dataset.id, dedupKeep, selectedCols.length ? selectedCols : undefined);
      showToast("Deduplication transformation applied.", "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Deduplication failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRunMissing = async () => {
    if (!imputeCols.length) return;
    setLoading(true);
    try {
      const res = await api.batchImpute(dataset.id, imputeCols, imputeStrategy);
      showToast(res.message || `Applied missing-value treatment to ${imputeCols.length} column(s).`, "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Imputation failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRunText = async () => {
    if (!textCols.length) return;
    setLoading(true);
    try {
      for (const col of textCols) await api.cleanText(dataset.id, col, textAction);
      showToast(`Text transformation applied to ${textCols.length} column(s).`, "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Text cleaning failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRunDate = async () => {
    if (!dateCols.length) return;
    setLoading(true);
    try {
      for (const col of dateCols) await api.extractDateFeature(dataset.id, col, datePart);
      showToast(`Date feature extracted from ${dateCols.length} column(s).`, "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Date extraction failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRunOutliers = async () => {
    if (!outlierCols.length) return;
    setLoading(true);
    try {
      await api.cleanOutliers(dataset.id, outlierCols, outlierMethod, outlierAction);
      showToast(`Outlier treatment applied to ${outlierCols.length} column(s).`, "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Outlier treatment failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRunTypes = async () => {
    if (!typeCols.length) return;
    setLoading(true);
    try {
      await api.convertColumnTypes(dataset.id, typeCols, targetType);
      showToast(`Converted ${typeCols.length} column(s) to ${targetType}.`, "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Type conversion failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Top Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[10px] font-bold mb-1.5">
          <Wand2 className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>Guided data preparation</span>
        </div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
          Smart Data Cleaning &amp; Transformations
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          One-click deterministic transformations with automated SHA-256 rollback protection.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-12">
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
      <div className="flex items-center gap-6 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto text-xs font-medium">
        {[
          { id: "duplicates", label: "Duplicates" },
          { id: "missing", label: "Missing values" },
          { id: "text", label: "Text & whitespace" },
          { id: "dates", label: "Dates" },
          { id: "outliers", label: "Outliers" },
          { id: "types", label: "Types" },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`pb-1.5 transition cursor-pointer whitespace-nowrap ${
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

      {/* Main Tab Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Duplicates Tab */}
          {activeSubTab === "duplicates" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                  TARGET SUBSET COLUMNS (BLANK = ALL)
                </label>
                <ColumnMultiSelect
                  columns={columns}
                  selectedColumns={selectedCols}
                  onChange={setSelectedCols}
                  placeholder="Choose columns..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
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
                Deduplication scans all {dataset.row_count.toLocaleString()} rows and removes exact duplicate entries.
              </div>

              <button
                onClick={handleRunDuplicates}
                disabled={loading}
                className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                <span>Remove Duplicates</span>
              </button>
            </div>
          )}

          {/* Missing Values Tab */}
          {activeSubTab === "missing" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                Missing Value Imputation Engine
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                    TARGET COLUMN
                  </label>
                  <ColumnMultiSelect
                    columns={missingColumns}
                    selectedColumns={imputeCols}
                    onChange={setImputeCols}
                    placeholder="Select column"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                    IMPUTATION STRATEGY
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "mean", label: "Mean Average" },
                      { id: "median", label: "Median (Robust)" },
                      { id: "mode", label: "Mode (Frequent)" },
                      { id: "forward_fill", label: "Forward Fill" },
                      { id: "backward_fill", label: "Backward Fill" },
                      { id: "drop_rows", label: "Drop Rows" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setImputeStrategy(st.id)}
                        className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          imputeStrategy === st.id
                            ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                            : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRunMissing}
                  disabled={loading || !imputeCols.length}
                  className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <span>Apply Missing Value Fix</span>
                </button>
              </div>
            </div>
          )}

          {/* Text & Whitespace Tab */}
          {activeSubTab === "text" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                Text Normalization &amp; Casing
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                    TARGET COLUMN
                  </label>
                  <ColumnMultiSelect
                    columns={textColumns}
                    selectedColumns={textCols}
                    onChange={setTextCols}
                    placeholder="Select text column"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                    ACTION
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "trim", label: "Trim Whitespace" },
                      { id: "titlecase", label: "Title Case" },
                      { id: "uppercase", label: "UPPERCASE" },
                      { id: "lowercase", label: "lowercase" },
                    ].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setTextAction(act.id)}
                        className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          textAction === act.id
                            ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                            : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRunText}
                  disabled={loading || !textCols.length}
                  className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <span>Normalize Text Column</span>
                </button>
              </div>
            </div>
          )}

          {/* Dates Tab */}
          {activeSubTab === "dates" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                Datetime Feature Extraction
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                    TARGET DATETIME COLUMN
                  </label>
                  <ColumnMultiSelect
                    columns={dateColumns}
                    selectedColumns={dateCols}
                    onChange={setDateCols}
                    placeholder="Select date column"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                    EXTRACT DIMENSION
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "year", label: "Year" },
                      { id: "month", label: "Month" },
                      { id: "quarter", label: "Quarter" },
                      { id: "day_of_week", label: "Day of Week" },
                    ].map((dp) => (
                      <button
                        key={dp.id}
                        type="button"
                        onClick={() => setDatePart(dp.id)}
                        className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          datePart === dp.id
                            ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                            : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {dp.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRunDate}
                  disabled={loading || !dateCols.length}
                  className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <span>Extract Datetime Feature</span>
                </button>
              </div>
            </div>
          )}

          {/* Outliers Tab */}
          {activeSubTab === "outliers" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                Outlier Treatment
              </h3>
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                  TARGET NUMERIC COLUMNS
                </label>
                <ColumnMultiSelect
                  columns={numericColumns}
                  selectedColumns={outlierCols}
                  onChange={setOutlierCols}
                  placeholder="Select numeric columns"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Detection method
                  <select value={outlierMethod} onChange={(event) => setOutlierMethod(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-2 font-mono text-xs">
                    <option value="iqr">IQR bounds</option>
                    <option value="zscore">Z-score (3σ)</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Treatment
                  <select value={outlierAction} onChange={(event) => setOutlierAction(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-2 font-mono text-xs">
                    <option value="cap">Cap to valid bounds</option>
                    <option value="remove">Remove affected rows</option>
                  </select>
                </label>
              </div>
              <button onClick={handleRunOutliers} disabled={loading || !outlierCols.length} className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm disabled:opacity-50">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Apply Outlier Treatment</span>
              </button>
            </div>
          )}

          {/* Types Tab */}
          {activeSubTab === "types" && (
            <div className="card-graphite p-6 space-y-5 bg-[var(--bg-surface)] shadow-2xs">
              <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                Column Type Conversion
              </h3>
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-primary)] mb-1.5">
                  TARGET COLUMNS
                </label>
                <ColumnMultiSelect
                  columns={columns}
                  selectedColumns={typeCols}
                  onChange={setTypeCols}
                  placeholder="Select columns"
                />
              </div>
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Convert selected columns to
                <select value={targetType} onChange={(event) => setTargetType(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-2 font-mono text-xs">
                  <option value="text">Text</option>
                  <option value="integer">Integer</option>
                  <option value="decimal">Decimal</option>
                  <option value="currency">Currency number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
              </label>
              <button onClick={handleRunTypes} disabled={loading || !typeCols.length} className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm disabled:opacity-50">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Convert Selected Columns</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Info Card */}
        <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs h-fit">
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-[var(--signal-success)]">
            <CheckCircle2 className="w-4 h-4" />
            <span>NON-DESTRUCTIVE LEDGER</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Every transformation applied in Smart Cleaning creates an immutable SHA-256 snapshot. You can roll back or branch at any time.
          </p>
        </div>
      </div>

      {/* Data Preview */}
      <DataPreviewSection dataset={dataset} onRefresh={onRefresh} />
    </div>
  );
};
