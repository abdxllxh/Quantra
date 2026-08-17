"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CustomerAnalyticsResponse, DatasetDetail } from "@/types/api";
import { Activity, BadgeDollarSign, Database, RefreshCw, Repeat2, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface CustomerAnalyticsViewProps {
  dataset: DatasetDetail;
}

const formatNumber = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

export const CustomerAnalyticsView: React.FC<CustomerAnalyticsViewProps> = ({ dataset }) => {
  const [analytics, setAnalytics] = useState<CustomerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalytics(await api.getCustomerAnalytics(dataset.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Customer analytics could not be generated.");
    } finally {
      setLoading(false);
    }
  }, [dataset.id]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="card-graphite min-h-72 grid place-items-center" role="status">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--accent)]" aria-hidden="true" />
          Calculating customer metrics from the active dataset…
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="card-graphite mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-xl font-bold">Customer analytics unavailable</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{error || "No analysis was returned."}</p>
        <button type="button" onClick={() => void loadAnalytics()} className="btn-primary mt-5 min-h-11 px-5 text-sm">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry analysis
        </button>
      </div>
    );
  }

  if (!analytics.available || !analytics.metrics) {
    return (
      <div className="card-graphite mx-auto max-w-2xl p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Customer field required</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{analytics.message}</p>
            <p className="mt-3 text-xs text-[var(--text-muted)]">Rename or add a column such as Customer ID, Customer Name, Account ID, Client, or Email, then run the analysis again.</p>
          </div>
        </div>
      </div>
    );
  }

  const metrics = analytics.metrics;
  const valueIsMonetary = Boolean(analytics.detected_columns.value);
  const formatValue = (value: number) => valueIsMonetary ? formatNumber(value) : formatNumber(value);
  const metricCards = [
    { label: "Unique customers", value: formatNumber(metrics.unique_customers), detail: `Using ${analytics.detected_columns.customer}`, icon: Users },
    { label: "Repeat customer rate", value: `${metrics.repeat_rate.toFixed(1)}%`, detail: `${formatNumber(metrics.repeat_customers)} customers with multiple records`, icon: Repeat2 },
    { label: `Total ${metrics.value_label}`, value: formatValue(metrics.total_value), detail: `${formatValue(metrics.average_customer_value)} average per customer`, icon: BadgeDollarSign },
    { label: "Average activity", value: metrics.average_frequency.toFixed(2), detail: metrics.average_satisfaction == null ? "Records per customer" : `${metrics.average_satisfaction.toFixed(2)} average satisfaction`, icon: Activity },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 text-[var(--text-primary)]">
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-[var(--accent-subtle)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
            <Database className="h-3.5 w-3.5" aria-hidden="true" /> Deterministic customer intelligence
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Customer Analytics</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">Customer behavior, value, retention signals, and cohort composition calculated from {dataset.name}.</p>
        </div>
        <button type="button" onClick={() => void loadAnalytics()} className="btn-secondary min-h-11 shrink-0 px-4 text-sm">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh analysis
        </button>
      </header>

      <section aria-label="Customer key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="card-graphite p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">{label}</p>
              <Icon className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{detail}</p>
          </article>
        ))}
      </section>

      <section className="card-graphite border-l-4 border-l-[var(--accent)] p-5" aria-labelledby="customer-brief-title">
        <h2 id="customer-brief-title" className="font-display text-lg font-bold">What this data says</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--text-secondary)]">
          {analytics.brief?.map((sentence) => <p key={sentence}>{sentence}</p>)}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="card-graphite p-5 xl:col-span-7" aria-labelledby="segment-title">
          <div className="mb-5">
            <h2 id="segment-title" className="font-display text-lg font-bold">{analytics.detected_columns.segment || "Customer"} performance</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Ranked by {metrics.value_label}; hover a bar for the exact value.</p>
          </div>
          <div className="h-72" role="img" aria-label={`${analytics.detected_columns.segment || "Customer"} performance bar chart`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.segments || []} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip cursor={{ fill: "var(--accent-subtle)" }} contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 12, color: "var(--text-primary)" }} formatter={(value) => [formatValue(Number(value)), metrics.value_label]} />
                <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card-graphite p-5 xl:col-span-5" aria-labelledby="tier-title">
          <h2 id="tier-title" className="font-display text-lg font-bold">Customer lifecycle tiers</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Relative tiers combine recency, interaction frequency, and {analytics.detected_columns.value ? "customer value" : "record volume"}.</p>
          <div className="mt-6 space-y-5">
            {analytics.tiers?.map((tier) => (
              <div key={tier.name}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{tier.name}</span>
                  <span className="tabular-nums text-[var(--text-secondary)]">{tier.customers} · {tier.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-surface-subtle)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(tier.percentage, tier.customers ? 2 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card-graphite overflow-hidden" aria-labelledby="top-customer-title">
        <div className="border-b border-[var(--border-subtle)] p-5">
          <h2 id="top-customer-title" className="font-display text-lg font-bold">Highest-value customers</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Ranked from the complete active dataset, not a preview sample.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-[var(--bg-surface-subtle)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
              <tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Activity count</th><th className="px-5 py-3">{metrics.value_label}</th><th className="px-5 py-3">Lifecycle tier</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {analytics.top_customers?.map((customer) => (
                <tr key={customer.customer} className="hover:bg-[var(--bg-surface-subtle)]">
                  <td className="px-5 py-3 font-semibold">{customer.customer}</td>
                  <td className="px-5 py-3 tabular-nums text-[var(--text-secondary)]">{customer.frequency}</td>
                  <td className="px-5 py-3 tabular-nums text-[var(--text-secondary)]">{formatValue(customer.value)}</td>
                  <td className="px-5 py-3"><span className="rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{customer.tier}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs leading-5 text-[var(--text-muted)]"><strong className="text-[var(--text-secondary)]">Method:</strong> {analytics.methodology}</p>
    </div>
  );
};
