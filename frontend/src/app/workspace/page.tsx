"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import {
  DatasetListItem,
  DatasetDetail,
  DatasetProfile,
  ExecutiveSummary,
  ChartRecommendation,
  IssueItem,
  AnomalyResults,
} from "@/types/api";

import { HeaderNav } from "@/components/layout/HeaderNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { UploadModal } from "@/components/upload/UploadModal";
import { AuditModal } from "@/components/modals/AuditModal";
import { ToastContainer } from "@/components/ui/ToastContainer";
import EmptyDataIllustration from "@/components/ui/EmptyDataIllustration";
import WorkspaceTutorial from "@/components/onboarding/WorkspaceTutorial";

import { OverviewView } from "@/components/views/OverviewView";
import { DataProfilingView } from "@/components/views/DataProfilingView";
import { SmartDataCleaningView } from "@/components/views/SmartDataCleaningView";
import { CleanTransformView } from "@/components/views/CleanTransformView";
import { IssueCenterView } from "@/components/views/IssueCenterView";
import { AnomalyLabView } from "@/components/views/AnomalyLabView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { CustomerAnalyticsView } from "@/components/views/CustomerAnalyticsView";
import { ForecastingView } from "@/components/views/ForecastingView";
import { AdaptiveDashboardView } from "@/components/views/AdaptiveDashboardView";
import { AskDataView } from "@/components/views/AskDataView";
import { SQLWorkspaceView } from "@/components/views/SQLWorkspaceView";
import { ReportGeneratorView } from "@/components/views/ReportGeneratorView";
import { ExportView } from "@/components/views/ExportView";
import { ProjectHistoryView } from "@/components/views/ProjectHistoryView";
import { SettingsView } from "@/components/views/SettingsView";
import { AdminPanelView } from "@/components/views/AdminPanelView";
import { DocumentationView } from "@/components/views/DocumentationView";

import { Loader2, Upload, RotateCcw, Trash2, X } from "lucide-react";

interface PendingDeletion {
  id: string;
  name: string;
  dataset: DatasetListItem;
  timeoutId: ReturnType<typeof setTimeout>;
}

