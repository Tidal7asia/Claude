"use client";

import { create } from "zustand";
import type { Dataset, SheetData } from "@/types/data";
import type {
  CalculatedField,
  ChartConfig,
  ColumnOverride,
  DashboardTab,
  DashboardWidget,
  DatasetVersionEntry,
  FilterDef,
  GridPosition,
} from "@/types/dashboard";
import { recommendCharts } from "@/lib/charts/recommend";
import { diffSchemas } from "@/lib/data/schema-diff";
import { generateId } from "@/lib/utils/id";

const COLS = 12;
const DEFAULT_CHART_W = 6;
const DEFAULT_CHART_H = 8;

function autoLayout(charts: ChartConfig[]): DashboardWidget[] {
  let x = 0;
  let y = 0;
  return charts.map((chart) => {
    let w = DEFAULT_CHART_W;
    let h = DEFAULT_CHART_H;
    if (chart.type === "table" || chart.type === "pivot") {
      w = COLS;
      h = 10;
    } else if (chart.type === "gauge") {
      w = 4;
      h = 6;
    }
    if (x + w > COLS) {
      x = 0;
      y += h;
    }
    const layout: GridPosition = { x, y, w, h };
    x += w;
    return { chart, layout };
  });
}

interface DashboardState {
  dataset: Dataset | null;
  activeSheetId: string | null;
  tabs: DashboardTab[];
  activeTabId: string | null;
  filters: FilterDef[];
  calculatedFields: CalculatedField[];
  columnOverrides: Record<string, ColumnOverride>;
  datasetVersions: DatasetVersionEntry[];
  selectedWidgetId: string | null;
  isAssistantOpen: boolean;
  isRightSidebarOpen: boolean;
  isLeftSidebarOpen: boolean;

  setDataset: (dataset: Dataset) => void;
  replaceDataset: (dataset: Dataset) => { version: DatasetVersionEntry; removedFilters: FilterDef[] };
  setActiveSheet: (sheetId: string) => void;
  activeSheet: () => SheetData | null;
  generateDashboard: (sheetId: string) => void;
  resetDashboardLayout: () => void;

  addTab: (name: string) => void;
  removeTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  setActiveTab: (tabId: string) => void;

  addChart: (chart: ChartConfig, layout?: GridPosition) => void;
  updateChart: (chartId: string, patch: Partial<ChartConfig>) => void;
  removeChart: (chartId: string) => void;
  duplicateChart: (chartId: string) => void;
  updateLayout: (chartId: string, layout: GridPosition) => void;
  renameChart: (chartId: string, title: string) => void;
  setSelectedWidget: (chartId: string | null) => void;

  addFilter: (filter: FilterDef) => void;
  updateFilter: (filterId: string, patch: Partial<FilterDef>) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;

  addCalculatedField: (field: CalculatedField) => void;
  removeCalculatedField: (fieldId: string) => void;

  setColumnOverride: (column: string, override: ColumnOverride) => void;
  clearColumnOverride: (column: string) => void;

  toggleAssistant: (open?: boolean) => void;
  toggleRightSidebar: (open?: boolean) => void;
  toggleLeftSidebar: (open?: boolean) => void;
  reset: () => void;
}

