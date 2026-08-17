"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DatasetDetail, DatasetPreview } from "@/types/api";
import {
  Undo2,
  ChevronRight,
  ChevronDown,
  Loader2,
  Table as TableIcon,
} from "lucide-react";

interface DataPreviewSectionProps {
  dataset: DatasetDetail;
  selectedColumn?: string;
  onSelectColumn?: (colName: string) => void;
  onRefresh?: () => void;
}

export const DataPreviewSection: React.FC<DataPreviewSectionProps> = ({
  dataset,
  selectedColumn,
  onSelectColumn,
  onRefresh,
}) => {
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [logOpen, setLogOpen] = useState<boolean>(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);

  const fetchPreviewData = async () => {
    try {
      setLoading(true);
      const data = await api.getPreview(dataset.id, 1, 50);
      setPreview(data);
    } catch (err) {
      console.error("Failed to load dataset preview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreviewData();
  }, [dataset.id, dataset.current_version_id]);

  const { showToast, triggerRefresh } = useAppStore();

  const handleUndo = async () => {
    if (!dataset.versions || dataset.versions.length <= 1) {
      showToast("No previous snapshot versions available to undo.", "warning");
      return;
    }

    // Sort versions by version_number ascending (v1, v2, ..., vN)
    const sortedVersions = [...dataset.versions].sort((a, b) => a.version_number - b.version_number);
    const currentVersion = sortedVersions.find((v) => v.id === dataset.current_version_id);
    const currentNum = currentVersion ? currentVersion.version_number : sortedVersions[sortedVersions.length - 1].version_number;

    // Find the immediately preceding version (v < currentNum)
    const prevVersions = sortedVersions.filter((v) => v.version_number < currentNum);
    if (prevVersions.length === 0) {
      showToast("Already at the initial dataset version (v1).", "warning");
      return;
    }

    const targetVersion = prevVersions[prevVersions.length - 1];

    try {
      setIsUndoing(true);
      await api.rollbackVersion(dataset.id, targetVersion.id);
      showToast(`Undone! Rolled back to version v${targetVersion.version_number}`, "success");
      triggerRefresh();
      if (onRefresh) onRefresh();
      await fetchPreviewData();
    } catch (err: any) {
      showToast(`Undo failed: ${err.message}`, "error");
    } finally {
      setIsUndoing(false);
    }
  };

  const versionsCount = dataset.versions?.length ? dataset.versions.length - 1 : 0;

  return (
    <div className="space-y-4 pt-4 select-none">
      {/* Top Action Strip */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleUndo}
          disabled={isUndoing || versionsCount === 0}
          className="btn-secondary text-xs py-1.5 px-3 cursor-pointer shadow-2xs disabled:opacity-40"
        >
          {isUndoing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
          <span>Undo last action</span>
        </button>

        <button
          onClick={() => setLogOpen(!logOpen)}
          className="btn-secondary text-xs py-1.5 px-3 cursor-pointer shadow-2xs"
        >
          {logOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>Transformation log ({versionsCount} actions)</span>
        </button>
      </div>

      {/* Collapsible Cleaning Log */}
      {logOpen && (
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg space-y-2 text-xs shadow-2xs">
          <p className="font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
            Transformation History Lineage
          </p>
          {dataset.versions && dataset.versions.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {dataset.versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-2 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                >
                  <span className="font-mono font-bold text-[var(--accent)]">
                    v{v.version_number}: {v.name}
                  </span>
                  <span className="text-[var(--text-secondary)] text-[11px] font-mono">
                    {v.row_count.toLocaleString()} rows • {v.created_at?.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)]">No actions recorded yet.</p>
          )}
        </div>
      )}

      {/* Preview Section Header */}
      <div className="space-y-0.5">
        <h3 className="text-base font-bold font-display text-[var(--text-primary)] tracking-tight">Interactive Data Grid Preview</h3>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Click any column header or row to inspect schemas and values in real time.
        </p>
      </div>

      {/* Interactive Grid Table */}
      <div className="card-graphite overflow-hidden bg-[var(--bg-surface)] shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-[var(--text-secondary)]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            <span className="text-xs font-mono">Streaming Parquet preview...</span>
          </div>
        ) : !preview || preview.rows.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-secondary)]">No preview records available</div>
        ) : (
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-[var(--bg-surface-subtle)] sticky top-0 z-20 border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-mono text-[10px] font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3 text-center border-r border-[var(--border-subtle)] w-12">
                    #
                  </th>
                  {preview.columns.map((col) => {
                    const isColSelected = selectedColumn === col.name;
                    return (
                      <th
                        key={col.name}
                        onClick={() => onSelectColumn && onSelectColumn(col.name)}
                        className={`py-2.5 px-3.5 border-r border-[var(--border-subtle)] last:border-r-0 whitespace-nowrap cursor-pointer transition-colors ${
                          isColSelected
                            ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-bold"
                            : "hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span>{col.name}</span>
                          {isColSelected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-mono">
                {preview.rows.map((row, rIdx) => {
                  const isRowSelected = selectedRowIndex === rIdx;
                  return (
                    <tr
                      key={rIdx}
                      onClick={() => setSelectedRowIndex(isRowSelected ? null : rIdx)}
                      className={`transition-colors cursor-pointer ${
                        isRowSelected
                          ? "bg-[var(--accent-subtle)]"
                          : "hover:bg-[var(--bg-surface-subtle)]"
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-[var(--text-secondary)] text-[11px] border-r border-[var(--border-subtle)]">
                        {rIdx}
                      </td>

                      {preview.columns.map((col) => {
                        const val = row[col.name];
                        const isColSelected = selectedColumn === col.name;
                        return (
                          <td
                            key={col.name}
                            className={`py-2 px-3.5 border-r border-[var(--border-subtle)] last:border-r-0 truncate max-w-[220px] ${
                              isColSelected ? "bg-[var(--accent-subtle)] font-bold" : ""
                            }`}
                          >
                            {val === null || val === undefined || val === "" ? (
                              <span className="text-[var(--signal-warning)] italic text-[10px]">&lt;null&gt;</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        <div className="p-2.5 bg-[var(--bg-surface-subtle)] border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between px-4 font-mono">
          <span>Displaying 50 preview rows • {dataset.row_count.toLocaleString()} total rows</span>
          <span>{dataset.column_count} columns</span>
        </div>
      </div>
    </div>
  );
};
