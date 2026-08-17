"use client";

import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartRecommendation } from "@/types/api";

const compactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const CopilotChart: React.FC<{ chart: ChartRecommendation }> = ({ chart }) => {
  if (!chart.data?.length || !chart.y_axis) return null;

  const common = {
    data: chart.data,
    margin: { top: 8, right: 8, left: -14, bottom: 2 },
  };
  const axes = (
    <>
      <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey={chart.x_axis}
        tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(value) => String(value).length > 12 ? `${String(value).slice(0, 11)}…` : String(value)}
      />
      <YAxis
        tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(value) => compactNumber(Number(value))}
      />
      <Tooltip
        contentStyle={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          color: "var(--text-primary)",
          fontSize: 11,
        }}
        formatter={(value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      />
    </>
  );

  return (
    <section className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">{chart.title}</h3>
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">{chart.explanation}</p>
      </div>
      <div className="h-48 w-full" role="img" aria-label={`${chart.title}. ${chart.explanation}`}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.chart_type === "line" ? (
            <LineChart {...common}>
              {axes}
              <Line type="monotone" dataKey={chart.y_axis} stroke="var(--accent)" strokeWidth={2.25} dot={{ r: 2 }} activeDot={{ r: 4 }} />
            </LineChart>
          ) : chart.chart_type === "area" ? (
            <AreaChart {...common}>
              {axes}
              <Area type="monotone" dataKey={chart.y_axis} stroke="var(--accent)" fill="var(--accent-subtle)" strokeWidth={2.25} />
            </AreaChart>
          ) : (
            <BarChart {...common}>
              {axes}
              <Bar dataKey={chart.y_axis} fill="var(--accent)" radius={[5, 5, 0, 0]} maxBarSize={42} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {chart.data.map((row, index) => (
          <li key={index}>{String(row[chart.x_axis])}: {String(row[chart.y_axis!])}</li>
        ))}
      </ul>
    </section>
  );
};

export default CopilotChart;
