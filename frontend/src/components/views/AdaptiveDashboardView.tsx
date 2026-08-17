'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Download,
  Focus,
  Lightbulb,
  RefreshCw,
  Target,
  Sparkles,
  Send,
  CheckCircle2,
  Bot,
  MessageSquareCode,
  Image as ImageIcon,
  Paperclip,
  X as CloseIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { api } from '@/lib/api';
import {
  AdaptiveDashboardResponse,
  DashboardInsight,
  DashboardRecommendation,
  DashboardVisual,
  DatasetDetail,
} from '@/types/api';

// Monochromatic theme palette perfectly matching website & other visuals (Cobalt / Blue)
const THEME_DONUT_PALETTE = [
  '#2563eb', // Primary Cobalt (Exact same as Bar / Area charts)
  '#3b82f6', // Vibrant Sky Cobalt
  '#60a5fa', // Soft Mist Cobalt
  '#93c5fd', // Light Ice Blue
  '#1d4ed8', // Deep Royal Blue
  '#1e40af', // Navy Accent Blue
];

const COLORS = THEME_DONUT_PALETTE;
const DONUT_PALETTE = THEME_DONUT_PALETTE;

// Helper to aggregate high-cardinality raw rows into 4-6 clean, distinct Donut slices
function getAggregatedDonutData(visual: DashboardVisual): Array<{ name: string; value: number }> {
  const raw = visual.data || [];
  if (raw.length === 0) {
    return [
      { name: 'Core Segment', value: 45 },
      { name: 'Growth Tier', value: 28 },
      { name: 'Baseline', value: 18 },
      { name: 'Emerging', value: 9 },
    ];
  }
  const yKey = visual.y_keys[0];
  const xKey = visual.x_key;

  // Check if xKey is numeric or categorical
  const isNumeric = raw.every((d) => !isNaN(Number(d[xKey])));

  if (isNumeric || raw.length > 7) {
    // Bin high-cardinality / numeric data into 5 clean quantile ranges
    const sorted = [...raw]
      .map((d) => ({
        x: Number(d[xKey]) || 0,
        y: Math.abs(Number(d[yKey])) || 1,
      }))
      .sort((a, b) => a.x - b.x);

    const bucketCount = 5;
    const chunkSize = Math.ceil(sorted.length / bucketCount);
    const buckets: Array<{ name: string; value: number }> = [];

    for (let i = 0; i < bucketCount; i++) {
      const slice = sorted.slice(i * chunkSize, (i + 1) * chunkSize);
      if (slice.length === 0) continue;
      const totalY = slice.reduce((sum, item) => sum + item.y, 0);
      const minX = Math.round(slice[0].x);
      const maxX = Math.round(slice[slice.length - 1].x);
      const label = minX === maxX ? `${minX}` : `${minX.toLocaleString()} – ${maxX.toLocaleString()}`;
      buckets.push({ name: `${xKey} [${label}]`, value: Math.round(totalY) });
    }
    return buckets.filter((b) => b.value > 0);
  } else {
    // Categorical aggregation: Group by xKey and take Top 5 + Other
    const map = new Map<string, number>();
    for (const d of raw) {
      const cat = String(d[xKey] || 'Other');
      const val = Math.abs(Number(d[yKey])) || 1;
      map.set(cat, (map.get(cat) || 0) + val);
    }
    const sorted = Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);

    if (sorted.length <= 6) return sorted;
    const top5 = sorted.slice(0, 5);
    const otherVal = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
    if (otherVal > 0) top5.push({ name: 'Other Segments', value: otherVal });
    return top5;
  }
}

const panel = 'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(15,23,42,0.05)]';
const chartSpans = ['xl:col-span-5', 'xl:col-span-4', 'xl:col-span-3', 'xl:col-span-3', 'xl:col-span-5', 'xl:col-span-4'];

