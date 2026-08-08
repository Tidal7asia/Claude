"use client";

import { useMemo, useCallback } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useDashboardStore, GRID_COLS } from "@/lib/store/dashboard-store";
import { WidgetCard } from "./widget-card";
import type { RawRow } from "@/types/dashboard";
import type { DataSummary } from "@/types/data";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function DashboardCanvas({ rows, summary }: { rows: RawRow[]; summary: DataSummary }) {
  const tabs = useDashboardStore((s) => s.tabs);
  const activeTabId = useDashboardStore((s) => s.activeTabId);
  const updateLayout = useDashboardStore((s) => s.updateLayout);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const layout = useMemo<Layout[]>(
    () =>
      (activeTab?.widgets ?? []).map((w) => ({
        i: w.chart.id,
        x: w.layout.x,
        y: w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
        minW: 3,
        minH: 4,
      })),
    [activeTab]
  );

  const handleLayoutChange = useCallback(
    (next: Layout[]) => {
      for (const item of next) {
        updateLayout(item.i, { x: item.x, y: item.y, w: item.w, h: item.h });
      }
    },
    [updateLayout]
  );

  if (!activeTab || activeTab.widgets.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        No charts on this tab yet. Add one from the left sidebar or ask the AI assistant.
      </div>
    );
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 1024, md: 768, sm: 480, xs: 0 }}
      cols={{ lg: GRID_COLS, md: GRID_COLS, sm: 6, xs: 2 }}
      rowHeight={28}
      margin={[12, 12]}
      draggableHandle=".drag-handle"
      onLayoutChange={handleLayoutChange}
      compactType="vertical"
      isBounded
    >
      {activeTab.widgets.map((w) => (
        <div key={w.chart.id}>
          <WidgetCard chart={w.chart} rows={rows} summary={summary} />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
