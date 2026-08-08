"use client";

import { useMemo } from "react";
import { formatValue } from "@/lib/data/aggregate";
import { getNumericValue } from "@/lib/data/detect";
import { EmptyChartState } from "@/components/charts/chart-tooltip";
import type { ChartRenderProps } from "@/components/charts/cartesian-charts";

export function PivotTable({ chart, rows, summary }: ChartRenderProps) {
  const { dimension, secondaryDimension, measure, aggregation } = chart.encoding;
  const col = summary.columns.find((c) => c.name === measure);
  const fmt = col?.isCurrency ? ("currency" as const) : col?.dataType === "percentage" ? ("percentage" as const) : ("number" as const);

  const pivot = useMemo(() => {
    if (!dimension || !measure) return null;
    const colDim = secondaryDimension;
    const rowMap = new Map<string, Map<string, number[]>>();
    const colSet = new Set<string>();
    for (const r of rows) {
      const rk = String(r[dimension] ?? "(blank)");
      const ck = colDim ? String(r[colDim] ?? "(blank)") : "Total";
      colSet.add(ck);
      const n = getNumericValue(r[measure]);
      if (n === null) continue;
      const inner = rowMap.get(rk) ?? new Map<string, number[]>();
      const arr = inner.get(ck) ?? [];
      arr.push(n);
      inner.set(ck, arr);
      rowMap.set(rk, inner);
    }
    const agg = (values: number[]) => {
      if (!values.length) return 0;
      switch (aggregation) {
        case "avg":
          return values.reduce((a, b) => a + b, 0) / values.length;
        case "min":
          return Math.min(...values);
        case "max":
          return Math.max(...values);
        case "count":
          return values.length;
        default:
          return values.reduce((a, b) => a + b, 0);
      }
    };
    const colKeys = [...colSet].slice(0, 10);
    const rowsOut = [...rowMap.entries()].map(([rk, inner]) => {
      const cells = colKeys.map((ck) => agg(inner.get(ck) ?? []));
      const rowTotal = agg(colKeys.flatMap((ck) => inner.get(ck) ?? []));
      return { key: rk, cells, total: rowTotal };
    });
    const colTotals = colKeys.map((ck, i) => agg(rowsOut.flatMap((r) => (r.cells[i] !== undefined ? [r.cells[i]] : []))));
    const grandTotal = agg(rowsOut.flatMap((r) => r.total));
    return { colKeys, rowsOut: rowsOut.sort((a, b) => b.total - a.total), colTotals, grandTotal };
  }, [rows, dimension, secondaryDimension, measure, aggregation]);

  if (!dimension || !measure) return <EmptyChartState message="Pivot tables need at least one dimension and a measure." />;
  if (!pivot || !pivot.rowsOut.length) return <EmptyChartState message="No data matches the current filters." />;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border">
            <th className="p-2 text-left font-medium text-muted-foreground">{dimension}</th>
            {pivot.colKeys.map((c) => (
              <th key={c} className="p-2 text-right font-medium text-muted-foreground">
                {c}
              </th>
            ))}
            <th className="p-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {pivot.rowsOut.map((r) => (
            <tr key={r.key} className="border-b border-border/60 hover:bg-accent/40">
              <td className="p-2 font-medium">{r.key}</td>
              {r.cells.map((v, i) => (
                <td key={i} className="p-2 text-right tabular-nums">
                  {formatValue(v, fmt, col?.currencySymbol)}
                </td>
              ))}
              <td className="p-2 text-right font-semibold tabular-nums">{formatValue(r.total, fmt, col?.currencySymbol)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/40 font-semibold">
            <td className="p-2">Total</td>
            {pivot.colTotals.map((v, i) => (
              <td key={i} className="p-2 text-right tabular-nums">
                {formatValue(v, fmt, col?.currencySymbol)}
              </td>
            ))}
            <td className="p-2 text-right tabular-nums">{formatValue(pivot.grandTotal, fmt, col?.currencySymbol)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
