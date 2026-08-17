"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DatasetDetail, CorrelationResponse } from "@/types/api";
import {
  GitFork,
  Layers,
  TableProperties,
  Loader2,
  Percent,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface AnalyticsViewProps {
  dataset: DatasetDetail;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ dataset }) => {
  const [activeTab, setActiveTab] = useState<"groupby" | "pivot" | "correlation">("groupby");
  
  // Group By State
  const [groupCol, setGroupCol] = useState<string>(dataset.columns?.[0]?.name || "");
  const [metricCol, setMetricCol] = useState<string>(dataset.columns?.[1]?.name || "");
  const [aggFunc, setAggFunc] = useState<string>("sum");
  const [groupResults, setGroupResults] = useState<any | null>(null);
  const [groupLoading, setGroupLoading] = useState<boolean>(false);

  // Pivot State
  const [pivotRow, setPivotRow] = useState<string>(dataset.columns?.[0]?.name || "");
  const [pivotCol, setPivotCol] = useState<string>(dataset.columns?.[1]?.name || "");
  const [pivotVal, setPivotVal] = useState<string>(dataset.columns?.[2]?.name || "");
  const [pivotAgg, setPivotAgg] = useState<string>("sum");
  const [pivotResults, setPivotResults] = useState<any | null>(null);
  const [pivotLoading, setPivotLoading] = useState<boolean>(false);

  // Correlation State
  const [correlations, setCorrelations] = useState<CorrelationResponse | null>(null);
  const [corrLoading, setCorrLoading] = useState<boolean>(false);

  const columns = dataset.columns || [];
  const { showToast } = useAppStore();

  const handleRunGroupBy = async () => {
    if (!groupCol || !metricCol) return;
    setGroupLoading(true);
    try {
      const res = await api.runGroupBy(dataset.id, {
        group_columns: [groupCol],
        aggregations: [{ column: metricCol, function: aggFunc, alias: `${aggFunc}_${metricCol}` }],
        sort_by: `${aggFunc}_${metricCol}`,
        sort_desc: true,
        limit: 50,
      });
      setGroupResults(res);
      showToast("Group-by analysis calculated successfully.", "success");
    } catch (err: any) {
      showToast(`Group by failed: ${err.message}`, "error");
    } finally {
      setGroupLoading(false);
    }
  };

  const handleRunPivot = async () => {
    if (!pivotRow || !pivotVal) return;
    setPivotLoading(true);
    try {
      const res = await api.runPivot(dataset.id, {
        row_columns: [pivotRow],
        column_field: pivotCol || undefined,
        value_column: pivotVal,
        aggregation: pivotAgg,
      });
      setPivotResults(res);
      showToast("Pivot table matrix generated.", "success");
    } catch (err: any) {
      showToast(`Pivot failed: ${err.message}`, "error");
    } finally {
      setPivotLoading(false);
    }
  };

  const fetchCorrelations = async () => {
    setCorrLoading(true);
    try {
      const data = await api.getCorrelations(dataset.id);
      setCorrelations(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCorrLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "correlation" && !correlations) {
      fetchCorrelations();
    } else if (activeTab === "groupby" && !groupResults) {
      handleRunGroupBy();
    }
  }, [activeTab, dataset.id, dataset.current_version_id]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[10px] font-bold mb-1.5">
            <GitFork className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>MULTIDIMENSIONAL AGGREGATIONS</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            Aggregations, Pivot &amp; Correlations
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Execute high-performance aggregations, cross-tabulations, and Pearson correlation matrices.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 card-graphite bg-[var(--bg-surface)]">
          {[
            { id: "groupby", label: "Group By Studio", icon: Layers },
            { id: "pivot", label: "Pivot Matrix", icon: TableProperties },
            { id: "correlation", label: "Correlations", icon: Percent },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition cursor-pointer ${
                  isActive
                    ? "bg-[var(--accent)] text-white font-bold shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Group By Aggregator */}
      {activeTab === "groupby" && (
        <div className="space-y-6">
          <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
            <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
              Configure Group Aggregation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                  GROUP DIMENSION
                </label>
                <select
                  value={groupCol}
                  onChange={(e) => setGroupCol(e.target.value)}
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.detected_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                  METRIC COLUMN
                </label>
                <select
                  value={metricCol}
                  onChange={(e) => setMetricCol(e.target.value)}
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
                  FUNCTION
                </label>
                <select
                  value={aggFunc}
                  onChange={(e) => setAggFunc(e.target.value)}
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="sum">Sum</option>
                  <option value="mean">Average (Mean)</option>
                  <option value="count">Count</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunGroupBy}
              disabled={groupLoading}
              className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {groupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Calculate Aggregation</span>
            </button>
          </div>

          {/* Results Table & Chart */}
          {groupResults && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
                <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                  Aggregation Output Table
                </h3>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-[var(--bg-surface-subtle)] border-b border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-secondary)] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">{groupCol}</th>
                        <th className="py-2.5 px-3 text-right">{aggFunc}_{metricCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                      {(groupResults.rows || []).map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-[var(--bg-surface-subtle)]">
                          <td className="py-2 px-3 font-mono text-[var(--text-primary)]">{String(r[groupCol])}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[var(--accent)]">
                            {Number(r[`${aggFunc}_${metricCol}`] || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
                <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                  Distribution Breakdown
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(groupResults.rows || []).slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey={groupCol} stroke="var(--text-secondary)" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                      <YAxis stroke="var(--text-secondary)" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--bg-surface)",
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-primary)",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey={`${aggFunc}_${metricCol}`} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pivot Matrix */}
      {activeTab === "pivot" && (
        <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
          <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
            Pivot Matrix Builder
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">ROW FIELD</label>
              <select
                value={pivotRow}
                onChange={(e) => setPivotRow(e.target.value)}
                className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">COLUMN FIELD</label>
              <select
                value={pivotCol}
                onChange={(e) => setPivotCol(e.target.value)}
                className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">VALUE FIELD</label>
              <select
                value={pivotVal}
                onChange={(e) => setPivotVal(e.target.value)}
                className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">AGGREGATION</label>
              <select
                value={pivotAgg}
                onChange={(e) => setPivotAgg(e.target.value)}
                className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
              >
                <option value="sum">Sum</option>
                <option value="mean">Average</option>
                <option value="count">Count</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRunPivot}
            disabled={pivotLoading}
            className="btn-primary text-xs py-2 px-4 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {pivotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Generate Pivot Matrix</span>
          </button>
        </div>
      )}

      {/* Tab 3: Correlations Matrix */}
      {activeTab === "correlation" && (
        <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
          <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
            Pearson Correlation Matrix
          </h3>
          {corrLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin mx-auto" />
            </div>
          ) : correlations ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-[var(--bg-surface-subtle)] border-b border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)]">
                  <tr>
                    <th className="py-2.5 px-3">Dimension</th>
                    {correlations.columns.map((col) => (
                      <th key={col} className="py-2.5 px-3 text-center">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                  {correlations.columns.map((rCol, rIdx) => (
                    <tr key={rCol} className="hover:bg-[var(--bg-surface-subtle)]">
                      <td className="py-2 px-3 font-bold text-[var(--text-primary)]">{rCol}</td>
                      {correlations.columns.map((cCol, cIdx) => {
                        const val = correlations.matrix[rIdx]?.[cIdx] ?? 0;
                        return (
                          <td
                            key={cCol}
                            className="py-2 px-3 text-center"
                            style={{
                              backgroundColor: `rgba(37, 99, 235, ${Math.abs(val) * 0.25})`,
                              color: "var(--text-primary)",
                            }}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
