"use client";

import React, { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { FileInspectResponse } from "@/types/api";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import Sheet from "@/components/ui/Sheet";

interface UploadModalProps {
  onSuccess: (datasetId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onSuccess }) => {
  const { isUploadModalOpen, setUploadModalOpen } = useAppStore();

  const [file, setFile] = useState<File | null>(null);
  const [inspectData, setInspectData] = useState<FileInspectResponse | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [datasetName, setDatasetName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<"select" | "inspect" | "uploading">("select");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    setDatasetName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    setLoading(true);

    try {
      const inspectRes = await api.inspectFile(selectedFile);
      setInspectData(inspectRes);
      if (inspectRes.sheet_names.length > 0) {
        setSelectedSheet(inspectRes.sheet_names[0]);
      }
      setStep("inspect");
    } catch (err: any) {
      setError(err.message || "Failed to inspect file structure.");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStep("uploading");
    setError(null);

    try {
      const created = await api.uploadDataset(
        file,
        datasetName,
        undefined,
        selectedSheet || undefined
      );
      setUploadModalOpen(false);
      resetState();
      onSuccess(created.id);
    } catch (err: any) {
      setError(err.message || "Failed to process dataset.");
      setStep("inspect");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setInspectData(null);
    setSelectedSheet("");
    setDatasetName("");
    setStep("select");
    setError(null);
  };

  return (
    <Sheet
      isOpen={isUploadModalOpen}
      onClose={() => {
        setUploadModalOpen(false);
        resetState();
      }}
      title="Upload Dataset & Sheets"
      description="Ingest CSV, Parquet, or Excel files into the local Python / DuckDB compute engine."
      width="max-w-xl"
    >
      <div className="space-y-6 text-[var(--text-primary)]">
        {error && (
          <div className="p-3.5 bg-[var(--signal-error-subtle)] border border-[var(--signal-error)]/30 rounded-lg text-xs text-[var(--signal-error)] flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.75]" />
            <span>{error}</span>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--bg-surface-subtle)] rounded-xl p-10 flex flex-col items-center justify-center space-y-3 cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.parquet,.json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
              />
              <div className="w-14 h-14 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                ) : (
                  <UploadCloud className="w-6 h-6 stroke-[1.75]" />
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {loading
                    ? "Inspecting schema & headers..."
                    : "Click to select or drag & drop dataset"}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Excel (.xlsx, .xls), CSV (.csv), Parquet (.parquet), or JSON
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "inspect" && inspectData && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] mb-1.5">
                DATASET ALIAS / TABLE NAME
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded-lg px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none transition-colors"
              />
            </div>

            {/* Multi-Sheet Selection Section */}
            {inspectData.sheet_count > 1 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                    SELECT PRIMARY SHEET ({inspectData.sheet_count} FOUND)
                  </label>
                  <span className="text-[11px] font-mono text-[var(--signal-success)]">
                    Switchable later
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                  {inspectData.sheets.map((sheet) => {
                    const isSelected = selectedSheet === sheet.name;
                    return (
                      <button
                        key={sheet.name}
                        onClick={() => setSelectedSheet(sheet.name)}
                        className={`p-3 rounded-lg border text-left flex flex-col justify-between transition cursor-pointer ${
                          isSelected
                            ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)] font-bold shadow-2xs"
                            : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-xs truncate">{sheet.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">
                          {sheet.row_count} rows • {sheet.column_count} cols
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Schema Summary Card */}
            {inspectData.sheets && inspectData.sheets.length > 0 && (
              <div className="card-graphite p-4 space-y-2 bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--text-secondary)]">INFERRED COLUMNS:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {(inspectData.sheets[0]?.columns || []).length} features
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-1">
                  {(inspectData.sheets[0]?.columns || []).map((c: string, i: number) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] px-2 py-0.5 rounded border border-[var(--border-subtle)]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={resetState}
                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={loading}
                className="btn-primary text-xs py-2 px-5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Confirm &amp; Allocate Memory</span>
              </button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            <p className="text-sm font-bold font-display text-[var(--text-primary)]">
              Ingesting &amp; Allocating In-Memory Vector Buffers...
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-mono">
              Generating initial statistical summary and health dial score.
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
};
