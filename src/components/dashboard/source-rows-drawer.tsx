"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DataTable } from "@/components/table/data-table";
import { getNumericValue } from "@/lib/data/detect";
import type { KpiCardData } from "@/lib/charts/kpi";
import type { RawRow } from "@/types/dashboard";
import type { DataSummary } from "@/types/data";

export function SourceRowsDrawer({
  kpi,
  rows,
  summary,
  onOpenChange,
}: {
  kpi: KpiCardData | null;
  rows: RawRow[];
  summary: DataSummary;
  onOpenChange: (open: boolean) => void;
}) {
  const sourceRows = useMemo(() => {
    if (!kpi) return [];
    if (!kpi.sourceColumn) return rows;
    return rows.filter((r) => getNumericValue(r[kpi.sourceColumn!]) !== null || typeof r[kpi.sourceColumn!] === "string");
  }, [kpi, rows]);

  return (
    <Dialog open={!!kpi} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Source rows for &ldquo;{kpi?.label}&rdquo;</DialogTitle>
          <DialogDescription>
            {kpi?.sourceColumn
              ? `Every currently-filtered row with a value in "${kpi.sourceColumn}" — this is exactly what ${kpi.label.toLowerCase()} was calculated from.`
              : "Every row matching the current filters."}{" "}
            {sourceRows.length.toLocaleString()} row{sourceRows.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[60vh]">{kpi && <DataTable rows={sourceRows} summary={summary} />}</div>
      </DialogContent>
    </Dialog>
  );
}