function newId(prefix: string) {
  return generateId(prefix);
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dataset: null,
  activeSheetId: null,
  tabs: [],
  activeTabId: null,
  filters: [],
  calculatedFields: [],
  columnOverrides: {},
  datasetVersions: [],
  selectedWidgetId: null,
  isAssistantOpen: false,
  isRightSidebarOpen: true,
  isLeftSidebarOpen: true,

  setDataset: (dataset) => {
    const sheet = dataset.sheets.find((s) => s.id === dataset.activeSheetId) ?? dataset.sheets[0];
    const version: DatasetVersionEntry = {
      id: newId("version"),
      fileName: dataset.fileName,
      uploadedAt: dataset.uploadedAt,
      rowCount: sheet?.rows.length ?? 0,
      columnCount: sheet?.headers.length ?? 0,
      diffFromPrevious: null,
    };
    set({
      dataset,
      activeSheetId: dataset.activeSheetId,
      filters: [],
      calculatedFields: [],
      columnOverrides: {},
      datasetVersions: [version],
    });
    get().generateDashboard(dataset.activeSheetId);
  },

  /** Swaps in a newly-uploaded version of the dataset while preserving the dashboard's tabs, charts,
   * filters, and calculated fields — only the underlying data (and, if columns changed, the set of
   * valid column overrides / filters tied to columns that no longer exist) changes. A filter left
   * pointing at a vanished column would silently match zero rows on every chart — rather than fail
   * that way, such filters are dropped and reported back to the caller to surface to the user.
   * Returns the version entry (including the schema diff) so the caller can show exactly what changed. */
  replaceDataset: (dataset) => {
    const state = get();
    const previousSheet = state.dataset?.sheets.find((s) => s.id === state.activeSheetId) ?? state.dataset?.sheets[0];
    const nextSheet = dataset.sheets.find((s) => s.id === dataset.activeSheetId) ?? dataset.sheets[0];
    const diff = previousSheet && nextSheet ? diffSchemas(previousSheet, nextSheet) : null;

    const version: DatasetVersionEntry = {
      id: newId("version"),
      fileName: dataset.fileName,
      uploadedAt: dataset.uploadedAt,
      rowCount: nextSheet?.rows.length ?? 0,
      columnCount: nextSheet?.headers.length ?? 0,
      diffFromPrevious: diff,
    };

    const validHeaders = new Set(nextSheet?.headers ?? []);
    const prunedOverrides = Object.fromEntries(
      Object.entries(state.columnOverrides).filter(([col]) => validHeaders.has(col))
    );
    const keptFilters = state.filters.filter((f) => validHeaders.has(f.column));
    const removedFilters = state.filters.filter((f) => !validHeaders.has(f.column));

    set({
      dataset,
      activeSheetId: dataset.activeSheetId,
      columnOverrides: prunedOverrides,
      filters: keptFilters,
      datasetVersions: [...state.datasetVersions, version],
    });

    return { version, removedFilters };
  },

  setActiveSheet: (sheetId) => {
    set({ activeSheetId: sheetId, filters: [] });
    get().generateDashboard(sheetId);
  },

  activeSheet: () => {
    const { dataset, activeSheetId } = get();
    if (!dataset) return null;
    return dataset.sheets.find((s) => s.id === activeSheetId) ?? dataset.sheets[0] ?? null;
  },

  generateDashboard: (sheetId) => {
    const dataset = get().dataset;
    const sheet = dataset?.sheets.find((s) => s.id === sheetId);
    if (!sheet) return;
    const charts = recommendCharts(sheet.summary, sheetId);
    const widgets = autoLayout(charts);
    const tab: DashboardTab = { id: newId("tab"), name: "Overview", widgets };
    set({ tabs: [tab], activeTabId: tab.id, selectedWidgetId: null });
  },

  resetDashboardLayout: () => {
    const sheetId = get().activeSheetId;
    if (sheetId) get().generateDashboard(sheetId);
    set({ filters: [] });
  },

  addTab: (name) => {
    const tab: DashboardTab = { id: newId("tab"), name, widgets: [] };
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },
  removeTab: (tabId) => {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== tabId);
      const activeTabId = s.activeTabId === tabId ? tabs[0]?.id ?? null : s.activeTabId;
      return { tabs, activeTabId };
    });
  },
  renameTab: (tabId, name) => {
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)) }));
  },
  setActiveTab: (tabId) => set({ activeTabId: tabId, selectedWidgetId: null }),

  addChart: (chart, layout) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === s.activeTabId
          ? {
              ...t,
              widgets: [
                ...t.widgets,
                { chart, layout: layout ?? { x: 0, y: Infinity, w: DEFAULT_CHART_W, h: DEFAULT_CHART_H } },
              ],
            }
          : t
      ),
      selectedWidgetId: chart.id,
    }));
  },

  updateChart: (chartId, patch) => {
    set((s) => ({
      tabs: s.tabs.map((t) => ({
        ...t,
        widgets: t.widgets.map((w) => (w.chart.id === chartId ? { ...w, chart: { ...w.chart, ...patch } } : w)),
      })),
    }));
  },

  removeChart: (chartId) => {
    set((s) => ({
      tabs: s.tabs.map((t) => ({ ...t, widgets: t.widgets.filter((w) => w.chart.id !== chartId) })),
      selectedWidgetId: s.selectedWidgetId === chartId ? null : s.selectedWidgetId,
    }));
  },

  duplicateChart: (chartId) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        const widget = t.widgets.find((w) => w.chart.id === chartId);
        if (!widget || t.id !== s.activeTabId) return t;
        const newChart: ChartConfig = { ...widget.chart, id: newId("chart"), title: `${widget.chart.title} (Copy)` };
        return {
          ...t,
          widgets: [...t.widgets, { chart: newChart, layout: { ...widget.layout, y: Infinity } }],
        };
      }),
    }));
  },

  updateLayout: (chartId, layout) => {
    set((s) => ({
      tabs: s.tabs.map((t) => ({
        ...t,
        widgets: t.widgets.map((w) => (w.chart.id === chartId ? { ...w, layout } : w)),
      })),
    }));
  },

  renameChart: (chartId, title) => get().updateChart(chartId, { title }),
  setSelectedWidget: (chartId) => set({ selectedWidgetId: chartId }),

  addFilter: (filter) => set((s) => ({ filters: [...s.filters, filter] })),
  updateFilter: (filterId, patch) =>
    set((s) => ({
      filters: s.filters.map((f) => (f.id === filterId ? { ...f, ...patch, value: { ...f.value, ...patch.value } } : f)),
    })),
  removeFilter: (filterId) => set((s) => ({ filters: s.filters.filter((f) => f.id !== filterId) })),
  clearFilters: () => set({ filters: [] }),

  addCalculatedField: (field) => set((s) => ({ calculatedFields: [...s.calculatedFields, field] })),
  removeCalculatedField: (fieldId) =>
    set((s) => ({ calculatedFields: s.calculatedFields.filter((f) => f.id !== fieldId) })),

  setColumnOverride: (column, override) =>
    set((s) => ({ columnOverrides: { ...s.columnOverrides, [column]: { ...s.columnOverrides[column], ...override } } })),
  clearColumnOverride: (column) =>
    set((s) => {
      const next = { ...s.columnOverrides };
      delete next[column];
      return { columnOverrides: next };
    }),

  toggleAssistant: (open) => set((s) => ({ isAssistantOpen: open ?? !s.isAssistantOpen })),
  toggleRightSidebar: (open) => set((s) => ({ isRightSidebarOpen: open ?? !s.isRightSidebarOpen })),
  toggleLeftSidebar: (open) => set((s) => ({ isLeftSidebarOpen: open ?? !s.isLeftSidebarOpen })),

  reset: () =>
    set({
      dataset: null,
      activeSheetId: null,
      tabs: [],
      activeTabId: null,
      filters: [],
      calculatedFields: [],
      columnOverrides: {},
      datasetVersions: [],
      selectedWidgetId: null,
    }),
}));

export const GRID_COLS = COLS;
