import type { DataSummary } from "@/types/data";
import type { RawRow } from "@/types/dashboard";
import { aggregateBy } from "@/lib/data/aggregate";
import { getNumericValue } from "@/lib/data/detect";

export type InsightKind =
  | "top-performer"
  | "bottom-performer"
  | "trend"
  | "outlier"
  | "correlation"
  | "growth"
  | "missing-data"
  | "duplicates"
  | "summary";

export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
  severity: "info" | "positive" | "warning";
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

let insightIdCounter = 0;
function id(prefix: string) {
  insightIdCounter += 1;
  return `${prefix}-${insightIdCounter}`;
}

export function generateInsights(rows: RawRow[], summary: DataSummary): Insight[] {
  const insights: Insight[] = [];
  const primaryMeasure = summary.measures[0];
  const primaryDim = summary.dimensions.find((d) => {
    const col = summary.columns.find((c) => c.name === d);
    return col && col.distinctCount >= 2 && col.distinctCount <= 30;
  });
  const timeColumn = summary.timeSeriesColumns[0];

  // Top / bottom performer
  if (primaryMeasure && primaryDim) {
    const points = aggregateBy(rows, primaryDim, primaryMeasure, "sum").sort((a, b) => b.value - a.value);
    if (points.length >= 2) {
      const top = points[0];
      const bottom = points[points.length - 1];
      const totalSum = points.reduce((s, p) => s + p.value, 0);
      const topShare = totalSum !== 0 ? (top.value / totalSum) * 100 : 0;
      insights.push({
        id: id("top"),
        kind: "top-performer",
        title: `${top.key} leads in ${primaryMeasure}`,
        detail: `"${top.key}" is the highest-performing ${primaryDim.toLowerCase()}, contributing ${topShare.toFixed(1)}% of total ${primaryMeasure} (${formatNum(top.value)}).`,
        severity: "positive",
      });
      insights.push({
        id: id("bottom"),
        kind: "bottom-performer",
        title: `${bottom.key} lags behind`,
        detail: `"${bottom.key}" has the lowest ${primaryMeasure} at ${formatNum(bottom.value)}, ${((1 - bottom.value / (top.value || 1)) * 100).toFixed(0)}% below the top performer.`,
        severity: "warning",
      });

      // Top contributors (80/20-ish)
      const cumulative: string[] = [];
      let running = 0;
      for (const p of points) {
        running += p.value;
        cumulative.push(p.key);
        if (running / (totalSum || 1) >= 0.8) break;
      }
      if (cumulative.length && cumulative.length < points.length) {
        insights.push({
          id: id("contrib"),
          kind: "top-performer",
          title: "A small group drives most results",
          detail: `${cumulative.length} of ${points.length} ${primaryDim.toLowerCase()} categories (${cumulative.slice(0, 3).join(", ")}${cumulative.length > 3 ? "..." : ""}) account for roughly 80% of total ${primaryMeasure}.`,
          severity: "info",
        });
      }
    }
  }

  // Trend / growth / seasonality over time
  if (primaryMeasure && timeColumn) {
    const dated = rows
      .map((r) => ({ t: Date.parse(String(r[timeColumn] ?? "")), v: getNumericValue(r[primaryMeasure]) }))
      .filter((d): d is { t: number; v: number } => !Number.isNaN(d.t) && d.v !== null)
      .sort((a, b) => a.t - b.t);

    if (dated.length >= 6) {
      const mid = Math.floor(dated.length / 2);
      const firstHalf = dated.slice(0, mid).reduce((a, d) => a + d.v, 0);
      const secondHalf = dated.slice(mid).reduce((a, d) => a + d.v, 0);
      const growth = firstHalf !== 0 ? ((secondHalf - firstHalf) / Math.abs(firstHalf)) * 100 : 0;
      const direction = growth >= 0 ? "increased" : "decreased";
      insights.push({
        id: id("growth"),
        kind: "growth",
        title: `${primaryMeasure} ${direction} ${Math.abs(growth).toFixed(1)}%`,
        detail: `Comparing the first and second half of the time range, ${primaryMeasure} ${direction} by ${Math.abs(growth).toFixed(1)}%.`,
        severity: growth >= 0 ? "positive" : "warning",
      });

      // monthly aggregation for trend/seasonality
      const byMonth = new Map<string, number>();
      for (const d of dated) {
        const date = new Date(d.t);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        byMonth.set(key, (byMonth.get(key) ?? 0) + d.v);
      }
      const monthEntries = [...byMonth.entries()];
      if (monthEntries.length >= 3) {
        const best = monthEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
        insights.push({
          id: id("season"),
          kind: "trend",
          title: `Peak activity in ${best[0]}`,
          detail: `${best[0]} was the strongest period for ${primaryMeasure} at ${formatNum(best[1])}, suggesting possible seasonality worth investigating.`,
          severity: "info",
        });
      }
    }
  }

  // Outliers via z-score
  if (primaryMeasure) {
    const values = rows.map((r) => getNumericValue(r[primaryMeasure])).filter((n): n is number => n !== null);
    if (values.length >= 8) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
      if (std > 0) {
        const outliers = values.filter((v) => Math.abs((v - mean) / std) > 3);
        if (outliers.length) {
          insights.push({
            id: id("outlier"),
            kind: "outlier",
            title: `${outliers.length} outlier${outliers.length > 1 ? "s" : ""} detected in ${primaryMeasure}`,
            detail: `Found ${outliers.length} value${outliers.length > 1 ? "s" : ""} more than 3 standard deviations from the mean (${formatNum(mean)}), which may indicate data entry errors or exceptional events.`,
            severity: "warning",
          });
        }
      }
    }
  }

  // Correlations between numeric measures
  if (summary.measures.length >= 2) {
    const [m1, m2] = summary.measures;
    const pairs = rows
      .map((r) => [getNumericValue(r[m1]), getNumericValue(r[m2])])
      .filter((p): p is [number, number] => p[0] !== null && p[1] !== null);
    if (pairs.length >= 8) {
      const corr = pearsonCorrelation(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
      if (Math.abs(corr) > 0.5) {
        insights.push({
          id: id("corr"),
          kind: "correlation",
          title: `${m1} and ${m2} are ${corr > 0 ? "positively" : "negatively"} correlated`,
          detail: `A correlation coefficient of ${corr.toFixed(2)} suggests that as ${m1} ${corr > 0 ? "increases" : "increases"}, ${m2} tends to ${corr > 0 ? "increase" : "decrease"} as well.`,
          severity: "info",
        });
      }
    }
  }

  // Data quality
  if (summary.missingCellCount > 0) {
    const pct = (summary.missingCellCount / (summary.rowCount * summary.columnCount)) * 100;
    insights.push({
      id: id("missing"),
      kind: "missing-data",
      title: `${summary.missingCellCount} missing values found`,
      detail: `${pct.toFixed(1)}% of cells are empty across the dataset. Consider cleaning these before deeper analysis.`,
      severity: pct > 5 ? "warning" : "info",
    });
  }
  if (summary.duplicateRowCount > 0) {
    insights.push({
      id: id("dupes"),
      kind: "duplicates",
      title: `${summary.duplicateRowCount} duplicate row${summary.duplicateRowCount > 1 ? "s" : ""} found`,
      detail: `These rows appear to be exact duplicates and may be worth removing to avoid skewing totals.`,
      severity: "warning",
    });
  }

  return insights;
}

