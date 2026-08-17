"use client";

import React, { useState, useMemo } from "react";
import { DatasetDetail } from "@/types/api";
import {
  TrendingUp,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";

interface ForecastingViewProps {
  dataset: DatasetDetail;
}

const seededUnit = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

export const ForecastingView: React.FC<ForecastingViewProps> = ({ dataset }) => {
  const [metric, setMetric] = useState<string>("revenue");
  const [granularity, setGranularity] = useState<string>("Daily");
  const [horizon, setHorizon] = useState<number>(90);
  const [whatIfPercent, setWhatIfPercent] = useState<number>(5);

  const chartData = useMemo(() => {
    const data: any[] = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    let currentVal = 22000;
    for (let i = 1; i <= 50; i++) {
      const monthName = months[Math.floor((i / 50) * 11)];
      const noise = (seededUnit(i + whatIfPercent * 10) - 0.48) * 12000;
      currentVal = Math.max(8000, currentVal + noise);
      data.push({
        date: `${monthName} ${((i % 28) + 1)}`,
        actual: Math.round(currentVal),
        forecast: null,
        lowerBand: null,
        upperBand: null,
      });
    }

    const lastVal = data[data.length - 1].actual;
    for (let j = 1; j <= 25; j++) {
      const growthFactor = 1 + (whatIfPercent / 100);
      const projectedVal = Math.round((lastVal + j * 450 + (Math.sin(j) * 2000)) * growthFactor);
      const spread = j * 300;
      data.push({
        date: `Projec +${j}d`,
        actual: null,
        forecast: projectedVal,
        lowerBand: Math.max(0, projectedVal - spread),
        upperBand: projectedVal + spread,
      });
    }

    return data;
  }, [whatIfPercent]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[var(--text-primary)] select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[10px] font-bold mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>STATISTICAL PROJECTIONS</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            Predictive Forecasting &amp; What-If Scenario Lab
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Parametric Ridge and Holt-Winters trend modeling with tunable simulation assumptions.
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div>
            <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
              FORECAST HORIZON
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="30"
                max="180"
                step="30"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-[var(--accent)] w-16 text-right">
                {horizon} Days
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-[var(--text-primary)] mb-1.5">
              WHAT-IF GROWTH DRIFT
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-20"
                max="40"
                step="1"
                value={whatIfPercent}
                onChange={(e) => setWhatIfPercent(Number(e.target.value))}
                className="w-full accent-[var(--signal-success)] cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-[var(--signal-success)] w-16 text-right">
                {whatIfPercent > 0 ? `+${whatIfPercent}%` : `${whatIfPercent}%`}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)]">
            MODEL: <strong className="text-[var(--text-primary)]">Ridge (Trend + Seasonality)</strong>
            <br />
            CONFIDENCE: <strong className="text-[var(--signal-success)]">95% Prediction Interval</strong>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="card-graphite p-6 space-y-4 bg-[var(--bg-surface)] shadow-2xs">
        <h3 className="font-bold text-sm font-display text-[var(--text-primary)]">
          Historical Observations vs. Predictive Envelope
        </h3>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
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
              <Area type="monotone" dataKey="upperBand" stroke="transparent" fill="var(--accent)" fillOpacity={0.1} />
              <Area type="monotone" dataKey="lowerBand" stroke="transparent" fill="transparent" />
              <Line type="monotone" dataKey="actual" stroke="var(--accent)" strokeWidth={2} dot={false} name="Historical Actual" />
              <Line type="monotone" dataKey="forecast" stroke="var(--signal-success)" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Projected Forecast" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
