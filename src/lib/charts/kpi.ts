import type { DataSummary } from "@/types/data";
import type { RawRow } from "@/types/dashboard";
import { computeKPI } from "@/lib/data/aggregate";
import { getNumericValue as gnv } from "@/lib/data/detect";

export interface KpiCardData {
  id: string;
  label: string;
  value: number;
  format: "currency" | "percentage" | "number";
  currencySymbol?: string;
  icon: "records" | "sum" | "avg" | "median" | "growth" | "max" | "min" | "distinct";
  delta?: number; // growth % vs previous period, if computable
  /** Column this figure was computed from — lets the UI show exactly which rows produced it.
   * null means "every currently-filtered row" (e.g. Total Records). */
  sourceColumn: string | null;
}

export function generateKPIs(rows: RawRow[], summary: DataSummary, timeColumn?: string): KpiCardData[] {
  const kpis: KpiCardData[] = [];
  kpis.push({
    id: "total-records",
    label: "Total Records",
    value: rows.length,
    format: "number",
    icon: "records",
    sourceColumn: null,
  });

  const primaryMeasure = summary.measures[0];
  if (primaryMeasure) {
    const col = summary.columns.find((c) => c.name === primaryMeasure);
    const format = col?.isCurrency ? "currency" : col?.dataType === "percentage" ? "percentage" : "number";

    kpis.push({
      id: "sum",
      label: `Total ${primaryMeasure}`,
      value: computeKPI(rows, primaryMeasure, "sum"),
      format,
      currencySymbol: col?.currencySymbol,
      icon: "sum",
      sourceColumn: primaryMeasure,
    });
    kpis.push({
      id: "avg",
      label: `Average ${primaryMeasure}`,
      value: computeKPI(rows, primaryMeasure, "avg"),
      format,
      currencySymbol: col?.currencySymbol,
      icon: "avg",
      sourceColumn: primaryMeasure,
    });
    kpis.push({
      id: "median",
      label: `Median ${primaryMeasure}`,
      value: computeKPI(rows, primaryMeasure, "median"),
      format,
      currencySymbol: col?.currencySymbol,
      icon: "median",
      sourceColumn: primaryMeasure,
    });
    kpis.push({
      id: "max",
      label: `Highest ${primaryMeasure}`,
      value: computeKPI(rows, primaryMeasure, "max"),
      format,
      currencySymbol: col?.currencySymbol,
      icon: "max",
      sourceColumn: primaryMeasure,
    });
    kpis.push({
      id: "min",
      label: `Lowest ${primaryMeasure}`,
      value: computeKPI(rows, primaryMeasure, "min"),
      format,
      currencySymbol: col?.currencySymbol,
      icon: "min",
      sourceColumn: primaryMeasure,
    });

    if (timeColumn) {
      const dated = rows
        .map((r) => ({ t: Date.parse(String(r[timeColumn] ?? "")), v: gnv(r[primaryMeasure]) }))
        .filter((d) => !Number.isNaN(d.t) && d.v !== null) as { t: number; v: number }[];
      if (dated.length >= 4) {
        dated.sort((a, b) => a.t - b.t);
        const mid = Math.floor(dated.length / 2);
        const firstHalf = dated.slice(0, mid).reduce((a, d) => a + d.v, 0);
        const secondHalf = dated.slice(mid).reduce((a, d) => a + d.v, 0);
        const growth = firstHalf !== 0 ? ((secondHalf - firstHalf) / Math.abs(firstHalf)) * 100 : 0;
        kpis.push({
          id: "growth",
          label: "Growth %",
          value: growth,
          format: "percentage",
          icon: "growth",
          delta: growth,
          sourceColumn: primaryMeasure,
        });
      }
    }
  }

  const primaryDim = summary.dimensions[0];
  if (primaryDim) {
    const distinctValues = new Set(rows.map((r) => r[primaryDim]).filter((v) => v !== null && v !== undefined && v !== ""));
    kpis.push({
      id: "distinct",
      label: `Distinct ${primaryDim}`,
      value: distinctValues.size,
      format: "number",
      icon: "distinct",
      sourceColumn: primaryDim,
    });
  }

  return kpis;
}
