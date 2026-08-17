"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { AuditEvent, DatasetDetail } from "@/types/api";
import { AlertTriangle, Download, History, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";

interface ProjectHistoryViewProps {
  dataset?: DatasetDetail | null;
  onRefresh?: () => void;
}

interface RecoverableRemoval {
  event: AuditEvent;
  originalIndex: number;
  datasetId: string;
}

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const ProjectHistoryView: React.FC<ProjectHistoryViewProps> = ({ dataset }) => {
  const { showToast } = useAppStore();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recoverableRemovals, setRecoverableRemovals] = useState<RecoverableRemoval[]>([]);
  const removalTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const loadHistory = useCallback(async () => {
    if (!dataset) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setEvents((await api.getAuditLogs(dataset.id)).events);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Project history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [dataset]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const filteredEvents = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) =>
      [event.action, event.description, event.dataset_name, event.version, event.user, event.status]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [events, filterQuery]);

  const exportAuditTrail = () => {
    if (!filteredEvents.length) {
      showToast("There are no matching audit events to export.", "error");
      return;
    }
    const headers = ["Event ID", "Action", "Action Code", "Dataset", "Version", "Description", "Impact", "Executed By", "Timestamp", "Status"];
    const rows = filteredEvents.map((event) => [event.id, event.action, event.action_code, event.dataset_name, event.version, event.description, event.impact, event.user, event.timestamp, event.status]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = (dataset?.name || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    anchor.href = url;
    anchor.download = `${safeName || "project"}-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast(`${filteredEvents.length} audit event${filteredEvents.length === 1 ? "" : "s"} exported.`, "success");
  };

  const restoreRemoval = useCallback((removal: RecoverableRemoval) => {
    setEvents((current) => {
      if (current.some((event) => event.id === removal.event.id)) return current;
      const restored = [...current];
      restored.splice(Math.min(removal.originalIndex, restored.length), 0, removal.event);
      return restored;
    });
  }, []);

  const commitRemoval = useCallback(async (removal: RecoverableRemoval) => {
    try {
      await api.deleteAuditLog(removal.datasetId, removal.event.id);
    } catch (error) {
      restoreRemoval(removal);
      showToast(error instanceof Error ? error.message : "History entry could not be removed.", "error");
    } finally {
      removalTimers.current.delete(removal.event.id);
      setRecoverableRemovals((current) => current.filter((item) => item.event.id !== removal.event.id));
    }
  }, [restoreRemoval, showToast]);

  const removeHistoryEvent = (event: AuditEvent) => {
    if (!dataset || removalTimers.current.has(event.id)) return;
    const originalIndex = events.findIndex((item) => item.id === event.id);
    const removal = { event, originalIndex: Math.max(0, originalIndex), datasetId: dataset.id };
    setEvents((current) => current.filter((item) => item.id !== event.id));
    setRecoverableRemovals((current) => [...current, removal]);
    removalTimers.current.set(event.id, setTimeout(() => void commitRemoval(removal), 6000));
  };

  const undoRemoval = (removal: RecoverableRemoval) => {
    const timer = removalTimers.current.get(removal.event.id);
    if (timer) clearTimeout(timer);
    removalTimers.current.delete(removal.event.id);
    restoreRemoval(removal);
    setRecoverableRemovals((current) => current.filter((item) => item.event.id !== removal.event.id));
    showToast(`Restored “${removal.event.action}” to project history.`, "success");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 text-[var(--text-primary)]">
      <style>{`@keyframes history-undo-countdown{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded bg-[var(--accent-subtle)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--accent)]">
            <History className="h-3.5 w-3.5" aria-hidden="true" /><span>AUDIT EVENT LEDGER</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Project History &amp; Audit Trail</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Recorded ingestion, transformation, and rollback activity for the active dataset.</p>
        </div>
        <button type="button" onClick={exportAuditTrail} disabled={!filteredEvents.length || loading} className="btn-secondary min-h-11 shrink-0 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50">
          <Download className="h-4 w-4" aria-hidden="true" /> Export audit trail (.CSV)
        </button>
      </header>

      <section className="card-graphite flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Audit history controls">
        <div className="relative w-full max-w-xl">
          <label htmlFor="audit-search" className="sr-only">Search project history</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
          <input id="audit-search" type="search" value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder="Search actions, descriptions, versions…" className="min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]" />
        </div>
        <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]" role="status">{filteredEvents.length} of {events.length} events shown</span>
      </section>

      {loading ? (
        <div className="card-graphite grid min-h-64 place-items-center" role="status"><span className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" aria-hidden="true" /> Loading recorded project history…</span></div>
      ) : loadError ? (
        <div className="card-graphite p-8 text-center" role="alert">
          <AlertTriangle className="mx-auto h-6 w-6 text-[var(--signal-error)]" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-bold">Could not load project history</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{loadError}</p>
          <button type="button" onClick={() => void loadHistory()} className="btn-primary mt-5 min-h-11 px-5 text-sm">Try again</button>
        </div>
      ) : (
        <section className="card-graphite overflow-hidden" aria-label="Project audit events">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                <tr><th className="px-4 py-3 text-center">#</th><th className="px-4 py-3">Action type</th><th className="px-4 py-3">Dataset &amp; version</th><th className="px-5 py-3">Description &amp; impact</th><th className="px-4 py-3">Executed by</th><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredEvents.map((event, index) => (
                  <tr key={event.id} className="transition-colors hover:bg-[var(--bg-surface-subtle)]">
                    <td className="px-4 py-4 text-center font-mono text-xs text-[var(--text-secondary)]">{index + 1}</td>
                    <td className="px-4 py-4 font-semibold"><span className="flex items-center gap-2"><History className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />{event.action}</span></td>
                    <td className="px-4 py-4"><span className="font-mono font-bold text-[var(--accent)]">{event.version}</span><span className="ml-2 text-xs text-[var(--text-secondary)]">{event.dataset_name}</span></td>
                    <td className="px-5 py-4"><p>{event.description}</p><span className="mt-1 block font-mono text-[10px] font-semibold text-[var(--signal-success)]">{event.impact}</span></td>
                    <td className="px-4 py-4 text-[var(--text-secondary)]">{event.user}</td><td className="px-4 py-4 text-xs text-[var(--text-secondary)]">{formatTimestamp(event.timestamp)}</td>
                    <td className="px-4 py-4"><span className="rounded border border-[var(--border-subtle)] bg-[var(--signal-success-subtle)] px-2 py-1 font-mono text-[10px] font-bold uppercase text-[var(--signal-success)]">{event.status}</span></td>
                    <td className="px-4 py-4 text-right"><button type="button" onClick={() => removeHistoryEvent(event)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--signal-error)] transition hover:bg-[var(--signal-error-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-error)]" aria-label={`Remove ${event.action} from project history`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredEvents.length && <div className="p-12 text-center"><History className="mx-auto h-6 w-6 text-[var(--text-muted)]" aria-hidden="true" /><h2 className="mt-3 font-display text-lg font-bold">No history events found</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{filterQuery ? "Try a different search phrase." : "Actions performed on this dataset will appear here."}</p></div>}
        </section>
      )}

      {recoverableRemovals.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-label="Recently removed history entries">
          {recoverableRemovals.map((removal) => (
            <div key={removal.event.id} role="status" aria-live="polite" className="overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xl">
              <div className="flex items-center gap-3 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--signal-error-subtle)] text-[var(--signal-error)]"><Trash2 className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[var(--text-primary)]">History entry removed</span><span className="block truncate text-[10px] text-[var(--text-secondary)]">{removal.event.action} will be deleted shortly.</span></span>
                <button type="button" onClick={() => undoRemoval(removal)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--accent-subtle)] px-3 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--bg-surface-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Undo</button>
              </div>
              <div className="h-1 origin-left bg-[var(--signal-error)]" style={{ animation: "history-undo-countdown 6s linear forwards" }} aria-hidden="true" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
