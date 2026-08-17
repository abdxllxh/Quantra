"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { DatasetColumn } from "@/types/api";

interface ColumnMultiSelectProps {
  columns: DatasetColumn[];
  selectedColumns: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  isSingleSelect?: boolean;
}

export const ColumnMultiSelect: React.FC<ColumnMultiSelectProps> = ({
  columns,
  selectedColumns,
  onChange,
  placeholder = "Choose options",
  isSingleSelect = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleColumn = (colName: string) => {
    if (isSingleSelect) {
      onChange([colName]);
      setIsOpen(false);
    } else {
      if (selectedColumns.includes(colName)) {
        onChange(selectedColumns.filter((c) => c !== colName));
      } else {
        onChange([...selectedColumns, colName]);
      }
    }
  };

  const allSelected = columns.length > 0 && columns.every((column) => selectedColumns.includes(column.name));

  const handleSelectAll = (event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    if (allSelected) {
      onChange([]);
    } else {
      onChange(columns.map((c) => c.name));
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const filteredColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full select-none" ref={containerRef}>
      {/* Pill Container Bar */}
      <div className="flex items-stretch gap-2">
        <div
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsOpen((open) => !open);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={placeholder}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="min-h-[42px] min-w-0 flex-1 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] hover:border-[var(--accent)] rounded-lg px-3 py-1.5 flex items-center justify-between cursor-pointer transition shadow-2xs"
        >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
          {selectedColumns.length === 0 ? (
            <span className="text-xs font-mono text-[var(--text-secondary)]">{placeholder}</span>
          ) : (
            selectedColumns.map((colName) => (
              <span
                key={colName}
                className="inline-flex items-center gap-1.5 bg-[var(--accent)] text-white text-xs font-mono font-bold px-2 py-0.5 rounded shadow-2xs"
              >
                <span>{colName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selectedColumns.filter((c) => c !== colName));
                  }}
                  className="hover:text-red-200 transition cursor-pointer"
                  aria-label={`Remove ${colName}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          {isSingleSelect && selectedColumns.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="hover:text-[var(--text-primary)] transition cursor-pointer p-0.5"
              title="Clear all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
        </div>

        {!isSingleSelect && columns.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="min-h-[42px] shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-[10px] font-mono font-bold text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            aria-label={allSelected ? "Clear all selected columns" : "Select all columns"}
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        )}
      </div>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
          {!isSingleSelect && (
            <div
              onClick={handleSelectAll}
              className="p-2.5 bg-[var(--bg-surface-subtle)] hover:bg-[var(--border-subtle)] text-xs font-mono font-bold text-[var(--text-primary)] cursor-pointer border-b border-[var(--border-subtle)] flex items-center justify-between transition"
            >
              <span>{allSelected ? "Clear all columns" : "Select all columns"}</span>
              {allSelected && <Check className="w-4 h-4 text-[var(--accent)]" />}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-[var(--border-subtle)]">
            {filteredColumns.length === 0 ? (
              <div className="p-3 text-xs font-mono text-[var(--text-secondary)] text-center">No columns found</div>
            ) : (
              filteredColumns.map((col) => {
                const isSelected = selectedColumns.includes(col.name);
                return (
                  <div
                    key={col.id}
                    onClick={() => handleToggleColumn(col.name)}
                    className={`px-3.5 py-2 text-xs font-mono cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-bold"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
                    }`}
                  >
                    <span>{col.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
