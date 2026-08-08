"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";
import { useMemo } from "react";
import { aggregateBy } from "@/lib/data/aggregate";
import { getNumericValue } from "@/lib/data/detect";
import { useChartTheme } from "./use-chart-theme";
import { ChartTooltip, EmptyChartState } from "./chart-tooltip";
import type { ChartConfig, RawRow } from "@/types/dashboard";
import type { DataSummary } from "@/types/data";
import { formatValue } from "@/lib/data/aggregate";

export interface ChartRenderProps {
  chart: ChartConfig;
  rows: RawRow[];
  summary: DataSummary;
}

function useColumnFormat(summary: DataSummary, name?: string) {
  const col = summary.columns.find((c) => c.name === name);
  if (col?.isCurrency) return { type: "currency" as const, symbol: col.currencySymbol };
  if (col?.dataType === "percentage") return { type: "percentage" as const, symbol: undefined };
  return { type: "number" as const, symbol: undefined };
}

function sortAndLimit<T extends { value: number }>(points: T[], sort?: string, limit?: number): T[] {
  let out = [...points];
  if (sort === "desc") out.sort((a, b) => b.value - a.value);
  else if (sort === "asc") out.sort((a, b) => a.value - b.value);
  if (limit) out = out.slice(0, limit);
  return out;
}