function formatNum(n: number): string {
  return Intl.NumberFormat("en-US", { notation: Math.abs(n) >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

export function generatePlainEnglishSummary(rows: RawRow[], summary: DataSummary): string {
  const primaryMeasure = summary.measures[0];
  const primaryDim = summary.dimensions[0];
  const timeColumn = summary.timeSeriesColumns[0];

  if (!primaryMeasure) {
    return `This dataset contains ${summary.rowCount.toLocaleString()} records across ${summary.columnCount} columns, including ${summary.dimensions.length} categorical field${summary.dimensions.length === 1 ? "" : "s"}.`;
  }

  const parts: string[] = [];
  parts.push(`This dataset contains ${summary.rowCount.toLocaleString()} records.`);

  if (primaryDim) {
    const points = aggregateBy(rows, primaryDim, primaryMeasure, "sum").sort((a, b) => b.value - a.value);
    if (points.length) {
      parts.push(`${points[0].key} is the top-performing ${primaryDim.toLowerCase()} by ${primaryMeasure} at ${formatNum(points[0].value)}.`);
    }
  }

  if (timeColumn) {
    const dated = rows
      .map((r) => ({ t: Date.parse(String(r[timeColumn] ?? "")), v: getNumericValue(r[primaryMeasure]) }))
      .filter((d): d is { t: number; v: number } => !Number.isNaN(d.t) && d.v !== null)
      .sort((a, b) => a.t - b.t);
    if (dated.length >= 4) {
      const mid = Math.floor(dated.length / 2);
      const firstHalf = dated.slice(0, mid).reduce((a, d) => a + d.v, 0);
      const secondHalf = dated.slice(mid).reduce((a, d) => a + d.v, 0);
      const growth = firstHalf !== 0 ? ((secondHalf - firstHalf) / Math.abs(firstHalf)) * 100 : 0;
      parts.push(`${primaryMeasure} ${growth >= 0 ? "increased" : "decreased"} by ${Math.abs(growth).toFixed(0)}% over the observed period.`);
    }
  }

  return parts.join(" ");
}
