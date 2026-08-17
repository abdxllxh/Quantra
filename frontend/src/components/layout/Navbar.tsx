'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';
import { DatasetListItem, DatasetDetail } from '@/types/api';
import {
  FileSpreadsheet,
  UploadCloud,
  ShieldCheck,
  Download,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Sun,
  Moon,
  Layers,
  Database,
  ArrowRight
} from 'lucide-react';

interface NavbarProps {
  datasets: DatasetListItem[];
  currentDataset: DatasetDetail | null;
  onDatasetChange: (id: string) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  datasets,
  currentDataset,
  onDatasetChange,
  onRefresh,
}) => {
  const { setUploadModalOpen, setAuditModalOpen, theme, toggleTheme, showToast } = useAppStore();

  const handleRollback = async (versionId: string) => {
    if (!currentDataset) return;
    try {
      await api.rollbackVersion(currentDataset.id, versionId);
      showToast('Version rollback completed successfully.', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`Rollback failed: ${err.message}`, 'error');
    }
  };

  return (
    <header className="h-16 bg-[#000000]/90 backdrop-blur-2xl border-b border-white/[0.08] sticky top-0 z-40 px-6 flex items-center justify-between transition-colors">
      {/* Brand & Dataset Selector */}
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-3 cursor-pointer group">
          {/* Circular White Logo Matching Landing Page */}
          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-black shadow-[0_0_20px_rgba(255,255,255,0.35)] group-hover:scale-105 transition-transform">
            <img src="/assets/logo.webp" alt="" width={52} height={52} className="w-[72%] h-[72%] object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                Quantura
              </span>
              <span className="reactbits-badge text-[9px] py-0.5 px-2">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Autonomous AI Data Engine
            </p>
          </div>
        </Link>

        {/* Dataset Selector Pill */}
        {datasets.length > 0 && currentDataset && (
          <div className="relative flex items-center group">
            <div className="absolute left-3.5 pointer-events-none text-blue-400">
              <Database className="w-3.5 h-3.5" />
            </div>
            <select
              value={currentDataset.id}
              onChange={(e) => onDatasetChange(e.target.value)}
              className="appearance-none bg-[#090d18] hover:bg-[#0f1524] border border-white/[0.14] text-white text-xs font-semibold rounded-full pl-9 pr-9 py-2 focus:outline-none focus:border-white/40 transition cursor-pointer shadow-md"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-black text-white font-medium">
                  {d.name} ({d.row_count.toLocaleString()} rows • {d.column_count} cols)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 pointer-events-none group-hover:translate-y-0.5 transition-transform" />
          </div>
        )}
      </div>

      {/* Center Action Badges (React Bits Glass Pill) */}
      {currentDataset && (
        <div className="hidden lg:flex items-center space-x-3">
          <button
            onClick={() => setAuditModalOpen(true)}
            className="btn-reactbits-accent text-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Score: <strong>99/100</strong></span>
          </button>

          {currentDataset.versions && currentDataset.versions.length > 1 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono">
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">v{currentDataset.versions.length}.0</span>
              <button
                onClick={() => {
                  const vers = currentDataset.versions;
                  if (vers && vers.length > 1) {
                    handleRollback(vers[vers.length - 2].id);
                  }
                }}
                className="text-blue-400 hover:text-blue-300 font-bold ml-1 cursor-pointer"
              >
                Undo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Right Controls: Tactile White Pill Upload Button */}
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-[#1e222e] hover:bg-[#282d3d] border border-white/[0.1] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shadow-sm"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn-reactbits-primary"
        >
          <UploadCloud className="w-4 h-4 text-black" />
          <span>Upload Dataset</span>
        </button>
      </div>
    </header>
  );
};
