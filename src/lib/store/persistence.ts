import type { SavedDashboard } from "@/types/dashboard";
import { useDashboardStore } from "./dashboard-store";

const STORAGE_KEY = "lens:saved-dashboards";

export function listSavedDashboards(): SavedDashboard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedDashboard[]) : [];
  } catch {
    return [];
  }
}

function persist(dashboards: SavedDashboard[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
}

export function saveCurrentDashboard(name: string): SavedDashboard {
  const state = useDashboardStore.getState();
  const now = new Date().toISOString();
  const dashboard: SavedDashboard = {
    id: `dash-${Date.now()}`,
    name,
    datasetFileName: state.dataset?.fileName ?? "Untitled dataset",
    createdAt: now,
    updatedAt: now,
    tabs: state.tabs,
    filters: state.filters,
    calculatedFields: state.calculatedFields,
  };
  const existing = listSavedDashboards();
  persist([dashboard, ...existing]);
  return dashboard;
}

export function deleteSavedDashboard(id: string) {
  persist(listSavedDashboards().filter((d) => d.id !== id));
}

export function loadSavedDashboard(dashboard: SavedDashboard) {
  useDashboardStore.setState({
    tabs: dashboard.tabs,
    activeTabId: dashboard.tabs[0]?.id ?? null,
    filters: dashboard.filters,
    calculatedFields: dashboard.calculatedFields,
    selectedWidgetId: null,
  });
}
