"use client";

import { useMemo, useState } from "react";
import { generateKPIs, type KpiCardData } from "@/lib/charts/kpi";
import { KpiCard } from "./kpi-card";
import { SourceRowsDrawer } from "./source-rows-drawer";
import type { DataSummary } from "@/types/data";
import type { RawRow } from "@/types/dashboard";

export function KpiRow({ rows, summary, timeColumn }: { rows: RawRow[]; summary: DataSummary; timeColumn?: string }) {
  const kpis = useMemo(() => generateKPIs(rows, summary, timeColumn), [rows, summary, timeColumn]);
  const [sourceKpi, setSourceKpi] = useState<KpiCardData | null>(null);
  if (!kpis.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.id} kpi={kpi} index={i} onViewSource={() => setSourceKpi(kpi)} />
        ))}
      </div>
      <SourceRowsDrawer kpi={sourceKpi} rows={rows} summary={summary} onOpenChange={(open) => !open && setSourceKpi(null)} />
    </>
  );
}
