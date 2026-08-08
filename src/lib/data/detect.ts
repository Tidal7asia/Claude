import type { CellValue, ColumnDataType, ColumnProfile, ColumnRole, DataSummary } from "@/types/data";

const CURRENCY_SYMBOLS = ["$", "€", "£", "¥", "₹", "₩", "₽", "R$", "₺"];
const CURRENCY_NAME_HINTS = [
  "price", "cost", "revenue", "sales", "amount", "salary", "income", "expense",
  "budget", "fee", "value", "profit", "spend", "payment", "total", "wage",
];
const PERCENTAGE_NAME_HINTS = ["percent", "pct", "rate", "ratio", "margin", "share", "growth"];
const GEO_NAME_HINTS = [
  "country", "state", "city", "region", "province", "county", "zip", "postal",
  "latitude", "longitude", "lat", "lng", "lon", "address", "continent", "territory",
];
const TIME_NAME_HINTS = ["date", "time", "year", "month", "day", "quarter", "created", "updated", "timestamp"];
const ID_NAME_HINTS = ["id", "uuid", "key", "code", "sku", "index", "#"];
const BOOLEAN_STRINGS = new Set(["true", "false", "yes", "no", "y", "n", "0", "1"]);

function isDateLike(value: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) return true;
  if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(value)) return true;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}$/i.test(value)) return true;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  // guard against plain integers being parsed as years/timestamps
  if (/^-?\d+(\.\d+)?$/.test(value)) return false;
  return true;
}

function detectRawType(value: CellValue): "number" | "boolean" | "date" | "string" | "empty" {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  const str = String(value).trim();
  if (BOOLEAN_STRINGS.has(str.toLowerCase()) && !/^\d+$/.test(str)) return "boolean";
  if (CURRENCY_SYMBOLS.some((s) => str.startsWith(s)) || /%$/.test(str)) return "string";
  if (isDateLike(str)) return "date";
  const numeric = str.replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(numeric)) return "number";
  return "string";
}

