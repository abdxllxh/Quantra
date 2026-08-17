"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DatasetDetail, IssueItem } from "@/types/api";
import {
  AlertOctagon,
  CheckCircle2,
  Loader2,
  Filter,
  Check,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

interface IssueCenterViewProps {
  dataset: DatasetDetail;
  onRefresh: () => void;
}

export const IssueCenterView: React.FC<IssueCenterViewProps> = ({ dataset, onRefresh }) => {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const { showToast } = useAppStore();

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const data = await api.getIssues(dataset.id, {
        severity: severityFilter === "all" ? undefined : severityFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setIssues(data);
    } catch (err) {
      console.error("Error fetching issues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [dataset.id, dataset.current_version_id, severityFilter, statusFilter]);

  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      await api.updateIssueStatus(dataset.id, issueId, newStatus);
      setIssues((prev) =>
        prev.map((item) => (item.id === issueId ? { ...item, status: newStatus as any } : item))
      );
      showToast(`Issue status updated to ${newStatus}.`, "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`, "error");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--signal-warning-subtle)] text-[var(--signal-warning)] font-mono text-[10px] font-bold mb-1.5">
            <AlertOctagon className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>DATA INTEGRITY TRIAGE</span>
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            Data Quality &amp; Constraint Issue Center
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Categorized constraint violations, formatting discrepancies, missing values, and audit flags for <span className="font-mono font-semibold text-[var(--text-primary)]">{dataset.name}</span>
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#FFFFFF] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] shadow-2xs cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FFFFFF] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] shadow-2xs cursor-pointer"
          >
            <option value="open">Open Issues</option>
            <option value="fixed">Fixed</option>
            <option value="ignored">Ignored</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Issues Table (Clean Light Surface Card) */}
      <div className="card-graphite overflow-hidden bg-[#FFFFFF] shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
            <p className="text-xs font-mono text-[var(--text-secondary)]">Scanning data quality violations...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[var(--signal-success)] mx-auto" />
            <p className="font-bold text-[var(--text-primary)] text-sm">No issues matching criteria</p>
            <p className="text-xs text-[var(--text-secondary)]">All data quality constraints and verification tests passed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-[var(--bg-surface-subtle)] border-b border-[var(--border-subtle)] font-bold text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4 w-20">Row #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Issue Description</th>
                  <th className="py-3 px-4">Recommended Fix</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                {issues.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-surface-subtle)] transition-colors">
                    <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                      {item.row_index !== null ? `#${item.row_index}` : "Global"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[var(--text-primary)] capitalize">
                        {item.issue_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)]">{item.column_name || "N/A"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          item.severity === "critical"
                            ? "bg-[var(--signal-error-subtle)] text-[var(--signal-error)] border-[var(--signal-error)]/30"
                            : item.severity === "high"
                            ? "bg-[var(--signal-warning-subtle)] text-[var(--signal-warning)] border-[var(--signal-warning)]/30"
                            : "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/30"
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] max-w-xs">{item.message}</td>
                    <td className="py-3 px-4 text-[var(--signal-success)] font-mono font-medium">
                      {item.suggested_value || "Impute or standardize"}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {item.status === "open" ? (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(item.id, "fixed")}
                            className="bg-[var(--signal-success-subtle)] hover:bg-[var(--signal-success-subtle)]/80 border border-[var(--signal-success)]/30 text-[var(--signal-success)] px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            Mark Fixed
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, "ignored")}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 text-[11px] font-medium cursor-pointer"
                          >
                            Ignore
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase px-2 py-0.5 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)]">
                          {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
