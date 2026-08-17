"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { DatasetDetail, AnomalyResults } from "@/types/api";
import {
  Activity,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  FileDown,
  FileText,
  Eye,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface AnomalyLabViewProps {
  dataset: DatasetDetail;
}

function escapeReportValue(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildAnomalyReport(
  dataset: DatasetDetail,
  results: AnomalyResults,
  method: string,
  selectedColumn: string,
  generatedAt: Date,
) {
  const riskRate = dataset.row_count > 0 ? (results.affected_rows_count / dataset.row_count) * 100 : 0;
  const severityLabel = results.high_risk_count > 0 ? "Review required" : results.total_anomalies > 0 ? "Monitor" : "No anomalies detected";
  const columnRows = results.column_summaries.map((column) => `
    <tr>
      <td>${escapeReportValue(column.column_name)}</td>
      <td>${column.anomaly_count.toLocaleString()}</td>
      <td>${column.anomaly_percentage.toFixed(2)}%</td>
      <td><span class="severity ${escapeReportValue(column.max_severity)}">${escapeReportValue(column.max_severity)}</span></td>
      <td>${escapeReportValue(column.typical_min ?? "N/A")} to ${escapeReportValue(column.typical_max ?? "N/A")}</td>
      <td>${escapeReportValue(column.methods_used.join(", "))}</td>
    </tr>`).join("");
  const detailRows = results.anomalies.map((anomaly) => `
    <tr>
      <td>${anomaly.row_index}</td>
      <td>${escapeReportValue(anomaly.column_name)}</td>
      <td>${escapeReportValue(anomaly.actual_value)}</td>
      <td>${escapeReportValue(anomaly.expected_range)}</td>
      <td>${anomaly.anomaly_score.toFixed(2)}</td>
      <td><span class="severity ${escapeReportValue(anomaly.severity)}">${escapeReportValue(anomaly.severity)}</span></td>
      <td>${escapeReportValue(anomaly.detection_method)}</td>
      <td>${escapeReportValue(anomaly.reason)}</td>
    </tr>`).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quantura Anomaly Report | ${escapeReportValue(dataset.name)}</title>
<style>
  :root{color-scheme:light;--ink:#17231d;--muted:#5d6f65;--line:#cfddd3;--paper:#fff;--wash:#f3f7f2;--accent:#2f6b4f;--danger:#dc2626;--warn:#a66a2c}
  *{box-sizing:border-box} body{margin:0;background:var(--wash);color:var(--ink);font:14px/1.5 Arial,sans-serif} main{max-width:1180px;margin:32px auto;padding:36px;background:var(--paper);border:1px solid var(--line);border-radius:18px}
  h1,h2{margin:0 0 8px} h1{font-size:30px} h2{font-size:18px;margin-top:30px}.eyebrow{color:var(--accent);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.muted{color:var(--muted)}
  .meta{display:flex;flex-wrap:wrap;gap:10px 24px;margin:18px 0 26px;padding:14px 0;border-block:1px solid var(--line)}.meta strong{display:block;font-size:11px;text-transform:uppercase;color:var(--muted)}
  .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.kpi{padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--wash)}.kpi span{display:block;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase}.kpi b{display:block;font-size:24px;margin-top:3px}.danger{color:var(--danger)}.warning{color:var(--warn)}
  .summary{margin-top:20px;padding:16px;border-left:4px solid var(--accent);background:var(--wash);border-radius:0 10px 10px 0}
  .table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--wash);font-size:10px;text-transform:uppercase;letter-spacing:.04em}tr:last-child td{border-bottom:0}
  .severity{font-size:10px;font-weight:800;text-transform:uppercase}.severity.high,.severity.critical{color:var(--danger)}.severity.medium{color:var(--warn)}.severity.low{color:var(--accent)}
  footer{margin-top:32px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}@media(max-width:760px){main{margin:0;padding:20px;border:0;border-radius:0}.grid{grid-template-columns:repeat(2,1fr)}}
  @media print{body{background:#fff}main{margin:0;max-width:none;border:0;padding:0}.table-wrap{overflow:visible}thead{display:table-header-group}tr{break-inside:avoid}}
</style></head><body><main>
  <p class="eyebrow">Quantura · Deterministic anomaly audit</p>
  <h1>Anomaly Detection Report</h1>
  <p class="muted">${escapeReportValue(dataset.name)}</p>
  <section class="meta">
    <div><strong>Generated</strong>${escapeReportValue(generatedAt.toLocaleString())}</div>
    <div><strong>Dataset ID</strong>${escapeReportValue(dataset.id)}</div>
    <div><strong>Detection model</strong>${escapeReportValue(method)}</div>
    <div><strong>Column scope</strong>${escapeReportValue(selectedColumn === "all" ? "All flagged columns" : selectedColumn)}</div>
    <div><strong>Dataset size</strong>${dataset.row_count.toLocaleString()} rows × ${dataset.column_count} columns</div>
  </section>
  <section class="grid">
    <div class="kpi"><span>Total flagged</span><b>${results.total_anomalies.toLocaleString()}</b></div>
    <div class="kpi"><span>Critical / high</span><b class="danger">${results.high_risk_count.toLocaleString()}</b></div>
    <div class="kpi"><span>Medium</span><b class="warning">${results.medium_risk_count.toLocaleString()}</b></div>
    <div class="kpi"><span>Affected rows</span><b>${results.affected_rows_count.toLocaleString()}</b></div>
    <div class="kpi"><span>Affected columns</span><b>${results.affected_columns_count.toLocaleString()}</b></div>
  </section>
  <div class="summary"><strong>${severityLabel}.</strong> ${results.affected_rows_count.toLocaleString()} of ${dataset.row_count.toLocaleString()} rows (${riskRate.toFixed(2)}%) contain at least one flagged value. Flags identify statistical exceptions and require contextual review; they are not proof of error or fraud.</div>
  <h2>Column-level findings</h2><div class="table-wrap"><table><thead><tr><th>Column</th><th>Flags</th><th>Rate</th><th>Max severity</th><th>Typical range</th><th>Methods</th></tr></thead><tbody>${columnRows || '<tr><td colspan="6">No column anomalies detected.</td></tr>'}</tbody></table></div>
  <h2>Detailed anomaly register</h2><div class="table-wrap"><table><thead><tr><th>Row</th><th>Column</th><th>Actual value</th><th>Expected range</th><th>Score</th><th>Severity</th><th>Method</th><th>Reason</th></tr></thead><tbody>${detailRows || '<tr><td colspan="8">No anomalies detected.</td></tr>'}</tbody></table></div>
  <h2>Methodology and interpretation</h2><p>The selected <strong>${escapeReportValue(method)}</strong> configuration combines deterministic statistical rules and, where enabled, Isolation Forest scoring. Expected ranges and anomaly scores were computed from the active dataset version. Review high-severity records first, validate source-system context, and record disposition before cleaning or excluding values.</p>
  <footer>Generated locally by Quantura. Raw dataset rows were not sent to an external AI service. Report scope reflects the filters active at generation time.</footer>
</main></body></html>`;
}

export const AnomalyLabView: React.FC<AnomalyLabViewProps> = ({ dataset }) => {
  const [method, setMethod] = useState<string>("auto");
  const [selectedColumn, setSelectedColumn] = useState<string>("all");
  const [anomalies, setAnomalies] = useState<AnomalyResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportHtml, setReportHtml] = useState("");
  const [reportFileName, setReportFileName] = useState("");
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const data = await api.getAnomalies(dataset.id, {
        method,
        column_name: selectedColumn === "all" ? undefined : selectedColumn,
      });
      setAnomalies(data);
    } catch (err) {
      console.error("Error fetching anomalies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReportHtml("");
    setReportFileName("");
    setReportMessage("");
    setReportPreviewOpen(false);
    fetchAnomalies();
  }, [dataset.id, dataset.current_version_id, method, selectedColumn]);

  useEffect(() => {
    if (!reportPreviewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReportPreviewOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [reportPreviewOpen]);

  const scatterData = (anomalies?.scatter_points || []).map((pt) => ({
    x: pt.row_index,
    y: pt.value,
    is_anomaly: pt.is_anomaly,
    score: pt.score,
    reason: pt.reason,
    severity: pt.severity,
    col: pt.column_name,
  }));

  const generateReport = () => {
    if (!anomalies || generatingReport) return;
    setGeneratingReport(true);
    setReportMessage("");
    try {
      const generatedAt = new Date();
      const html = buildAnomalyReport(dataset, anomalies, method, selectedColumn, generatedAt);
      const safeName = dataset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dataset";
      setReportHtml(html);
      setReportFileName(`${safeName}-anomaly-report-${generatedAt.toISOString().slice(0, 10)}.html`);
      setReportMessage("Anomaly report generated. Preview or download it below.");
    } catch {
      setReportMessage("The anomaly report could not be generated. Please try again.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = () => {
    if (!reportHtml || !reportFileName) return;
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = reportFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setReportMessage("Anomaly report downloaded successfully.");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Header & Method Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--signal-warning-subtle)] text-[var(--signal-warning)] font-mono text-[10px] font-bold mb-1.5">
            <Activity className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>STATISTICAL &amp; ML LAB</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            Anomaly Detection &amp; Outlier Lab
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Multi-model detection leveraging IQR bounds, Z-Score standard deviations, and Scikit-Learn Isolation Forests.
          </p>
        </div>

        {/* Algorithm & Column Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            <option value="auto">Ensemble (IQR + Z-Score + ML)</option>
            <option value="iqr">Interquartile Range (IQR)</option>
            <option value="zscore">Z-Score (Standard Deviations)</option>
            <option value="isolation_forest">Isolation Forest (ML)</option>
          </select>

          {anomalies && anomalies.column_summaries.length > 0 && (
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">All Flagged Columns</option>
              {anomalies.column_summaries.map((c) => (
                <option key={c.column_name} value={c.column_name}>
                  {c.column_name} ({c.anomaly_count})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={generateReport}
            disabled={!anomalies || loading || generatingReport}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
            <span>{generatingReport ? "Generating…" : "Generate report"}</span>
          </button>
          {reportHtml && (
            <button
              type="button"
              onClick={() => setReportPreviewOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-bold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <Eye className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
              Preview report
            </button>
          )}
        </div>
      </div>

      {reportMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
            reportMessage.startsWith("The ")
              ? "border-[var(--signal-error)]/30 bg-[var(--signal-error-subtle)] text-[var(--signal-error)]"
              : "border-[var(--signal-success)]/30 bg-[var(--signal-success-subtle)] text-[var(--signal-success)]"
          }`}
        >
          {reportMessage.startsWith("The ") ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          <span>{reportMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
          <p className="text-xs font-mono text-[var(--text-secondary)]">
            Evaluating outlier statistical distributions...
          </p>
        </div>
      ) : anomalies ? (
        <>
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card-graphite p-4 space-y-1 bg-[var(--bg-surface)] shadow-2xs">
              <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[var(--text-secondary)]">
                Total Flagged
              </span>
              <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
                {anomalies.total_anomalies}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {anomalies.affected_rows_count} affected records
              </p>
            </div>

            <div className="card-graphite p-4 space-y-1 bg-[var(--bg-surface)] shadow-2xs">
              <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[var(--signal-error)]">
                Critical Severity
              </span>
              <p className="text-xl font-bold font-mono text-[var(--signal-error)]">
                {anomalies.high_risk_count}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                &gt; 2.5σ or 3x IQR deviation
              </p>
            </div>

            <div className="card-graphite p-4 space-y-1 bg-[var(--bg-surface)] shadow-2xs">
              <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[var(--signal-warning)]">
                Medium Severity
              </span>
              <p className="text-xl font-bold font-mono text-[var(--signal-warning)]">
                {anomalies.medium_risk_count}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Moderate variance
              </p>
            </div>

            <div className="card-graphite p-4 space-y-1 bg-[var(--bg-surface)] shadow-2xs">
              <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[var(--text-secondary)]">
                Affected Columns
              </span>
              <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
                {anomalies.affected_columns_count}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Numerical features
              </p>
            </div>
          </div>

          {/* Outlier Scatter Plot */}
          <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
                  Distribution Dispersion &amp; Outlier Mapping
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Visual mapping of anomalous data points against row index
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--signal-error)]" />
                  <span>Outlier ({anomalies.total_anomalies})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] opacity-40" />
                  <span>Normal</span>
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Row Index"
                    stroke="var(--text-secondary)"
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Value"
                    stroke="var(--text-secondary)"
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Scatter name="Points" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.is_anomaly
                            ? "var(--signal-error)"
                            : "var(--accent)"
                        }
                        opacity={entry.is_anomaly ? 1 : 0.4}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <section className="card-graphite flex flex-col gap-4 bg-[var(--bg-surface)] p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between" aria-labelledby="anomaly-report-actions-title">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Audit-ready output</p>
              <h2 id="anomaly-report-actions-title" className="mt-1 text-base font-bold text-[var(--text-primary)]">Anomaly detection report</h2>
              <p className="mt-0.5 max-w-2xl text-xs text-[var(--text-secondary)]">
                Generate a complete report with summary metrics, column findings, detailed flagged records, and methodology notes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!reportHtml ? (
                <button type="button" onClick={generateReport} disabled={generatingReport} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-xs font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">
                  {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                  {generatingReport ? "Generating…" : "Generate report"}
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setReportPreviewOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                    <Eye className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" /> Preview report
                  </button>
                  <button type="button" onClick={downloadReport} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-xs font-bold text-white transition hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                    <FileDown className="h-4 w-4" aria-hidden="true" /> Download report
                  </button>
                </>
              )}
            </div>
          </section>
        </>
      ) : null}

      {reportPreviewOpen && reportHtml && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setReportPreviewOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="anomaly-report-preview-title" className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Report preview</p>
                <h2 id="anomaly-report-preview-title" className="text-sm font-bold text-[var(--text-primary)]">{dataset.name} anomaly report</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={downloadReport} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-xs font-bold text-white transition hover:bg-[var(--accent-hover)]">
                  <FileDown className="h-3.5 w-3.5" aria-hidden="true" /> Download
                </button>
                <button type="button" onClick={() => setReportPreviewOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface-subtle)]" aria-label="Close report preview">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <iframe title="Anomaly report preview" srcDoc={reportHtml} sandbox="" className="min-h-0 flex-1 bg-white" />
          </section>
        </div>
      )}
    </div>
  );
};