export default function WorkspacePage() {
  const reduceMotion = useReducedMotion();
  const {
    activeDatasetId,
    activeTab,
    refreshCounter,
    setActiveDatasetId,
    setActiveTab,
    setUploadModalOpen,
    triggerRefresh,
    showToast,
  } = useAppStore();

  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const pendingDeletionRef = useRef<PendingDeletion | null>(null);
  const [currentDataset, setCurrentDataset] = useState<DatasetDetail | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [charts, setCharts] = useState<ChartRecommendation[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [datasetLoading, setDatasetLoading] = useState<boolean>(false);
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);
  const datasetRequestRef = useRef(0);

  const fetchDatasets = async () => {
    try {
      const list = await api.getDatasets();
      setDatasets(list);
      if (activeDatasetId && list.some((dataset) => dataset.id === activeDatasetId)) {
        return;
      } else {
        datasetRequestRef.current += 1;
        setCurrentDataset(null);
        setActiveDatasetId(null);
      }
    } catch (err) {
      console.error("Failed to fetch datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasetDetails = async (id: string) => {
    const requestId = ++datasetRequestRef.current;
    setDatasetLoading(true);
    setProfile(null);
    setSummary(null);
    setCharts([]);
    setIssues([]);
    setAnomalies(null);

    try {
      // 1. Fetch core metadata & profiling first for fast rendering
      const [dsDetail, dsProf, dsSumm, dsIssues] = await Promise.allSettled([
        api.getDataset(id),
        api.getProfile(id),
        api.getSummary(id),
        api.getIssues(id),
      ]);

      if (requestId !== datasetRequestRef.current) return;

      if (dsDetail.status === "fulfilled") setCurrentDataset(dsDetail.value);
      if (dsProf.status === "fulfilled") setProfile(dsProf.value);
      if (dsSumm.status === "fulfilled") setSummary(dsSumm.value);
      if (dsIssues.status === "fulfilled") setIssues(dsIssues.value);

      // Unblock UI immediately
      setDatasetLoading(false);

      // 2. Fetch charts and anomalies in background without blocking interaction
      Promise.allSettled([api.getCharts(id), api.getAnomalies(id)]).then(([dsCharts, dsAnom]) => {
        if (requestId !== datasetRequestRef.current) return;
        if (dsCharts.status === "fulfilled") setCharts(dsCharts.value);
        if (dsAnom.status === "fulfilled") setAnomalies(dsAnom.value);
      });
    } catch (err) {
      console.error("Error fetching details:", err);
      if (requestId === datasetRequestRef.current) setDatasetLoading(false);
    }
  };

  useEffect(() => {
    datasetRequestRef.current += 1;
    setActiveDatasetId(null);
    setActiveTab("overview");
    setCurrentDataset(null);
    setProfile(null);
    setSummary(null);
    setCharts([]);
    setIssues([]);
    setAnomalies(null);
    setWorkspaceInitialized(true);
  }, [setActiveDatasetId, setActiveTab]);

  useEffect(() => {
    if (!workspaceInitialized) return;
    void fetchDatasets();
  }, [workspaceInitialized, refreshCounter]);

  useEffect(() => {
    if (activeDatasetId) {
      fetchDatasetDetails(activeDatasetId);
    }
  }, [activeDatasetId, refreshCounter]);

  const handleDeleteDataset = (id: string) => {
    const target = datasets.find((d) => d.id === id);
    if (!target) return;

    // If another deletion is already pending, commit it immediately
    if (pendingDeletionRef.current) {
      const prev = pendingDeletionRef.current;
      clearTimeout(prev.timeoutId);
      api.deleteDataset(prev.id).catch(console.error);
      pendingDeletionRef.current = null;
    }

    // Optimistically remove from visible list
    const remaining = datasets.filter((d) => d.id !== id);
    setDatasets(remaining);

    // If the deleted dataset was active, switch to next available
    if (activeDatasetId === id) {
      if (remaining.length > 0) {
        setActiveDatasetId(remaining[0].id);
      } else {
        setActiveDatasetId(null);
        setCurrentDataset(null);
      }
    }

    // Set 4-second delayed deletion timer
    const timeoutId = setTimeout(async () => {
      try {
        await api.deleteDataset(id);
        triggerRefresh();
      } catch (err: any) {
        console.error("Failed to delete dataset:", err);
      } finally {
        if (pendingDeletionRef.current?.id === id) {
          pendingDeletionRef.current = null;
          setPendingDeletion(null);
        }
      }
    }, 4000);

    const pendingObj: PendingDeletion = {
      id,
      name: target.name,
      dataset: target,
      timeoutId,
    };
    pendingDeletionRef.current = pendingObj;
    setPendingDeletion(pendingObj);
  };

  const handleUndoDeletion = () => {
    if (!pendingDeletionRef.current) return;
    const { dataset, timeoutId } = pendingDeletionRef.current;
    clearTimeout(timeoutId);

    // Restore dataset to list
    setDatasets((prev) => {
      if (prev.some((d) => d.id === dataset.id)) return prev;
      return [dataset, ...prev];
    });

    // Restore active selection if none was selected
    setActiveDatasetId(dataset.id);
    showToast(`Restored "${dataset.name}"`, "success");

    pendingDeletionRef.current = null;
    setPendingDeletion(null);
  };

  const handleCommitDeletionNow = async () => {
    if (!pendingDeletionRef.current) return;
    const { id, timeoutId } = pendingDeletionRef.current;
    clearTimeout(timeoutId);
    pendingDeletionRef.current = null;
    setPendingDeletion(null);
    try {
      await api.deleteDataset(id);
      triggerRefresh();
    } catch (err: any) {
      console.error("Failed to delete dataset:", err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center space-y-4 text-[var(--text-primary)]">
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shadow-2xs">
          <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
        </div>
        <p className="text-xs font-mono tracking-widest text-[var(--text-secondary)]">
          INITIALIZING QUANTURA ENGINE...
        </p>
      </div>
    );
  }

  const isSystemView = [
    "project_history",
    "settings",
    "admin_panel",
    "documentation",
  ].includes(activeTab);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased flex flex-col selection:bg-[var(--accent)] selection:text-white">
      {/* Global Top HeaderNav */}
      <HeaderNav />

      {/* Main Studio Area with Persistent Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          activeDatasetName={
            currentDataset?.name || "No dataset active"
          }
          rowCount={currentDataset?.row_count || 0}
          colCount={currentDataset?.column_count || 0}
          onDatasetSelect={(id) => setActiveDatasetId(id)}
          onDeleteDataset={handleDeleteDataset}
          issueCount={issues.filter((i) => i.status === "open").length}
          anomalyCount={anomalies?.total_anomalies || 0}
        />

        <main className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] bg-[var(--bg-primary)] p-4 sm:p-6 opacity-100">
          {datasetLoading && activeDatasetId ? (
            <div
              className="flex min-h-full items-center justify-center"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="card-graphite flex max-w-sm items-center gap-3 p-4 bg-[var(--bg-surface)] shadow-2xs">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--accent)]" />
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Switching project dataset</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    Refreshing visualizations, analysis, reports, and history…
                  </p>
                </div>
              </div>
            </div>
          ) : (
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${activeTab}-${activeDatasetId || "no-dataset"}`}
            initial={{ opacity: 0, y: 12, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.998 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-full"
          >
          {/* 1. System Views (Always Functional) */}
          {activeTab === "project_history" && (
            <ProjectHistoryView dataset={currentDataset} onRefresh={triggerRefresh} />
          )}

          {activeTab === "settings" && <SettingsView />}

          {activeTab === "admin_panel" && <AdminPanelView />}

          {activeTab === "documentation" && <DocumentationView />}

          {/* 2. Custom SVG Empty State when no dataset is loaded */}
          {!isSystemView && !currentDataset && (
            <div className="flex min-h-full items-center justify-center py-8 sm:py-12">
              <section className="w-full max-w-2xl rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 text-center shadow-sm sm:p-10" aria-labelledby="empty-workspace-title">
                <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--accent-subtle)] px-3 py-1 font-mono text-[10px] font-bold text-[var(--accent)]">
                  New analysis workspace
                </span>
                <EmptyDataIllustration
                  className="pb-4 pt-5"
                  title=""
                  subtitle=""
                />
                <h1 id="empty-workspace-title" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  Import your data to begin
                </h1>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
                  No project is loaded. Import a CSV or spreadsheet and Quantura will profile its columns, check data quality, and prepare the analytics workspace.
                </p>

                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="btn-primary mt-7 min-h-12 px-6 text-sm cursor-pointer shadow-sm"
                >
                  <Upload className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                  <span>Import CSV or spreadsheet</span>
                </button>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Supported data formats">
                  {["CSV", "Excel", "Parquet", "JSON"].map((format) => (
                    <span key={format} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-1 font-mono text-[10px] text-[var(--text-secondary)]">
                      {format}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-[var(--text-secondary)]">
                  Your raw rows remain inside the local analytics runtime.
                </p>
              </section>
            </div>
          )}

          {/* 3. Data & Analytics Views (When Dataset is Active) */}
          {!isSystemView && currentDataset && (
            <div className="space-y-4">
              {activeTab === "overview" && (
                <OverviewView
                  dataset={currentDataset}
                  profile={profile}
                  summary={summary}
                  charts={charts}
                  onRefresh={triggerRefresh}
                />
              )}

              {activeTab === "profiling" && (
                <DataProfilingView
                  dataset={currentDataset}
                  profile={profile}
                  onNavigateToClean={() => setActiveTab("smart_cleaning")}
                />
              )}

              {activeTab === "smart_cleaning" && (
                <SmartDataCleaningView
                  dataset={currentDataset}
                  onRefresh={triggerRefresh}
                />
              )}

              {activeTab === "clean" && (
                <CleanTransformView
                  dataset={currentDataset}
                  onRefresh={triggerRefresh}
                />
              )}

              {activeTab === "issues" && (
                <IssueCenterView
                  dataset={currentDataset}
                  onRefresh={triggerRefresh}
                />
              )}

              {activeTab === "anomalies" && (
                <AnomalyLabView dataset={currentDataset} />
              )}

              {activeTab === "analytics" && (
                <AnalyticsView dataset={currentDataset} />
              )}

              {activeTab === "grid" && (
                <CustomerAnalyticsView dataset={currentDataset} />
              )}

              {activeTab === "forecasting" && (
                <ForecastingView dataset={currentDataset} />
              )}

              {activeTab === "charts" && (
                <AdaptiveDashboardView
                  key={currentDataset.current_version_id || currentDataset.id}
                  dataset={currentDataset}
                />
              )}

              {activeTab === "ask" && (
                <AskDataView
                  dataset={currentDataset}
                  onRefresh={triggerRefresh}
                />
              )}

              {activeTab === "sql_workspace" && (
                <SQLWorkspaceView dataset={currentDataset} />
              )}

              {activeTab === "report_generator" && (
                <ReportGeneratorView
                  dataset={currentDataset}
                  profile={profile}
                />
              )}

              {activeTab === "export" && (
                <ExportView dataset={currentDataset} />
              )}
            </div>
          )}
          </motion.div>
          </AnimatePresence>
          )}
        </main>
      </div>

      {/* Slide-in Upload Sheet */}
      <UploadModal
        onSuccess={(id) => {
          setActiveDatasetId(id);
          triggerRefresh();
        }}
      />

      {/* Audit Modal */}
      {currentDataset && (
        <AuditModal dataset={currentDataset} profile={profile} />
      )}

      {/* Global Toast Stack */}
      <ToastContainer />

      {/* Bottom-Right Undo Deletion Snackbar */}
      <AnimatePresence>
        {pendingDeletion && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[999] w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 shadow-2xl backdrop-blur-md select-none"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-error-subtle)] text-[var(--signal-error)]">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                  {pendingDeletion.name}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Deleted · Undo available (4s)
                </p>
              </div>
              <button
                type="button"
                onClick={handleUndoDeletion}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--accent-hover)] cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleCommitDeletionNow}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded transition cursor-pointer"
                title="Dismiss and delete immediately"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Countdown animation bar */}
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-surface-subtle)]">
              <div
                className="h-full bg-[var(--signal-error)] origin-left"
                style={{
                  animation: "delete-progress-bar 4s linear forwards",
                }}
              />
            </div>
            <style>{`
              @keyframes delete-progress-bar {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry prompt and guided workspace presentation */}
      <WorkspaceTutorial />
    </div>
  );
}
