"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, LayoutDashboard, RotateCcw, X } from "lucide-react";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { TopNav } from "@/components/layout/top-nav";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { AssistantPanel } from "@/components/ai/assistant-panel";
import { DashboardTabs } from "./dashboard-tabs";
import { KpiRow } from "./kpi-row";
import { DataSummaryPanel } from "./data-summary-panel";
import { InsightsPanel } from "./insights-panel";
import { DashboardCanvas } from "./dashboard-canvas";
import { applyFilters } from "@/lib/data/aggregate";
import { applyCalculatedFields, extendSummaryWithCalculatedFields } from "@/lib/data/calculated-fields";
import { applyColumnOverrides } from "@/lib/data/apply-overrides";
import { Button } from "@/components/ui/button";

export function DashboardView() {
  const dataset = useDashboardStore((s) => s.dataset);
  const activeSheetId = useDashboardStore((s) => s.activeSheetId);
  const filters = useDashboardStore((s) => s.filters);
  const calculatedFields = useDashboardStore((s) => s.calculatedFields);
  const columnOverrides = useDashboardStore((s) => s.columnOverrides);
  const clearFilters = useDashboardStore((s) => s.clearFilters);
  const resetDashboardLayout = useDashboardStore((s) => s.resetDashboardLayout);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showSummary, setShowSummary] = useState(true);

  const sheet = dataset?.sheets.find((s) => s.id === activeSheetId) ?? dataset?.sheets[0];

  const overriddenSummary = useMemo(() => {
    if (!sheet) return null;
    return applyColumnOverrides(sheet.summary, columnOverrides);
  }, [sheet, columnOverrides]);

  const effectiveSummary = useMemo(() => {
    if (!overriddenSummary) return null;
    return extendSummaryWithCalculatedFields(overriddenSummary, calculatedFields);
  }, [overriddenSummary, calculatedFields]);

  const enrichedRows = useMemo(() => {
    if (!sheet) return [];
    return applyCalculatedFields(sheet.rows, calculatedFields);
  }, [sheet, calculatedFields]);

  const filteredRows = useMemo(() => applyFilters(enrichedRows, filters), [enrichedRows, filters]);

  if (!dataset || !sheet || !effectiveSummary || !overriddenSummary) return null;

  const isFiltered = filters.length > 0 && filteredRows.length !== enrichedRows.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav canvasRef={canvasRef} />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar rows={filteredRows} summary={effectiveSummary} rawSummary={overriddenSummary} />

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6" ref={canvasRef}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <DashboardTabs />
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setShowSummary((v) => !v)}>
                <LayoutDashboard className="size-3.5" />
                Data Summary
                <ChevronDown className={`size-3 transition-transform ${showSummary ? "rotate-180" : ""}`} />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <span>
                Showing <span className="font-medium tabular-nums text-foreground">{filteredRows.length.toLocaleString()}</span> of{" "}
                <span className="font-medium tabular-nums text-foreground">{enrichedRows.length.toLocaleString()}</span> records
                {isFiltered && " (filtered)"}
              </span>
              <div className="flex items-center gap-3">
                {filters.length > 0 && (
                  <button onClick={clearFilters} className="flex items-center gap-1 hover:text-foreground">
                    <X className="size-3" /> Clear Filters
                  </button>
                )}
                <button onClick={resetDashboardLayout} className="flex items-center gap-1 hover:text-foreground">
                  <RotateCcw className="size-3" /> Reset Dashboard
                </button>
              </div>
            </div>

            {showSummary && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <InsightsPanel rows={filteredRows} summary={effectiveSummary} />
                </div>
                <DataSummaryPanel summary={effectiveSummary} />
              </motion.div>
            )}

            <KpiRow rows={filteredRows} summary={effectiveSummary} timeColumn={effectiveSummary.timeSeriesColumns[0]} />

            <DashboardCanvas rows={filteredRows} summary={effectiveSummary} />
          </div>
        </main>

        <RightSidebar summary={effectiveSummary} />
      </div>

      <AssistantPanel rows={filteredRows} summary={effectiveSummary} sheetId={sheet.id} />
    </div>
  );
}
