// Core data-layer types shared across parsing, detection, charts and store.

export type ColumnDataType =
  | "text"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "category"
  | "boolean";

export type ColumnRole = "dimension" | "measure" | "time" | "geo" | "identifier";

export interface ColumnProfile {
  name: string;
  index: number;
  dataType: ColumnDataType;
  role: ColumnRole;
  isCurrency: boolean;
  currencySymbol?: string;
  isGeo: boolean;
  isTimeSeries: boolean;
  missingCount: number;
  missingPct: number;
  distinctCount: number;
  duplicateValueCount: number;
  sampleValues: unknown[];
  // numeric stats (measures only)
  stats?: {
    sum: number;
    avg: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  };
  // category stats (dimensions only)
  categories?: { value: string; count: number }[];
  dateRange?: { min: string; max: string };
}

export interface DataSummary {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  missingCellCount: number;
  duplicateRowCount: number;
  dimensions: string[];
  measures: string[];
  timeSeriesColumns: string[];
  geoColumns: string[];
  currencyColumns: string[];
}

export type CellValue = string | number | boolean | null;

export interface SheetData {
  id: string;
  name: string;
  headers: string[];
  rows: Record<string, CellValue>[];
  summary: DataSummary;
}

export interface Dataset {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: "xlsx" | "xls" | "csv";
  uploadedAt: string;
  sheets: SheetData[];
  activeSheetId: string;
}

// Validation — surfaced before a dashboard is generated, so accuracy issues are visible up front
// rather than silently "cleaned up".

export type ValidationIssueKind = "mixed-type" | "duplicate-rows" | "high-missing";

export interface ValidationIssue {
  id: string;
  kind: ValidationIssueKind;
  column?: string;
  message: string;
  /** 0-based indices into the sheet's rows array, for "inspect affected rows". */
  affectedRowIndices: number[];
}

export interface ValidationReport {
  status: "ok" | "review";
  issues: ValidationIssue[];
}