function parseNumeric(value: CellValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const str = String(value).trim();
  const cleaned = str.replace(/[,%]/g, "").replace(/[$€£¥₹₩₽₺]/g, "").replace(/^R\$/, "").trim();
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function profileColumn(name: string, index: number, rows: Record<string, CellValue>[]): ColumnProfile {
  const values = rows.map((r) => r[name]);
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== "");
  const missingCount = values.length - nonEmpty.length;
  const lowerName = name.toLowerCase();

  const typeCounts: Record<string, number> = { number: 0, boolean: 0, date: 0, string: 0 };
  for (const v of nonEmpty) {
    const t = detectRawType(v);
    if (t !== "empty") typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  const total = nonEmpty.length || 1;
  const dominant = (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as string) ?? "string";

  const hasPercentSign = nonEmpty.some((v) => typeof v === "string" && v.trim().endsWith("%"));
  const hasCurrencySymbol = nonEmpty.some(
    (v) => typeof v === "string" && CURRENCY_SYMBOLS.some((s) => v.trim().startsWith(s))
  );
  const nameLooksCurrency = CURRENCY_NAME_HINTS.some((h) => lowerName.includes(h));
  const nameLooksPercentage = PERCENTAGE_NAME_HINTS.some((h) => lowerName.includes(h));
  const nameLooksGeo = GEO_NAME_HINTS.some((h) => lowerName.includes(h));
  const nameLooksTime = TIME_NAME_HINTS.some((h) => lowerName.includes(h));
  const nameLooksId = ID_NAME_HINTS.some((h) => lowerName === h || lowerName.endsWith(`_${h}`) || lowerName.endsWith(h));

  const distinctSet = new Set(nonEmpty.map((v) => String(v).toLowerCase().trim()));
  const distinctCount = distinctSet.size;
  const distinctRatio = distinctCount / total;

  let dataType: ColumnDataType = "text";
  const numericShare = typeCounts.number / total;
  const dateShare = typeCounts.date / total;
  const boolShare = typeCounts.boolean / total;

  if (boolShare > 0.9 && distinctCount <= 3) {
    dataType = "boolean";
  } else if (hasPercentSign || (nameLooksPercentage && numericShare > 0.7)) {
    dataType = "percentage";
  } else if (hasCurrencySymbol || (nameLooksCurrency && numericShare > 0.7)) {
    dataType = "currency";
  } else if (dateShare > 0.7 || (nameLooksTime && dateShare > 0.3)) {
    dataType = "date";
  } else if (numericShare > 0.85) {
    dataType = "number";
  } else if (dominant === "string" && distinctRatio < 0.5 && distinctCount <= Math.max(50, total * 0.2)) {
    dataType = "category";
  } else {
    dataType = "text";
  }

  const isCurrency = dataType === "currency";
  const isGeo = nameLooksGeo;
  const isTimeSeries = dataType === "date";

  let role: ColumnRole = "dimension";
  if (isGeo) role = "geo";
  else if (isTimeSeries) role = "time";
  else if (dataType === "number" || dataType === "currency" || dataType === "percentage") role = "measure";
  else if (nameLooksId && distinctRatio > 0.9) role = "identifier";
  else role = "dimension";

  const profile: ColumnProfile = {
    name,
    index,
    dataType,
    role,
    isCurrency,
    currencySymbol: isCurrency
      ? CURRENCY_SYMBOLS.find((s) => nonEmpty.some((v) => typeof v === "string" && v.trim().startsWith(s))) ?? "$"
      : undefined,
    isGeo,
    isTimeSeries,
    missingCount,
    missingPct: values.length ? missingCount / values.length : 0,
    distinctCount,
    duplicateValueCount: Math.max(0, nonEmpty.length - distinctCount),
    sampleValues: nonEmpty.slice(0, 5),
  };

  if (role === "measure") {
    const nums = nonEmpty.map(parseNumeric).filter((n): n is number => n !== null);
    if (nums.length) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = sum / nums.length;
      profile.stats = {
        sum,
        avg,
        median: median(sorted),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        stdDev: stdDev(nums, avg),
      };
    }
  }

  if (dataType === "category" || dataType === "boolean" || (dataType === "text" && role === "dimension")) {
    const counts = new Map<string, number>();
    for (const v of nonEmpty) {
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    profile.categories = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
  }

  if (dataType === "date") {
    const times = nonEmpty
      .map((v) => Date.parse(String(v)))
      .filter((t) => !Number.isNaN(t));
    if (times.length) {
      profile.dateRange = {
        min: new Date(Math.min(...times)).toISOString(),
        max: new Date(Math.max(...times)).toISOString(),
      };
    }
  }

  return profile;
}

export function summarizeSheet(headers: string[], rows: Record<string, CellValue>[]): DataSummary {
  const columns = headers.map((h, i) => profileColumn(h, i, rows));

  const missingCellCount = columns.reduce((acc, c) => acc + c.missingCount, 0);

  const rowKeys = rows.map((r) => headers.map((h) => String(r[h] ?? "")).join("␟"));
  const seen = new Set<string>();
  let duplicateRowCount = 0;
  for (const key of rowKeys) {
    if (seen.has(key)) duplicateRowCount++;
    else seen.add(key);
  }

  return {
    rowCount: rows.length,
    columnCount: headers.length,
    columns,
    missingCellCount,
    duplicateRowCount,
    dimensions: columns.filter((c) => c.role === "dimension").map((c) => c.name),
    measures: columns.filter((c) => c.role === "measure").map((c) => c.name),
    timeSeriesColumns: columns.filter((c) => c.role === "time").map((c) => c.name),
    geoColumns: columns.filter((c) => c.role === "geo").map((c) => c.name),
    currencyColumns: columns.filter((c) => c.isCurrency).map((c) => c.name),
  };
}

export function getNumericValue(value: CellValue): number | null {
  return parseNumeric(value);
}
