"use client";

import React from "react";

interface EmptyDataIllustrationProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function EmptyDataIllustration({
  className = "",
  title = "No Active Dataset in Memory",
  subtitle = "Ingest a CSV, Excel, Parquet, or JSON file to initiate deterministic Python/Pandas analysis and automated outlier detection.",
}: EmptyDataIllustrationProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center select-none ${className}`}>
      <div className="relative w-44 h-36 mb-5">
        <svg
          viewBox="0 0 176 144"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Outer Table Wireframe */}
          <rect
            x="8"
            y="8"
            width="160"
            height="128"
            rx="8"
            stroke="var(--border-subtle)"
            strokeWidth="1.5"
            fill="var(--bg-surface)"
          />

          {/* Table Header Row */}
          <line x1="8" y1="36" x2="168" y2="36" stroke="var(--border-subtle)" strokeWidth="1.5" />
          
          {/* Table Columns */}
          <line x1="56" y1="8" x2="56" y2="136" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="112" y1="8" x2="112" y2="136" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Row Dividers */}
          <line x1="8" y1="64" x2="168" y2="64" stroke="var(--border-subtle)" strokeWidth="1" strokeOpacity="0.6" />
          <line x1="8" y1="92" x2="168" y2="92" stroke="var(--border-subtle)" strokeWidth="1" strokeOpacity="0.6" />
          <line x1="8" y1="120" x2="168" y2="120" stroke="var(--border-subtle)" strokeWidth="1" strokeOpacity="0.6" />

          {/* Header Field Placeholders */}
          <rect x="18" y="18" width="26" height="6" rx="3" fill="var(--text-muted)" fillOpacity="0.3" />
          <rect x="68" y="18" width="32" height="6" rx="3" fill="var(--text-muted)" fillOpacity="0.3" />
          <rect x="124" y="18" width="28" height="6" rx="3" fill="var(--accent)" fillOpacity="0.8" />

          {/* Unfilled Data Grid Points */}
          <circle cx="32" cy="50" r="3" fill="var(--border-strong)" />
          <circle cx="84" cy="50" r="3" fill="var(--border-strong)" />
          <circle cx="138" cy="50" r="3" fill="var(--signal-success)" />

          <circle cx="32" cy="78" r="3" fill="var(--border-strong)" />
          <circle cx="84" cy="78" r="3" fill="var(--accent)" />
          <circle cx="138" cy="78" r="3" fill="var(--border-strong)" />

          <circle cx="32" cy="106" r="3" fill="var(--border-strong)" />
          <circle cx="84" cy="106" r="3" fill="var(--border-strong)" />
          <circle cx="138" cy="106" r="3" fill="var(--border-strong)" />

          {/* Vector connection line */}
          <path
            d="M84 78L138 50"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
      </div>

      {title && (
        <h3 className="text-base font-bold text-[var(--text-primary)] font-display mb-1">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