export function BarColumnChart({ chart, rows, summary, horizontal }: ChartRenderProps & { horizontal: boolean }) {
  const { palette, ink } = useChartTheme();
  const { dimension, measure, aggregation, sort, limit } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const data = useMemo(() => {
    if (!dimension || !measure) return [];
    const points = aggregateBy(rows, dimension, measure, aggregation);
    return sortAndLimit(points, sort, limit ?? 25);
  }, [rows, dimension, measure, aggregation, sort, limit]);

  if (!dimension || !measure) return <EmptyChartState message="Pick a dimension and measure to render this chart." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        {chart.showGrid && <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" vertical={!horizontal} horizontal={horizontal} />}
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} tickFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />
            <YAxis type="category" dataKey="key" width={100} tick={{ fill: ink.secondary, fontSize: 11 }} stroke={ink.axis} />
          </>
        ) : (
          <>
            <XAxis dataKey="key" tick={{ fill: ink.secondary, fontSize: 11 }} stroke={ink.axis} interval={0} angle={data.length > 8 ? -30 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 50 : 30} />
            <YAxis tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} tickFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />
          </>
        )}
        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />} cursor={{ fill: ink.grid, opacity: 0.4 }} />
        <Bar dataKey="value" name={measure} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[0]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineAreaChart({ chart, rows, summary, area }: ChartRenderProps & { area: boolean }) {
  const { palette, ink } = useChartTheme();
  const { dimension, measure, aggregation } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);
  const timeCol = summary.timeSeriesColumns.find((c) => c === dimension);

  const data = useMemo(() => {
    if (!dimension || !measure) return [];
    let points = aggregateBy(rows, dimension, measure, aggregation);
    if (timeCol) {
      points = [...points].sort((a, b) => Date.parse(a.key) - Date.parse(b.key));
    }
    return points;
  }, [rows, dimension, measure, aggregation, timeCol]);

  if (!dimension || !measure) return <EmptyChartState message="Pick a time or category field and a measure." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  const Chart = area ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Chart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id={`fill-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={palette[0]} stopOpacity={0.35} />
            <stop offset="95%" stopColor={palette[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        {chart.showGrid && <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" vertical={false} />}
        <XAxis
          dataKey="key"
          tick={{ fill: ink.secondary, fontSize: 11 }}
          stroke={ink.axis}
          tickFormatter={(v) => (timeCol ? new Date(v).toLocaleDateString(undefined, { month: "short", year: "2-digit" }) : v)}
          minTickGap={24}
        />
        <YAxis tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} tickFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />
        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />} cursor={{ stroke: ink.axis }} />
        {area ? (
          <Area type="monotone" dataKey="value" name={measure} stroke={palette[0]} strokeWidth={2} fill={`url(#fill-${chart.id})`} />
        ) : (
          <Line type="monotone" dataKey="value" name={measure} stroke={palette[0]} strokeWidth={2} dot={data.length < 40} />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export function StackedBarChart({ chart, rows, summary }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { dimension, secondaryDimension, measure, aggregation, sort, limit } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const { data, seriesKeys } = useMemo(() => {
    if (!dimension || !secondaryDimension || !measure) return { data: [], seriesKeys: [] as string[] };
    const secondarySet = new Set<string>();
    const map = new Map<string, Record<string, number | string>>();
    for (const row of rows) {
      const primaryKey = String(row[dimension] ?? "(blank)");
      const secondaryKey = String(row[secondaryDimension] ?? "(blank)");
      secondarySet.add(secondaryKey);
      const n = getNumericValue(row[measure]);
      if (n === null) continue;
      const entry = map.get(primaryKey) ?? { key: primaryKey };
      entry[secondaryKey] = ((entry[secondaryKey] as number) ?? 0) + (aggregation === "count" ? 1 : n);
      map.set(primaryKey, entry);
    }
    let rowsOut = [...map.values()];
    const keys = [...secondarySet].slice(0, 8);
    if (sort && sort !== "none") {
      rowsOut.sort((a, b) => {
        const sa = keys.reduce((s, k) => s + Number(a[k] ?? 0), 0);
        const sb = keys.reduce((s, k) => s + Number(b[k] ?? 0), 0);
        return sort === "desc" ? sb - sa : sa - sb;
      });
    }
    if (limit) rowsOut = rowsOut.slice(0, limit);
    return { data: rowsOut, seriesKeys: keys };
  }, [rows, dimension, secondaryDimension, measure, aggregation, sort, limit]);

  if (!dimension || !secondaryDimension || !measure)
    return <EmptyChartState message="Stacked bars need two dimensions and a measure." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        {chart.showGrid && <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" vertical={false} />}
        <XAxis dataKey="key" tick={{ fill: ink.secondary, fontSize: 11 }} stroke={ink.axis} />
        <YAxis tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} tickFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />
        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />} cursor={{ fill: ink.grid, opacity: 0.4 }} />
        {chart.showLegend && <Legend wrapperStyle={{ fontSize: 11, color: ink.secondary }} />}
        {seriesKeys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId="stack" name={k} fill={palette[i % palette.length]} radius={i === seriesKeys.length - 1 ? [6, 6, 0, 0] : undefined} maxBarSize={48} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HistogramChart({ chart, rows, summary }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { measure } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const data = useMemo(() => {
    if (!measure) return [];
    const values = rows.map((r) => getNumericValue(r[measure])).filter((n): n is number => n !== null);
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 10;
    const width = (max - min) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      key: `${formatValue(min + i * width, fmt.type, fmt.symbol)}–${formatValue(min + (i + 1) * width, fmt.type, fmt.symbol)}`,
      value: 0,
    }));
    for (const v of values) {
      const idx = Math.min(binCount - 1, Math.floor((v - min) / width));
      bins[idx].value += 1;
    }
    return bins;
  }, [rows, measure, fmt.type, fmt.symbol]);

  if (!measure) return <EmptyChartState message="Pick a numeric measure to see its distribution." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 20 }}>
        {chart.showGrid && <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" vertical={false} />}
        <XAxis dataKey="key" tick={{ fill: ink.secondary, fontSize: 10 }} stroke={ink.axis} angle={-25} textAnchor="end" height={50} interval={0} />
        <YAxis tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} allowDecimals={false} />
        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} records`} />} cursor={{ fill: ink.grid, opacity: 0.4 }} />
        <Bar dataKey="value" name="Count" fill={palette[2]} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WaterfallChart({ chart, rows, summary }: ChartRenderProps) {
  const { ink } = useChartTheme();
  const { dimension, measure, aggregation, sort, limit } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const data = useMemo(() => {
    if (!dimension || !measure) return [];
    const points = aggregateBy(rows, dimension, measure, aggregation);
    let ordered = [...points];
    if (sort === "asc") ordered.sort((a, b) => a.value - b.value);
    else if (sort === "desc") ordered.sort((a, b) => b.value - a.value);
    if (limit) ordered = ordered.slice(0, limit);
    let running = 0;
    return ordered.map((p) => {
      const start = running;
      running += p.value;
      return { key: p.key, base: Math.min(start, running), delta: Math.abs(p.value), positive: p.value >= 0, end: running };
    });
  }, [rows, dimension, measure, aggregation, sort, limit]);

  if (!dimension || !measure) return <EmptyChartState message="Waterfall charts need a dimension and a measure." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        {chart.showGrid && <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" vertical={false} />}
        <XAxis dataKey="key" tick={{ fill: ink.secondary, fontSize: 11 }} stroke={ink.axis} />
        <YAxis tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} tickFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />
        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />} cursor={{ fill: ink.grid, opacity: 0.4 }} />
        <ReferenceLine y={0} stroke={ink.axis} />
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="delta" stackId="wf" radius={[4, 4, 4, 4]} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.positive ? "#0ca30c" : "#d03b3b"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
