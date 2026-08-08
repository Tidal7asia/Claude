import type { CellValue } from "@/types/data";
import type { AggregationType, FilterDef, RawRow } from "@/types/dashboard";
import { getNumericValue } from "./detect";

export function applyFilters(rows: RawRow[], filters: FilterDef[]): RawRow[] {
  if (!filters.length) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const cell = row[f.column];
      switch (f.kind) {
        case "search": {
          if (!f.value.search) return true;
          return String(cell ?? "").toLowerCase().includes(f.value.search.toLowerCase());
        }
        case "dropdown":
        case "multiSelect":
        case "checkbox": {
          if (!f.value.selected || f.value.selected.length === 0) return true;
          return f.value.selected.some((sel) => String(sel) === String(cell));
        }
        case "dateRange": {
          const [start, end] = f.value.dateRange ?? [null, null];
          if (!start && !end) return true;
          const t = Date.parse(String(cell ?? ""));
          if (Number.isNaN(t)) return false;
          if (start && t < Date.parse(start)) return false;
          if (end && t > Date.parse(end)) return false;
          return true;
        }
        case "numericRange": {
          if (!f.value.numericRange) return true;
          const [min, max] = f.value.numericRange;
          const n = getNumericValue(cell);
          if (n === null) return false;
          return n >= min && n <= max;
        }
        default:
          return true;
      }
    })
  );
}

export interface AggregatedPoint {
  key: string;
  value: number;
  count: number;
}

export function aggregateBy(
  rows: RawRow[],
  dimension: string,
  measure: string | undefined,
  aggregation: AggregationType
): AggregatedPoint[] {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const rawKey = row[dimension];
    const key = rawKey === null || rawKey === undefined || rawKey === "" ? "(blank)" : String(rawKey);
    const arr = groups.get(key) ?? [];
    if (measure) {
      const n = getNumericValue(row[measure]);
      if (n !== null) arr.push(n);
    } else {
      arr.push(1);
    }
    groups.set(key, arr);
  }

  const points: AggregatedPoint[] = [...groups.entries()].map(([key, values]) => {
    let value: number;
    switch (aggregation) {
      case "sum":
        value = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        value = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
      case "count":
        value = values.length;
        break;
      case "min":
        value = values.length ? Math.min(...values) : 0;
        break;
      case "max":
        value = values.length ? Math.max(...values) : 0;
        break;
      case "median": {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        value = sorted.length ? (sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]) : 0;
        break;
      }
      case "distinct":
        value = new Set(values).size;
        break;
      default:
        value = values.reduce((a, b) => a + b, 0);
    }
    return { key, value, count: values.length };
  });

  return points;
}

export function computeKPI(rows: RawRow[], column: string, aggregation: AggregationType): number {
  const values = rows.map((r) => getNumericValue(r[column])).filter((n): n is number => n !== null);
  if (!values.length) return 0;
  switch (aggregation) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "count":
      return values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
    case "distinct":
      return new Set(values).size;
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

export function formatValue(value: number, type?: "currency" | "percentage" | "number", currencySymbol = "$"): string {
  if (type === "currency") {
    return `${currencySymbol}${Intl.NumberFormat("en-US", { notation: value >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value)}`;
  }
  if (type === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  return Intl.NumberFormat("en-US", { notation: Math.abs(value) >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

export function distinctValues(rows: RawRow[], column: string): (string | number | boolean)[] {
  const set = new Set<string | number | boolean>();
  for (const row of rows) {
    const v = row[column];
    if (v !== null && v !== undefined && v !== "") set.add(v as string | number | boolean);
  }
  return [...set].sort((a, b) => String(a).localeCompare(String(b)));
}

export function numericBounds(rows: RawRow[], column: string): [number, number] {
  const values = rows.map((r) => getNumericValue(r[column])).filter((n): n is number => n !== null);
  if (!values.length) return [0, 0];
  return [Math.min(...values), Math.max(...values)];
}

export type { CellValue };
