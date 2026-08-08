import type { CellValue, ColumnDataType, ColumnRole } from "./data";

export type ChartType =
  | "bar"
  | "column"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "stackedBar"
  | "treemap"
  | "heatmap"
  | "scatter"
  | "bubble"
  | "histogram"
  | "boxplot"
  | "radar"
  | "waterfall"
  | "funnel"
  | "gauge"
  | "calendarHeatmap"
  | "geoMap"
  | "timeline"
  | "pivot"
  | "table"
  | "kpi";

export type AggregationType = "sum" | "avg" | "count" | "min" | "max" | "median" | "distinct";

export interface ChartEncoding {
  dimension?: string; // x-axis / category field
  secondaryDimension?: string; // for stacking / grouping / bubble series
  measure?: string; // y-axis / value field
  secondaryMeasure?: string; // for scatter/bubble y or bubble size
  aggregation: AggregationType;
  sort?: "asc" | "desc" | "none";
  limit?: number;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  encoding: ChartEncoding;
  colorScheme: string;
  showLegend: boolean;
  showLabels: boolean;
  showGrid: boolean;
  sheetId: string;
}

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  chart: ChartConfig;
  layout: GridPosition;
}

export interface DashboardTab {
  id: string;
  name: string;
  widgets: DashboardWidget[];
}

export type FilterKind = "dateRange" | "dropdown" | "multiSelect" | "search" | "numericRange" | "checkbox";

export interface FilterDef {
  id: string;
  column: string;
  kind: FilterKind;
  label: string;
  // current values
  value: {
    dateRange?: [string | null, string | null];
    selected?: (string | number | boolean)[];
    search?: string;
    numericRange?: [number, number];
    boundsMin?: number;
    boundsMax?: number;
  };
}

export interface CalculatedField {
  id: string;
  name: string;
  expression: string; // simple expression referencing column names
  resultType: "number" | "text" | "boolean";
}

export interface SavedDashboard {
  id: string;
  name: string;
  datasetFileName: string;
  createdAt: string;
  updatedAt: string;
  tabs: DashboardTab[];
  filters: FilterDef[];
  calculatedFields: CalculatedField[];
}

export type RawRow = Record<string, CellValue>;

/** Manual correction of an auto-detected column's type/role — the "ask, don't guess silently" escape
 * hatch for columns the detection engine got wrong or was uncertain about. */
export interface ColumnOverride {
  dataType?: ColumnDataType;
  role?: ColumnRole;
}

export interface SchemaDiff {
  structurallyIdentical: boolean;
  addedColumns: string[];
  removedColumns: string[];
  rowCountBefore: number;
  rowCountAfter: number;
  columnCountBefore: number;
  columnCountAfter: number;
}

export interface DatasetVersionEntry {
  id: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  columnCount: number;
  diffFromPrevious: SchemaDiff | null;
}
