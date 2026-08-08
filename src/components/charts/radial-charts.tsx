"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { aggregateBy, formatValue } from "@/lib/data/aggregate";
import { useChartTheme } from "./use-chart-theme";
import { ChartTooltip, EmptyChartState } from "./chart-tooltip";
import type { ChartRenderProps } from "./cartesian-charts";

function useColumnFormat(summary: ChartRenderProps["summary"], name?: string) {
  const col = summary.columns.find((c) => c.name === name);
  if (col?.isCurrency) return { type: "currency" as const, symbol: col.currencySymbol };
  if (col?.dataType === "percentage") return { type: "percentage" as const, symbol: undefined };
  return { type: "number" as const, symbol: undefined };
}

export function PieDonutChart({ chart, rows, summary, donut }: ChartRenderProps & { donut: boolean }) {
  const { palette, ink } = useChartTheme();
  const { dimension, measure, aggregation, limit } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const data = useMemo(() => {
    if (!dimension || !measure) return [];
    const points = aggregateBy(rows, dimension, measure, aggregation).sort((a, b) => b.value - a.value);
    const capped = points.slice(0, limit ?? 8);
    const rest = points.slice(limit ?? 8);
    if (rest.length) {
      capped.push({ key: "Other", value: rest.reduce((s, p) => s + p.value, 0), count: rest.reduce((s, p) => s + p.count, 0) });
    }
    return capped;
  }, [rows, dimension, measure, aggregation, limit]);

  if (!dimension || !measure) return <EmptyChartState message="Pick a category and a measure." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          innerRadius={donut ? "55%" : 0}
          outerRadius="82%"
          paddingAngle={data.length > 1 ? 2 : 0}
          stroke={ink.grid}
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={i === data.length - 1 && data[i].key === "Other" ? ink.muted : palette[i % palette.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />} />
        {chart.showLegend && <Legend wrapperStyle={{ fontSize: 11, color: ink.secondary }} />}
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RadarChartView({ chart, rows, summary }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { dimension, measure, aggregation, limit } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const data = useMemo(() => {
    if (!dimension || !measure) return [];
    return aggregateBy(rows, dimension, measure, aggregation)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit ?? 8);
  }, [rows, dimension, measure, aggregation, limit]);

  if (!dimension || !measure) return <EmptyChartState message="Pick a category and a measure to compare." />;
  if (data.length < 3) return <EmptyChartState message="Radar charts need at least 3 categories." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
        <PolarGrid stroke={ink.grid} />
        <PolarAngleAxis dataKey="key" tick={{ fill: ink.secondary, fontSize: 11 }} />
        <PolarRadiusAxis tick={{ fill: ink.muted, fontSize: 10 }} tickFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />
        <Radar dataKey="value" name={measure} stroke={palette[0]} fill={palette[0]} fillOpacity={0.35} />
        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function GaugeChart({ chart, rows, summary }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { measure, aggregation } = chart.encoding;
  const col = summary.columns.find((c) => c.name === measure);
  const isPct = col?.dataType === "percentage";

  const value = useMemo(() => {
    if (!measure) return 0;
    const points = aggregateBy(rows, "__all__", measure, aggregation);
    return points[0]?.value ?? 0;
  }, [rows, measure, aggregation]);

  if (!measure) return <EmptyChartState message="Pick a measure to render a gauge." />;

  const max = isPct ? 100 : Math.max(value * 1.4, 1);
  const pct = Math.max(0, Math.min(1, value / max));
  const size = 200;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = 80;
  const arc = (start: number, end: number) => {
    const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size / 1.7}`} className="w-full max-w-[240px]">
        <path d={arc(0, 180)} stroke={ink.grid} strokeWidth={16} fill="none" strokeLinecap="round" />
        <path d={arc(0, pct * 180)} stroke={palette[0]} strokeWidth={16} fill="none" strokeLinecap="round" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground" fontSize={26} fontWeight={600}>
          {isPct ? `${value.toFixed(1)}%` : formatValue(value, col?.isCurrency ? "currency" : "number", col?.currencySymbol)}
        </text>
      </svg>
    </div>
  );
}

export function FunnelChartView({ chart, rows, summary }: ChartRenderProps) {
  const { palette } = useChartTheme();
  const { dimension, measure, aggregation } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const data = useMemo(() => {
    if (!dimension || !measure) return [];
    return aggregateBy(rows, dimension, measure, aggregation).sort((a, b) => b.value - a.value);
  }, [rows, dimension, measure, aggregation]);

  if (!dimension || !measure) return <EmptyChartState message="Pick a stage dimension and a measure." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />} />
        <Funnel dataKey="value" data={data} isAnimationActive nameKey="key">
          <LabelList position="right" dataKey="key" fill="currentColor" stroke="none" fontSize={11} />
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}
