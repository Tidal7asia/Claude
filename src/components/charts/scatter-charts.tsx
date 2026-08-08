"use client";

import { useMemo } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { getNumericValue } from "@/lib/data/detect";
import { formatValue } from "@/lib/data/aggregate";
import { useChartTheme } from "./use-chart-theme";
import { ChartTooltip, EmptyChartState } from "./chart-tooltip";
import type { ChartRenderProps } from "./cartesian-charts";

const MAX_POINTS = 800;

export function ScatterPlot({ chart, rows }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { measure, secondaryMeasure } = chart.encoding;

  const data = useMemo(() => {
    if (!measure || !secondaryMeasure) return [];
    const points = rows
      .map((r) => ({ x: getNumericValue(r[measure]), y: getNumericValue(r[secondaryMeasure]) }))
      .filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null);
    if (points.length <= MAX_POINTS) return points;
    const step = Math.ceil(points.length / MAX_POINTS);
    return points.filter((_, i) => i % step === 0);
  }, [rows, measure, secondaryMeasure]);

  if (!measure || !secondaryMeasure) return <EmptyChartState message="Scatter plots need two numeric measures." />;
  if (!data.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        {chart.showGrid && <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" />}
        <XAxis type="number" dataKey="x" name={measure} tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} tickFormatter={(v) => formatValue(v)} />
        <YAxis type="number" dataKey="y" name={secondaryMeasure} tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} tickFormatter={(v) => formatValue(v)} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltip valueFormatter={(v) => formatValue(v)} />} />
        <Scatter data={data} fill={palette[0]} fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function BubbleChart({ chart, rows }: ChartRenderProps) {
  const { palette, ink } = useChartTheme();
  const { dimension, measure, secondaryMeasure } = chart.encoding;

  const series = useMemo(() => {
    if (!dimension || !measure || !secondaryMeasure) return [];
    const byCategory = new Map<string, { x: number; y: number; z: number }[]>();
    for (const r of rows) {
      const cat = String(r[dimension] ?? "(blank)");
      const x = getNumericValue(r[measure]);
      const y = getNumericValue(r[secondaryMeasure]);
      if (x === null || y === null) continue;
      const arr = byCategory.get(cat) ?? [];
      arr.push({ x, y, z: 1 });
      byCategory.set(cat, arr);
    }
    return [...byCategory.entries()]
      .slice(0, 6)
      .map(([name, points]) => ({ name, points: points.slice(0, 150) }));
  }, [rows, dimension, measure, secondaryMeasure]);

  if (!dimension || !measure || !secondaryMeasure)
    return <EmptyChartState message="Bubble charts need a category and two measures." />;
  if (!series.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        {chart.showGrid && <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" />}
        <XAxis type="number" dataKey="x" name={measure} tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} />
        <YAxis type="number" dataKey="y" name={secondaryMeasure} tick={{ fill: ink.muted, fontSize: 11 }} stroke={ink.axis} />
        <ZAxis dataKey="z" range={[60, 400]} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltip />} />
        {chart.showLegend && <Legend wrapperStyle={{ fontSize: 11, color: ink.secondary }} />}
        {series.map((s, i) => (
          <Scatter key={s.name} name={s.name} data={s.points} fill={palette[i % palette.length]} fillOpacity={0.6} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
