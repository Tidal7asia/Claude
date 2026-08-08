"use client";

import { Fragment, useMemo } from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { MapPin } from "lucide-react";
import { aggregateBy, formatValue } from "@/lib/data/aggregate";
import { getNumericValue } from "@/lib/data/detect";
import { useChartTheme } from "./use-chart-theme";
import { ChartTooltip, EmptyChartState } from "./chart-tooltip";
import type { ChartRenderProps } from "./cartesian-charts";

function useColumnFormat(summary: ChartRenderProps["summary"], name?: string) {
  const col = summary.columns.find((c) => c.name === name);
  if (col?.isCurrency) return { type: "currency" as const, symbol: col.currencySymbol };
  if (col?.dataType === "percentage") return { type: "percentage" as const, symbol: undefined };
  return { type: "number" as const, symbol: undefined };
}

export function TreemapChart({ chart, rows, summary }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { dimension, measure, aggregation, limit } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const data = useMemo(() => {
    if (!dimension || !measure) return [];
    return aggregateBy(rows, dimension, measure, aggregation)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit ?? 20)
      .map((p) => ({ name: p.key, size: Math.max(p.value, 0) }));
  }, [rows, dimension, measure, aggregation, limit]);

  if (!dimension || !measure) return <EmptyChartState message="Treemaps need a category and a measure." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="size"
        nameKey="name"
        stroke={ink.grid}
        fill={palette[0]}
        content={<TreemapCell palette={palette} />}
      >
        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatValue(v, fmt.type, fmt.symbol)} />} />
      </Treemap>
    </ResponsiveContainer>
  );
}

interface TreemapCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  index?: number;
  palette: string[];
}

function TreemapCell({ x = 0, y = 0, width = 0, height = 0, name, index = 0, palette }: TreemapCellProps) {
  const fill = palette[index % palette.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.85} stroke="#fff" strokeWidth={2} rx={6} />
      {width > 60 && height > 28 && (
        <text x={x + 8} y={y + 18} fontSize={11} fill="#fff" fontWeight={600}>
          {name}
        </text>
      )}
    </g>
  );
}