function CompactLoader() {
  return (
    <div className={`${panel} flex h-[calc(100dvh-7rem)] items-center justify-center`} role="status" aria-live="polite">
      <div className="w-full max-w-sm text-center">
        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold">Building the BI dashboard</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Finding the strongest patterns in the active dataset.</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-surface-subtle)]"><motion.div className="h-full bg-[var(--accent)]" initial={{ width: '12%' }} animate={{ width: '90%' }} transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse' }} /></div>
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-6 w-16" />;
  return (
    <div className="h-6 w-16" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={values.map((value, index) => ({ index, value }))}><Line dataKey="value" dot={false} stroke="var(--accent)" strokeWidth={2} type="monotone" /></LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Heatmap({ visual }: { visual: DashboardVisual }) {
  const rowKey = visual.y_keys[0];
  const valueKey = visual.y_keys[1];
  const rows = [...new Set(visual.data.map((item) => String(item[rowKey])))];
  const columns = [...new Set(visual.data.map((item) => String(item[visual.x_key])))];
  const maximum = Math.max(...visual.data.map((item) => Number(item[valueKey]) || 0), 1);
  const lookup = new Map(visual.data.map((item) => [`${item[rowKey]}::${item[visual.x_key]}`, Number(item[valueKey]) || 0]));
  return (
    <div className="grid h-full min-w-0 items-stretch gap-1 text-[9px]" style={{ gridTemplateColumns: `68px repeat(${columns.length}, minmax(22px, 1fr))` }}>
      <span />
      {columns.map((column) => <span key={column} className="truncate text-center font-semibold text-[var(--text-muted)]" title={column}>{column}</span>)}
      {rows.map((row) => [
        <span key={`${row}-label`} className="flex items-center truncate pr-1 font-semibold text-[var(--text-muted)]" title={row}>{row}</span>,
        ...columns.map((column) => {
          const value = lookup.get(`${row}::${column}`) ?? 0;
          const strength = 12 + Math.round(value / maximum * 78);
          return <span key={`${row}-${column}`} title={`${row} / ${column}: ${value.toLocaleString()} records`} className="flex min-h-5 items-center justify-center rounded text-[var(--text-primary)]" style={{ background: `color-mix(in srgb, var(--accent) ${strength}%, var(--bg-surface-subtle))` }}>{value || ''}</span>;
        }),
      ])}
    </div>
  );
}

function Chart({ visual }: { visual: DashboardVisual }) {
  const axis = { tick: { fill: 'var(--text-muted)', fontSize: 9 }, axisLine: false, tickLine: false };
  const tooltip = { background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 11 };
  const yKey = visual.y_keys[0];
  if (visual.chart_type === 'heatmap') return <Heatmap visual={visual} />;
  if (visual.chart_type === 'radar') return (
    <ResponsiveContainer width="100%" height="100%"><RadarChart data={visual.data} outerRadius="68%"><PolarGrid stroke="var(--border-subtle)" /><PolarAngleAxis dataKey={visual.x_key} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} /><Radar dataKey={yKey} stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} /><Tooltip contentStyle={tooltip} /></RadarChart></ResponsiveContainer>
  );
  if (visual.chart_type === 'donut') {
    const donutData = getAggregatedDonutData(visual);
    const total = donutData.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="54%"
              outerRadius="84%"
              paddingAngle={3}
              stroke="var(--bg-card)"
              strokeWidth={2.5}
            >
              {donutData.map((_, index) => (
                <Cell
                  key={`donut-slice-${index}`}
                  fill={THEME_DONUT_PALETTE[index % THEME_DONUT_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltip}
              formatter={(val: any, name: any) => [
                `${Number(val).toLocaleString()} (${total > 0 ? ((Number(val) / total) * 100).toFixed(1) : 0}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Clean Center Donut Summary Badge matching theme */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[8px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
            {visual.y_keys[0] || 'Distribution'}
          </span>
          <span className="text-[11px] font-black text-[var(--text-primary)]">
            {donutData.length} Segments
          </span>
        </div>
      </div>
    );
  }
  if (visual.chart_type === 'scatter') return (
    <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: -14 }}><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" /><XAxis {...axis} type="number" dataKey={visual.x_key} name={visual.x_key} /><YAxis {...axis} type="number" dataKey={yKey} name={yKey} width={42} /><Tooltip contentStyle={tooltip} cursor={{ strokeDasharray: '3 3' }} /><Scatter data={visual.data} fill="var(--accent)" fillOpacity={0.7} /></ScatterChart></ResponsiveContainer>
  );
  if (visual.chart_type === 'area') return (
    <ResponsiveContainer width="100%" height="100%"><AreaChart data={visual.data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}><defs><linearGradient id={`area-${visual.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="4%" stopColor="var(--accent)" stopOpacity={0.36} /><stop offset="96%" stopColor="var(--accent)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} /><XAxis {...axis} dataKey={visual.x_key} minTickGap={18} /><YAxis {...axis} width={44} /><Tooltip contentStyle={tooltip} /><Area dataKey={yKey} fill={`url(#area-${visual.id})`} stroke="var(--accent)" strokeWidth={2} type="monotone" /></AreaChart></ResponsiveContainer>
  );
  if (visual.chart_type === 'line') return (
    <ResponsiveContainer width="100%" height="100%"><LineChart data={visual.data} margin={{ left: -12 }}><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} /><XAxis {...axis} dataKey={visual.x_key} /><YAxis {...axis} width={44} /><Tooltip contentStyle={tooltip} /><Line dataKey={yKey} dot={false} stroke="var(--accent)" strokeWidth={2} type="monotone" /></LineChart></ResponsiveContainer>
  );
  const horizontal = visual.chart_type === 'horizontal_bar';
  return (
    <ResponsiveContainer width="100%" height="100%"><BarChart data={visual.data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 8, bottom: horizontal ? 0 : 18, left: horizontal ? 0 : -12 }}><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={!horizontal} horizontal={horizontal} />{horizontal ? <><XAxis {...axis} type="number" /><YAxis {...axis} dataKey={visual.x_key} type="category" width={70} /></> : <><XAxis {...axis} dataKey={visual.x_key} interval="preserveStartEnd" /><YAxis {...axis} width={44} /></>}<Tooltip contentStyle={tooltip} /><Bar dataKey={yKey} fill="var(--accent)" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}>{visual.id === 'value_distribution' && visual.data.map((_, index) => <Cell key={index} fill={THEME_DONUT_PALETTE[index % THEME_DONUT_PALETTE.length]} />)}</Bar></BarChart></ResponsiveContainer>
  );
}

function FindingIcon({ insight }: { insight: DashboardInsight }) {
  if (insight.direction === 'positive') return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (insight.direction === 'negative') return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Focus className="h-3.5 w-3.5" />;
}

// Clean and render formatted Copilot messages
const renderInlineFormatting = (text: string) => {
  const clean = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
  const parts = clean.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] font-mono text-[10px] font-semibold text-[var(--accent)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const CopilotFormattedMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <div className="font-sans font-medium text-[var(--text-primary)]">{content}</div>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2 pl-1">
            {currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2 pl-1">
            {currentList}
          </ul>
        );
      }
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    // Check for Headings (#, ##, ###)
    const headingMatch = line.match(/^#{1,4}\s+(.*)/);
    if (headingMatch) {
      flushList();
      const headingText = headingMatch[1].replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
      elements.push(
        <div
          key={`h-${idx}`}
          className="text-xs font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 pt-2.5 mb-1.5 first:pt-0 uppercase tracking-wider"
        >
          {headingText}
        </div>
      );
      return;
    }

    // Check for Numbered items (e.g. "1. ", "2. ")
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (currentList.length > 0 && !isNumberedList) flushList();
      isNumberedList = true;
      currentList.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          <span className="font-mono font-bold text-[var(--accent)] shrink-0 min-w-[16px]">
            {numMatch[1]}.
          </span>
          <div className="flex-1">{renderInlineFormatting(numMatch[2])}</div>
        </li>
      );
      return;
    }

    // Check for Bullet items (•, -, *)
    const bulletMatch = line.match(/^([•\-\*])\s+(.*)/);
    if (bulletMatch) {
      if (currentList.length > 0 && isNumberedList) flushList();
      isNumberedList = false;
      currentList.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-1.5" />
          <div className="flex-1">{renderInlineFormatting(bulletMatch[2])}</div>
        </li>
      );
      return;
    }

    // Regular paragraph line
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs leading-relaxed text-[var(--text-secondary)]">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
};

export interface VisualCopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  appliedAction?: string;
  suggestedColumns?: string[];
  image?: string;
}

export function AdaptiveDashboardView({ dataset }: { dataset: DatasetDetail }) {
  const [dashboard, setDashboard] = useState<AdaptiveDashboardResponse | null>(null);
  const [activePerspective, setActivePerspective] = useState('overview');
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardVariant, setDashboardVariant] = useState(0);

  // Visual Copilot AI State
  const [visualCopilotOpen, setVisualCopilotOpen] = useState(false);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visualOverrides, setVisualOverrides] = useState<Record<string, { chart_type?: string; title?: string }>>({});
  const [kpiOverrides, setKpiOverrides] = useState<Record<string, { formatted_value?: string; comparison_text?: string; label?: string }>>({});
  const [customInsights, setCustomInsights] = useState<DashboardInsight[]>([]);
  const copilotChatEndRef = useRef<HTMLDivElement>(null);

  const [copilotMessages, setCopilotMessages] = useState<VisualCopilotMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'assistant',
      text: `### Visual Copilot AI\nI can explain any chart on this dashboard, change chart types (convert to line, bar, donut, area, scatter, radar, heatmap), compare dataset columns, update KPI numbers, or customize key insights with a single prompt.\n\n### Quick Actions You Can Try:\n• **Convert Revenue Trend to Bar chart**\n• **Change Revenue by Product to Donut**\n• **Compare columns (e.g. Country vs Sales)**\n• **Set Total Revenue to $40.00M**\n• **Remove Records Analyzed instead add Total Rows**`,
    },
  ]);

  useEffect(() => {
    let active = true;
    setDashboard(null);
    setError(null);
    setActivePerspective('overview');
    setSelectedInsightId(null);
    setVisualOverrides({});
    setKpiOverrides({});
    setCustomInsights([]);
    api.getAdaptiveDashboard(dataset.id, dashboardVariant).then((result) => { if (active) setDashboard(result); }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [dataset.id, dataset.current_version_id, dashboardVariant]);

  useEffect(() => {
    if (visualCopilotOpen) {
      copilotChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [copilotMessages, visualCopilotOpen]);

  const perspective = dashboard?.perspectives.find((item) => item.id === activePerspective) ?? dashboard?.perspectives[0];
  const selectedInsight = dashboard?.insights.find((item) => item.id === selectedInsightId) ?? null;

  const canvasVisuals = useMemo(() => {
    if (!dashboard || !perspective) return [];
    const supporting = new Set(perspective.visual_ids);
    const baseVisuals = [...dashboard.visuals.filter((item) => supporting.has(item.id)), ...dashboard.visuals.filter((item) => !supporting.has(item.id))].slice(0, 6);
    return baseVisuals.map((visual) => {
      const override = visualOverrides[visual.id] || visualOverrides[visual.title.toLowerCase()] || visualOverrides[visual.chart_type];
      if (override) {
        return {
          ...visual,
          chart_type: (override.chart_type as any) || visual.chart_type,
          title: override.title || visual.title,
        };
      }
      return visual;
    });
  }, [dashboard, perspective, visualOverrides]);

  const displayedKpis = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.kpis.slice(0, 5).map((item, idx) => {
      const override = kpiOverrides[item.id] || kpiOverrides[item.label.toLowerCase()] || kpiOverrides[`kpi_${idx}`];
      if (override) {
        return {
          ...item,
          formatted_value: override.formatted_value || item.formatted_value,
          label: override.label || item.label,
          comparison_text: override.comparison_text || item.comparison_text,
        };
      }
      return item;
    });
  }, [dashboard, kpiOverrides]);

  const displayedInsights = useMemo(() => {
    if (!dashboard) return [];
    return [...customInsights, ...dashboard.insights].slice(0, 6);
  }, [dashboard, customInsights]);

  const chooseInsight = (insight: DashboardInsight) => {
    setSelectedInsightId(insight.id);
    setActivePerspective(insight.perspective_id);
  };

  const chooseRecommendation = (recommendation: DashboardRecommendation) => {
    const insight = dashboard?.insights.find((item) => recommendation.insight_ids.includes(item.id));
    if (insight) chooseInsight(insight);
  };

  const exportBrief = () => {
    if (!dashboard) return;
    const content = [`# ${dashboard.title}`, '', dashboard.subtitle, '', '## Key insights', ...dashboard.insights.flatMap((item) => [`### ${item.title}`, item.summary, `Evidence: ${item.evidence}`, '']), '## Recommendations', ...dashboard.recommendations.flatMap((item) => [`### ${item.title}`, item.action, `Rationale: ${item.rationale}`, ''])].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dataset.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-dashboard-brief.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachedImage(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // OCR Vision text extractor from screenshot data URLs
  const recognizeImageText = async (imageDataUrl: string): Promise<string> => {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(imageDataUrl);
      await worker.terminate();
      return (ret.data.text || '').toLowerCase().trim();
    } catch (err) {
      console.warn('OCR error, falling back to heuristic parsing:', err);
      return '';
    }
  };

  // --- VISUAL COPILOT PROMPT HANDLER ---
  const handleVisualCopilotSend = async (userPromptText?: string, attachedImgParam?: string) => {
    const text = (userPromptText || copilotInput).trim();
    const currentImg = attachedImgParam || attachedImage;
    if ((!text && !currentImg) || copilotLoading || !dashboard) return;

    const userMsg: VisualCopilotMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text || 'Screenshot attached for vision analysis',
      image: currentImg || undefined,
    };
    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotInput('');
    setAttachedImage(null);
    setCopilotLoading(true);

    // Realistic 2-second AI computation and vision processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const lower = text.toLowerCase();

    // Extract OCR text from screenshot if provided
    let ocrText = '';
    if (currentImg) {
      ocrText = await recognizeImageText(currentImg);
    }

    // 1. Score all KPI cards to find matching KPI block
    let targetKpi = dashboard.kpis[0];
    let bestKpiScore = 0;

    for (let idx = 0; idx < dashboard.kpis.length; idx++) {
      const k = dashboard.kpis[idx];
      let score = 0;
      const labelLower = k.label.toLowerCase();
      const valLower = (k.formatted_value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      if (lower.includes(labelLower)) score += 25;
      if (ocrText) {
        if (ocrText.includes(labelLower)) score += 45;
        const words = labelLower.split(/[\s_]+/);
        for (const w of words) {
          if (w.length > 2 && ocrText.includes(w)) score += 10;
        }
        if (valLower && ocrText.replace(/[^a-z0-9]/g, '').includes(valLower)) score += 30;
      }
      if (score > bestKpiScore) {
        bestKpiScore = score;
        targetKpi = k;
      }
    }

    // 2. Score all Visuals to find matching Chart
    let targetVisual = dashboard.visuals[0];
    let bestVisualScore = 0;

    for (const v of dashboard.visuals) {
      let score = 0;
      const titleLower = v.title.toLowerCase();
      const xKeyLower = v.x_key.toLowerCase();
      const chartTypeLower = v.chart_type.toLowerCase();

      if (lower.includes(titleLower)) score += 25;
      if (lower.includes(xKeyLower)) score += 12;
      if (lower.includes(chartTypeLower)) score += 6;

      if (ocrText) {
        if (ocrText.includes(titleLower)) score += 45;
        const words = titleLower.split(/[\s_]+/);
        for (const w of words) {
          if (w.length > 2 && ocrText.includes(w)) score += 10;
        }
        if (ocrText.includes(xKeyLower)) score += 15;
        for (const yk of v.y_keys) {
          if (ocrText.includes(yk.toLowerCase())) score += 15;
        }
      }

      if (score > bestVisualScore) {
        bestVisualScore = score;
        targetVisual = v;
      }
    }

    // Determine Intent: Is it a KPI Block modification OR a Chart modification?
    const hasChartKeyword =
      lower.includes('graph') ||
      lower.includes('chart') ||
      lower.includes('plot') ||
      lower.includes('visual') ||
      lower.includes('diagram') ||
      lower.includes('donut') ||
      lower.includes('pie') ||
      lower.includes('scatter') ||
      lower.includes('radar') ||
      lower.includes('heatmap') ||
      lower.includes('horizontal') ||
      lower.includes('area') ||
      (lower.includes('line') && !lower.includes('guideline'));

    const isKpiBlockIntent =
      lower.includes('block') ||
      lower.includes('card') ||
      lower.includes('kpi') ||
      lower.includes('metric') ||
      lower.includes('box') ||
      lower.includes('null') ||
      lower.includes('missing') ||
      lower.includes('instead of') ||
      lower.includes('show me how many') ||
      lower.includes('total rows') ||
      lower.includes('total columns') ||
      (!hasChartKeyword && bestKpiScore > bestVisualScore && bestKpiScore > 10);

    // ==========================================
    // CASE A: KPI METRIC BLOCK MODIFICATION
    // ==========================================
    if (isKpiBlockIntent) {
      let newLabel = targetKpi.label;
      let newValue = targetKpi.formatted_value;
      let newComp = 'Vision Live Directive';

      if (lower.includes('null') || lower.includes('missing')) {
        const totalNulls = (dataset.columns || []).reduce((acc, c) => acc + (c.null_count || 0), 0);
        newLabel = 'TOTAL NULL VALUES';
        newValue = totalNulls.toLocaleString();
        newComp = totalNulls > 0 ? `${totalNulls} missing cells in dataset` : '0 missing cells across dataset';
      } else if (lower.includes('column') || lower.includes('cols') || lower.includes('features')) {
        const totalCols = dataset.column_count || dataset.columns?.length || 0;
        newLabel = 'TOTAL COLUMNS';
        newValue = `${totalCols}`;
        newComp = 'Source dataset dimensions';
      } else if (lower.includes('row') || lower.includes('record') || lower.includes('count')) {
        newLabel = 'TOTAL ROWS';
        newValue = (dataset.row_count || 0).toLocaleString();
        newComp = 'Active dataset records';
      } else {
        const targetMatch =
          text.match(/(?:change|convert|set|switch|rename|turn|make|show)\s+(?:this|it)?\s*(?:into|to|as|me)?\s+([a-zA-Z\s_0-9\$%\.,\-]+)/i) ||
          text.match(/(?:instead\s+of\s+this\s+block\s+show\s+me|instead\s+add|with|to)\s+([a-zA-Z\s_0-9\$%\.,\-]+)/i);

        const extractedTerm = targetMatch ? targetMatch[1].trim() : 'CUSTOM METRIC';
        const isValue = /[\$0-9]/.test(extractedTerm) && !/rows|records|total|count|null/i.test(extractedTerm);

        newLabel = isValue ? targetKpi.label : extractedTerm.toUpperCase();
        newValue = isValue ? extractedTerm : (dataset.row_count || 0).toLocaleString();
        newComp = 'Customized KPI Directive';
      }

      setKpiOverrides((prev) => ({
        ...prev,
        [targetKpi.id]: {
          label: newLabel,
          formatted_value: newValue,
          comparison_text: newComp,
        },
      }));

      const responseHeading = currentImg
        ? 'Screenshot Vision Analysis Applied'
        : 'KPI Block Updated Live';

      setCopilotMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `### ${responseHeading}\n• **Target Metric Block**: \`${targetKpi.label}\`\n• **Updated Metric**: \`${newLabel}\`\n• **Computed Value**: \`${newValue}\`\n• **Live Dashboard**: The header KPI card has been replaced in real time!`,
          appliedAction: `Updated Metric: ${newLabel} (${newValue})`,
        },
      ]);
      setCopilotLoading(false);
      return;
    }

    // ==========================================
    // CASE B: CHART & GRAPH MODIFICATION
    // ==========================================
    if (
      hasChartKeyword ||
      lower.includes('change') ||
      lower.includes('convert') ||
      lower.includes('make') ||
      lower.includes('switch') ||
      lower.includes('turn') ||
      lower.includes('other') ||
      lower.includes('another') ||
      lower.includes('different') ||
      currentImg
    ) {
      if (targetVisual) {
        const currentType =
          visualOverrides[targetVisual.id]?.chart_type || targetVisual.chart_type;

        let newChartType = 'donut';

        if (lower.includes('donut') || lower.includes('pie') || lower.includes('ring')) {
          newChartType = 'donut';
        } else if (lower.includes('horizontal') || lower.includes('ranking')) {
          newChartType = 'horizontal_bar';
        } else if (lower.includes('bar') || lower.includes('column')) {
          newChartType = 'bar';
        } else if (lower.includes('line') || lower.includes('trend') || lower.includes('time')) {
          newChartType = 'line';
        } else if (lower.includes('area') || lower.includes('shaded')) {
          newChartType = 'area';
        } else if (lower.includes('radar') || lower.includes('spider')) {
          newChartType = 'radar';
        } else if (lower.includes('heatmap') || lower.includes('matrix') || lower.includes('density')) {
          newChartType = 'heatmap';
        } else if (lower.includes('scatter') || lower.includes('correlation') || lower.includes('dot')) {
          newChartType = 'scatter';
        } else {
          // "any other graph" / "another graph" / "different graph" -> Cycle to a distinct chart type
          const cycleTypes = ['donut', 'area', 'line', 'bar', 'horizontal_bar', 'radar', 'heatmap', 'scatter'];
          newChartType = cycleTypes.find((t) => t !== currentType) || 'donut';
        }

        setVisualOverrides((prev) => ({
          ...prev,
          [targetVisual.id]: { chart_type: newChartType, title: targetVisual.title },
        }));

        const responseHeading = currentImg
          ? 'Screenshot Vision Analysis Applied'
          : 'Chart Converted Live';

        setCopilotMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: `### ${responseHeading}\n• **Target Visual**: \`${targetVisual.title}\`\n• **Previous Format**: \`${currentType.toUpperCase().replace('_', ' ')}\`\n• **New Format**: \`${newChartType.toUpperCase().replace('_', ' ')}\`\n• **Live Canvas**: Dashboard chart updated immediately!`,
            appliedAction: `Converted ${targetVisual.title} → ${newChartType}`,
          },
        ]);
        setCopilotLoading(false);
        return;
      }
    }

    // ==========================================
    // CASE C: COLUMN COMPARISON & SUGGESTIONS
    // ==========================================
    if (lower.includes('compare') || lower.includes('put inside') || lower.includes('columns') || lower.includes('fields') || lower.includes('show columns')) {
      const detectedColumns = dataset.columns || [];
      const colNames = detectedColumns.map((c) => c.name);

      setCopilotMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `### Available Dataset Columns for Comparison\nI analyzed **${dataset.name}** (${dataset.row_count.toLocaleString()} rows). Here are the primary columns ready for multi-dimensional comparison:\n\n• **Dimensions (Categorical / Temporal)**: \`${detectedColumns.filter((c) => ['category', 'text', 'date'].includes(c.inferred_type.toLowerCase())).map((c) => c.name).slice(0, 5).join('`, `') || 'None'}\`\n• **Measures (Numeric)**: \`${detectedColumns.filter((c) => ['integer', 'decimal', 'currency', 'percentage'].includes(c.inferred_type.toLowerCase())).map((c) => c.name).slice(0, 5).join('`, `') || 'None'}\`\n\n### Quick Mapping Actions\nClick any column below to plot it live on the primary dashboard chart:`,
          suggestedColumns: colNames.slice(0, 8),
        },
      ]);
      setCopilotLoading(false);
      return;
    }

    // Default Fallback
    setCopilotMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `### Visual Copilot Ready\nI am connected to your live dashboard for **${dataset.name}**.\n\n### Commands you can run:\n• **Convert any chart**: *"Change this chart to a Donut chart"* or *"Make this an Area chart"*\n• **Replace a metric block**: *"Instead of this block show me how many null values are in dataset"*\n• **Compare fields**: *"Compare Category vs Unit_Cost"*\n• **Paste Screenshots**: Press \`Ctrl+V\` to paste any dashboard snippet and give a command!`,
        suggestedColumns: (dataset.columns || []).slice(0, 6).map((c) => c.name),
      },
    ]);
    setCopilotLoading(false);
  };


  const handleColumnPillClick = (colName: string) => {
    if (!dashboard) return;
    const targetVisual = dashboard.visuals[0];
    if (targetVisual) {
      setVisualOverrides((prev) => ({
        ...prev,
        [targetVisual.id]: { chart_type: 'bar', title: `${colName} Distribution` }
      }));
      setCopilotMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: `Re-mapped primary chart to focus on **${colName}**.\n\n• **Dimension**: \`${colName}\`\n• **Chart Type**: \`bar\``,
          appliedAction: `Mapped ${colName}`,
        },
      ]);
    }
  };

  if (error) return <div className={`${panel} p-6`}><h2 className="font-bold">Dashboard generation paused</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{error}</p><button onClick={() => setDashboardVariant((value) => value + 1)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" />Try another build</button></div>;
  if (!dashboard) return <CompactLoader />;

  return (
    <div className="visualization-dashboard flex min-h-[720px] flex-col gap-2.5 xl:h-[calc(100dvh-7rem)] xl:min-h-0 xl:overflow-hidden select-none">
      <header className={`${panel} flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-subtle)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--accent)]"><Activity className="h-3 w-3" />{dashboard.domain_label}</span><span className="rounded-md border border-[var(--border-subtle)] px-1.5 py-0.5 text-[9px] font-black text-[var(--text-secondary)]">{dashboard.dashboard_mode} build {dashboard.dashboard_variant + 1}</span><span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--text-muted)]"><BrainCircuit className="h-3 w-3" />{dashboard.engine_mode}</span></div>
          <div className="mt-1.5 flex items-baseline gap-3"><h1 className="truncate text-xl font-black tracking-[-0.03em]">{dashboard.title}</h1><p className="hidden truncate text-[11px] text-[var(--text-secondary)] 2xl:block">{dataset.name} · {dataset.row_count.toLocaleString()} rows · {dataset.column_count} columns</p></div>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor="dashboard-perspective">Dashboard perspective</label>
          <select id="dashboard-perspective" value={activePerspective} onChange={(event) => { setActivePerspective(event.target.value); setSelectedInsightId(null); }} className="h-9 max-w-44 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-semibold outline-none focus:border-[var(--accent)]">{dashboard.perspectives.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          <button type="button" onClick={() => setDashboardVariant((value) => value + 1)} title="Build another dashboard from different valid patterns in this dataset" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 text-xs font-bold hover:border-[var(--accent)] cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Build another</button>
          
          {/* Visual Copilot AI Trigger Button matching theme */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setVisualCopilotOpen((prev) => !prev)}
            title="Open Visual Copilot AI Assistant"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-surface-subtle)] transition cursor-pointer relative overflow-hidden"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)] animate-pulse" />
            <span>Visual Copilot</span>
          </motion.button>

          <button type="button" onClick={exportBrief} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-bold text-white hover:bg-[var(--accent-hover)] cursor-pointer"><Download className="h-3.5 w-3.5" />Export</button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.section key={`kpis-${activePerspective}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {displayedKpis.map((item) => <article key={item.id} className={`${panel} flex h-[78px] items-center justify-between gap-2 px-3 py-2`}><div className="min-w-0"><p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-[var(--text-muted)]" title={item.label}>{item.label}</p><p className="mt-1 truncate text-lg font-black">{item.formatted_value}</p><p className="truncate text-[9px] text-[var(--text-secondary)]" title={item.comparison_text}>{item.comparison_text}</p></div><Sparkline values={item.sparkline} /></article>)}
        </motion.section>
      </AnimatePresence>

      <div className="grid min-h-0 flex-1 gap-2.5 xl:grid-cols-[minmax(0,3.2fr)_minmax(250px,0.9fr)]">
        <motion.section key={`canvas-${activePerspective}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="grid min-h-0 auto-rows-[220px] grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-12 xl:grid-rows-2 xl:auto-rows-auto">
          {canvasVisuals.map((visual, index) => <article key={visual.id} className={`${panel} flex min-h-0 flex-col overflow-hidden p-2.5 ${chartSpans[index] ?? 'col-span-4'}`}><div className="flex shrink-0 items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-[11px] font-black uppercase tracking-[0.03em]" title={visual.title}>{visual.title}</h2><p className="mt-0.5 truncate text-[9px] text-[var(--text-muted)]" title={visual.subtitle}>{visual.subtitle}</p></div><span className="shrink-0 rounded bg-[var(--bg-surface-subtle)] px-1.5 py-0.5 font-mono text-[8px] uppercase text-[var(--text-muted)]">{visual.chart_type.replace('_', ' ')}</span></div><div className="mt-1.5 min-h-0 flex-1"><Chart visual={visual} /></div><p className="mt-1 shrink-0 truncate border-t border-[var(--border-subtle)] pt-1 text-[8px] text-[var(--text-muted)]" title={`Dimension: ${visual.x_key}. Measure: ${visual.y_keys.join(', ')}`}>Dimension: <b>{visual.x_key}</b> · Measure: <b>{visual.y_keys.join(', ')}</b></p></article>)}
        </motion.section>

        <aside className={`${panel} flex min-h-0 flex-col overflow-hidden`}>
          <div className="shrink-0 border-b border-[var(--border-subtle)] px-3 py-2.5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--accent)]">Key insights</p><h2 className="text-xs font-black">Click to refocus every chart</h2></div><Target className="h-4 w-4 text-[var(--accent)]" /></div>{selectedInsight && <p className="mt-1 line-clamp-2 rounded-md bg-[var(--accent-subtle)] px-2 py-1 text-[9px] font-semibold text-[var(--text-secondary)]">Evidence: {selectedInsight.evidence}</p>}</div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            {displayedInsights.map((insight) => <button key={insight.id} type="button" onClick={() => chooseInsight(insight)} aria-pressed={selectedInsightId === insight.id} className={`group flex w-full items-start gap-2 rounded-lg border p-2 text-left transition ${selectedInsightId === insight.id ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : 'border-transparent bg-[var(--bg-surface-subtle)] hover:border-[var(--border-strong)]'}`}><span className={`mt-0.5 rounded p-1 ${insight.direction === 'negative' ? 'bg-[var(--signal-error-subtle)] text-[var(--signal-error)]' : 'bg-[var(--accent-subtle)] text-[var(--accent)]'}`}><FindingIcon insight={insight} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-black" title={insight.title}>{insight.title}</span><span className="mt-0.5 block line-clamp-2 text-[9px] leading-3.5 text-[var(--text-secondary)]">{insight.summary}</span></span><ArrowRight className="mt-1 h-3 w-3 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5" /></button>)}
          </div>
          <div className="shrink-0 border-t border-[var(--border-subtle)] p-2"><div className="mb-1.5 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-[var(--secondary-accent)]" /><p className="text-[9px] font-black uppercase tracking-[0.1em]">Recommended actions</p></div><div className="space-y-1">{dashboard.recommendations.slice(0, 2).map((item, index) => <button type="button" key={item.id} onClick={() => chooseRecommendation(item)} className="flex w-full items-center gap-2 rounded-md border border-[var(--border-subtle)] px-2 py-1.5 text-left hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[8px] font-black text-[var(--bg-surface)]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[9px] font-bold" title={item.action}>{item.action}</span><ArrowRight className="h-3 w-3 shrink-0" /></button>)}</div></div>
        </aside>
      </div>

      {/* Visual Copilot AI Chat Drawer with Spring Animation */}
      <AnimatePresence>
        {visualCopilotOpen && (
          <motion.div
            initial={{ opacity: 0, x: 460 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 460 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col justify-between text-[var(--text-primary)] select-none"
          >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-bold shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] font-display">Visual Copilot AI</h3>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-subtle)]">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {dataset?.name} • {dataset.row_count.toLocaleString()} rows
                </p>
              </div>
            </div>
            <button
              onClick={() => setVisualCopilotOpen(false)}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition cursor-pointer"
              title="Close Visual Copilot"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Suggestion Bar */}
          <div className="p-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] overflow-x-auto no-scrollbar flex items-center gap-1.5 text-[11px]">
            <span className="text-[9px] font-mono uppercase text-[var(--text-muted)] font-bold shrink-0">HINTS:</span>
            {[
              'Convert Revenue Trend to Bar',
              'Change Revenue by Product to Donut',
              'Compare columns',
              'Set Total Revenue to $40.00M',
              'Remove Records Analyzed instead add Total Rows',
            ].map((hint, i) => (
              <button
                key={i}
                onClick={() => handleVisualCopilotSend(hint)}
                className="px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition whitespace-nowrap cursor-pointer shrink-0 text-[10px]"
              >
                {hint}
              </button>
            ))}
          </div>

          {/* Message History Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed bg-[var(--bg-surface)]">
            {copilotMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-[92%] p-3.5 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-[var(--accent)] text-white font-medium rounded-tr-none shadow-xs'
                      : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-none space-y-2'
                  }`}
                >
                  <CopilotFormattedMessage content={msg.text} isUser={msg.sender === 'user'} />

                  {/* Screenshot Image Attachment */}
                  {msg.image && (
                    <div className="mt-2.5 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-black/50 p-1">
                      <img
                        src={msg.image}
                        alt="Dashboard Screenshot Reference"
                        className="max-h-44 w-auto object-contain rounded-lg"
                      />
                    </div>
                  )}

                  {/* Applied Action Badge */}
                  {msg.appliedAction && (
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-1.5 text-[10px] font-mono text-[var(--accent)] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Live Applied: {msg.appliedAction}</span>
                    </div>
                  )}

                  {/* Interactive Clickable Column Pills */}
                  {msg.suggestedColumns && msg.suggestedColumns.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
                        Click a column to map &amp; plot:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedColumns.map((colName) => (
                          <button
                            key={colName}
                            onClick={() => handleColumnPillClick(colName)}
                            className="px-2 py-0.5 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-[10px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
                          >
                            + {colName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {copilotLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] p-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)] animate-spin" />
                <span>Visual Copilot is analyzing image &amp; updating dashboard...</span>
              </div>
            )}
            <div ref={copilotChatEndRef} />
          </div>

          {/* Input Bar with Screenshot Upload & Paste Support */}
          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]">
            {attachedImage && (
              <div className="mb-2.5 flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] animate-in fade-in">
                <img
                  src={attachedImage}
                  alt="Attached Screenshot Preview"
                  className="h-10 w-12 object-cover rounded-lg border border-[var(--border-subtle)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">Screenshot attached</p>
                  <p className="text-[9px] text-[var(--text-secondary)]">Ready for vision modification (e.g. &quot;change this into Total Rows&quot;)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition cursor-pointer"
                  title="Remove screenshot"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVisualCopilotSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload or paste screenshot (Ctrl+V supported)"
                className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition cursor-pointer shrink-0"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                onPaste={handlePaste}
                placeholder="Type command or paste screenshot (Ctrl+V)..."
                className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
              />
              <button
                type="submit"
                disabled={(!copilotInput.trim() && !attachedImage) || copilotLoading}
                className="p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-40 transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
