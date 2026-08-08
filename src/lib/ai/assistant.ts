import type { DataSummary } from "@/types/data";
import type { ChartConfig, ChartType, RawRow } from "@/types/dashboard";
import { aggregateBy } from "@/lib/data/aggregate";

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `assistant-chart-${Date.now().toString(36)}-${idCounter}`;
}

export interface AssistantResponse {
  message: string;
  chart?: ChartConfig;
}

function singularize(word: string): string {
  return word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word;
}

function findColumn(summary: DataSummary, tokens: string[], predicate?: (c: DataSummary["columns"][number]) => boolean): string | undefined {
  const candidates = predicate ? summary.columns.filter(predicate) : summary.columns;
  for (const rawToken of tokens) {
    const token = singularize(rawToken);
    if (token.length < 3) continue;
    const match = candidates.find((c) => {
      const name = c.name.toLowerCase();
      return name.includes(token) || token.includes(name);
    });
    if (match) return match.name;
  }
  return candidates[0]?.name;
}

function isMeasure(c: DataSummary["columns"][number]) {
  return c.role === "measure";
}
function isDimension(c: DataSummary["columns"][number]) {
  return c.role === "dimension";
}

/** Very lightweight intent parser: maps free-text prompts to a chart spec using keyword + column-name matching. */
export function interpretPrompt(prompt: string, summary: DataSummary, sheetId: string, rows: RawRow[]): AssistantResponse {
  const q = prompt.toLowerCase();
  const words = q.split(/\W+/).filter(Boolean);

  const measure =
    findColumn(summary, words, isMeasure) ??
    summary.measures[0];
  const timeColumn = summary.timeSeriesColumns[0];
  const dimension =
    findColumn(
      summary,
      words.filter((w) => !["show", "compare", "top", "best", "worst", "by", "the", "of", "for", "what", "changed"].includes(w)),
      isDimension
    ) ?? summary.dimensions[0];

  if (!measure) {
    return { message: "I couldn't find a numeric field to analyze in this dataset. Try uploading data with at least one measure column." };
  }

  let type: ChartType = "bar";
  let title = `${measure} by ${dimension ?? "Category"}`;
  let limit: number | undefined;
  let sort: "asc" | "desc" | "none" = "desc";
  let chartDimension = dimension;

  if (/month|trend|over time|timeline|time series/.test(q) && timeColumn) {
    type = "line";
    chartDimension = timeColumn;
    title = `${measure} Over Time`;
    sort = "none";
  } else if (/top\s*\d*|best|highest|leading/.test(q)) {
    type = "bar";
    const m = q.match(/top\s*(\d+)/);
    limit = m ? parseInt(m[1], 10) : 10;
    title = `Top ${limit} ${dimension ?? "Items"} by ${measure}`;
    sort = "desc";
  } else if (/worst|lowest|bottom/.test(q)) {
    type = "bar";
    limit = 10;
    sort = "asc";
    title = `Lowest ${dimension ?? "Items"} by ${measure}`;
  } else if (/compare|comparison|vs\.?|versus/.test(q)) {
    type = "bar";
    title = `${measure} Comparison by ${dimension ?? "Category"}`;
  } else if (/share|percent|distribution|breakdown/.test(q)) {
    type = "donut";
    title = `${dimension ?? "Category"} Share of ${measure}`;
  } else if (/change|quarter|growth/.test(q) && timeColumn) {
    type = "area";
    chartDimension = timeColumn;
    title = `${measure} — What Changed`;
    sort = "none";
  }

  const chart: ChartConfig = {
    id: nextId(),
    type,
    title,
    encoding: { dimension: chartDimension, measure, aggregation: "sum", sort, limit },
    colorScheme: "brand",
    showLegend: true,
    showLabels: false,
    showGrid: true,
    sheetId,
  };

  const points = chartDimension ? aggregateBy(rows, chartDimension, measure, "sum") : [];
  let message = `Here's "${title}".`;
  if (points.length) {
    const sorted = [...points].sort((a, b) => b.value - a.value);
    message += ` ${sorted[0].key} leads with ${Intl.NumberFormat("en-US", { notation: "compact" }).format(sorted[0].value)}.`;
  }

  return { message, chart };
}

export const SUGGESTED_PROMPTS = [
  "Show monthly revenue",
  "Which product performed best?",
  "Compare sales by region",
  "Show top 10 customers",
  "What changed this quarter?",
];