export function HeatmapChart({ chart, rows, summary }: ChartRenderProps) {
  const { sequential, ink } = useChartTheme();
  const { dimension, secondaryDimension, measure, aggregation } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const grid = useMemo(() => {
    if (!dimension || !secondaryDimension || !measure) return null;
    const rowsKey = new Map<string, Map<string, number>>();
    const colSet = new Set<string>();
    for (const r of rows) {
      const rk = String(r[dimension] ?? "(blank)");
      const ck = String(r[secondaryDimension] ?? "(blank)");
      colSet.add(ck);
      const n = getNumericValue(r[measure]);
      if (n === null) continue;
      const inner = rowsKey.get(rk) ?? new Map<string, number>();
      inner.set(ck, (inner.get(ck) ?? 0) + (aggregation === "count" ? 1 : n));
      rowsKey.set(rk, inner);
    }
    const rowKeys = [...rowsKey.keys()].slice(0, 12);
    const colKeys = [...colSet].slice(0, 12);
    let max = 0;
    for (const inner of rowsKey.values()) for (const v of inner.values()) max = Math.max(max, v);
    return { rowKeys, colKeys, rowsKey, max };
  }, [rows, dimension, secondaryDimension, measure, aggregation]);

  if (!dimension || !secondaryDimension || !measure)
    return <EmptyChartState message="Heatmaps need two dimensions and a measure." />;
  if (!grid || !grid.rowKeys.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <div className="flex h-full flex-col overflow-auto text-xs">
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${grid.colKeys.length}, minmax(48px, 1fr))` }}>
        <div />
        {grid.colKeys.map((c) => (
          <div key={c} className="truncate px-1 py-1 text-center font-medium" style={{ color: ink.secondary }} title={c}>
            {c}
          </div>
        ))}
        {grid.rowKeys.map((r) => (
          <Fragment key={r}>
            <div className="truncate py-1 pr-2 font-medium" style={{ color: ink.secondary }} title={r}>
              {r}
            </div>
            {grid.colKeys.map((c) => {
              const v = grid.rowsKey.get(r)?.get(c) ?? 0;
              const t = grid.max > 0 ? v / grid.max : 0;
              const stepIdx = Math.min(sequential.length - 1, Math.floor(t * (sequential.length - 1)));
              return (
                <div
                  key={`${r}-${c}`}
                  className="m-0.5 flex aspect-square items-center justify-center rounded-md font-medium"
                  style={{ background: v ? sequential[stepIdx] : ink.grid, color: t > 0.55 ? "#fff" : ink.primary }}
                  title={`${r} / ${c}: ${formatValue(v, fmt.type, fmt.symbol)}`}
                >
                  {v ? formatValue(v, fmt.type, fmt.symbol) : ""}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function CalendarHeatmap({ chart, rows, summary }: ChartRenderProps) {
  const { sequential, ink } = useChartTheme();
  const { dimension, measure, aggregation } = chart.encoding;
  const timeCol = dimension ?? summary.timeSeriesColumns[0];
  const fmt = useColumnFormat(summary, measure);

  const { weeks, max, range } = useMemo(() => {
    if (!timeCol) return { weeks: [] as { date: Date; value: number }[][], max: 0, range: "" };
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const t = Date.parse(String(r[timeCol] ?? ""));
      if (Number.isNaN(t)) continue;
      const d = new Date(t);
      const key = d.toISOString().slice(0, 10);
      const n = measure ? getNumericValue(r[measure]) : 1;
      if (n === null) continue;
      byDay.set(key, (byDay.get(key) ?? 0) + (aggregation === "count" || !measure ? 1 : n));
    }
    const days = [...byDay.entries()].map(([k, v]) => ({ date: new Date(k), value: v })).sort((a, b) => a.date.getTime() - b.date.getTime());
    if (!days.length) return { weeks: [], max: 0, range: "" };
    const last90 = days.slice(-90);
    const first = last90[0].date;
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const dayMap = new Map(last90.map((d) => [d.date.toISOString().slice(0, 10), d.value]));
    const cells: { date: Date; value: number }[] = [];
    const cursor = new Date(start);
    const end = last90[last90.length - 1].date;
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      cells.push({ date: new Date(cursor), value: dayMap.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const weeksOut: { date: Date; value: number }[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeksOut.push(cells.slice(i, i + 7));
    const maxV = Math.max(...last90.map((d) => d.value), 1);
    return {
      weeks: weeksOut,
      max: maxV,
      range: `${first.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    };
  }, [rows, timeCol, measure, aggregation]);

  if (!timeCol) return <EmptyChartState message="Calendar heatmaps need a date field." />;
  if (!weeks.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => {
              const t = cell.value / max;
              const stepIdx = Math.min(sequential.length - 1, Math.floor(t * (sequential.length - 1)));
              return (
                <div
                  key={di}
                  className="size-3 rounded-sm"
                  style={{ background: cell.value ? sequential[stepIdx] : ink.grid }}
                  title={`${cell.date.toLocaleDateString()}: ${formatValue(cell.value, fmt.type, fmt.symbol)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs" style={{ color: ink.muted }}>
        {range}
      </p>
    </div>
  );
}

export function GeoBreakdown({ chart, rows, summary }: ChartRenderProps) {
  const { sequential, ink } = useChartTheme();
  const { dimension, measure, aggregation, limit } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const data = useMemo(() => {
    if (!dimension) return [];
    return aggregateBy(rows, dimension, measure, aggregation)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit ?? 12);
  }, [rows, dimension, measure, aggregation, limit]);

  if (!dimension) return <EmptyChartState message="Pick a geographic field." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-auto pr-1">
      {data.map((d) => {
        const t = d.value / max;
        const stepIdx = Math.min(sequential.length - 1, Math.floor(t * (sequential.length - 1)));
        return (
          <div key={d.key} className="flex items-center gap-2 text-xs">
            <MapPin className="size-3.5 shrink-0" style={{ color: ink.muted }} />
            <span className="w-24 shrink-0 truncate font-medium">{d.key}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: ink.grid }}>
              <div className="h-full rounded-full" style={{ width: `${t * 100}%`, background: sequential[stepIdx] }} />
            </div>
            <span className="w-14 shrink-0 text-right tabular-nums" style={{ color: ink.secondary }}>
              {formatValue(d.value, fmt.type, fmt.symbol)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BoxPlotChart({ chart, rows, summary }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { dimension, measure, limit } = chart.encoding;
  const fmt = useColumnFormat(summary, measure);

  const groups = useMemo(() => {
    if (!measure) return [];
    const byGroup = new Map<string, number[]>();
    for (const r of rows) {
      const key = dimension ? String(r[dimension] ?? "(blank)") : "All";
      const n = getNumericValue(r[measure]);
      if (n === null) continue;
      const arr = byGroup.get(key) ?? [];
      arr.push(n);
      byGroup.set(key, arr);
    }
    return [...byGroup.entries()]
      .slice(0, limit ?? 10)
      .map(([key, values]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
        return { key, min: sorted[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: sorted[sorted.length - 1] };
      });
  }, [rows, dimension, measure, limit]);

  if (!measure) return <EmptyChartState message="Pick a measure to see its spread." />;
  if (!groups.length) return <EmptyChartState message="No data matches the current filters." />;

  const allVals = groups.flatMap((g) => [g.min, g.max]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const scale = (v: number) => 100 - ((v - min) / (max - min || 1)) * 100;

  return (
    <div className="flex h-full items-end gap-4 overflow-x-auto px-2 pb-6 pt-2">
      {groups.map((g, i) => (
        <div key={g.key} className="flex h-full min-w-[56px] flex-1 flex-col items-center justify-end gap-1">
          <div className="relative h-full w-8">
            <div className="absolute left-1/2 w-px -translate-x-1/2" style={{ top: `${scale(g.max)}%`, bottom: `${100 - scale(g.min)}%`, background: ink.axis }} />
            <div
              className="absolute left-1/2 w-full -translate-x-1/2 rounded-sm border"
              style={{
                top: `${scale(g.q3)}%`,
                height: `${scale(g.q1) - scale(g.q3)}%`,
                background: palette[i % palette.length],
                opacity: 0.75,
                borderColor: ink.axis,
              }}
            />
            <div className="absolute left-1/2 w-full -translate-x-1/2 border-t-2" style={{ top: `${scale(g.median)}%`, borderColor: ink.primary }} />
          </div>
          <span className="max-w-[64px] truncate text-[10px]" style={{ color: ink.secondary }} title={g.key}>
            {g.key}
          </span>
        </div>
      ))}
      <span className="sr-only">{formatValue(min, fmt.type)}</span>
    </div>
  );
}

export function TimelineChart({ chart, rows, summary }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { dimension, measure, aggregation } = chart.encoding;
  const timeCol = dimension ?? summary.timeSeriesColumns[0];
  const fmt = useColumnFormat(summary, measure);

  const points = useMemo(() => {
    if (!timeCol) return [];
    const grouped = aggregateBy(rows, timeCol, measure, measure ? aggregation : "count");
    return grouped
      .map((p) => ({ ...p, t: Date.parse(p.key) }))
      .filter((p) => !Number.isNaN(p.t))
      .sort((a, b) => a.t - b.t);
  }, [rows, timeCol, measure, aggregation]);

  if (!timeCol) return <EmptyChartState message="Timelines need a date field." />;
  if (!points.length) return <EmptyChartState message="No data matches the current filters." />;

  const min = points[0].t;
  const max = points[points.length - 1].t;
  const span = max - min || 1;
  const maxVal = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="relative h-full w-full px-2 py-6">
      <div className="absolute left-2 right-2 top-1/2 h-px" style={{ background: ink.axis }} />
      {points.map((p, i) => {
        const left = ((p.t - min) / span) * 100;
        const size = 8 + (p.value / maxVal) * 20;
        return (
          <div
            key={i}
            className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${left}%`, width: size, height: size, background: palette[0], boxShadow: `0 0 0 2px ${ink.grid}` }}
            title={`${new Date(p.t).toLocaleDateString()}: ${formatValue(p.value, fmt.type, fmt.symbol)}`}
          />
        );
      })}
      <div className="absolute bottom-0 left-2 text-[10px]" style={{ color: ink.muted }}>
        {new Date(min).toLocaleDateString()}
      </div>
      <div className="absolute bottom-0 right-2 text-[10px]" style={{ color: ink.muted }}>
        {new Date(max).toLocaleDateString()}
      </div>
    </div>
  );
}
