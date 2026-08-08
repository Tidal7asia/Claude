"use client";

import { motion } from "framer-motion";
import { Hash, Calendar, Percent, DollarSign, Tags, ToggleLeft, Type, MapPin, AlertTriangle, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DataSummary, ColumnDataType } from "@/types/data";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<ColumnDataType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  currency: DollarSign,
  percentage: Percent,
  date: Calendar,
  category: Tags,
  boolean: ToggleLeft,
};

const TYPE_COLOR: Record<ColumnDataType, string> = {
  text: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  number: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  currency: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  percentage: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  date: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  category: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  boolean: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
};

export function DataSummaryPanel({ summary }: { summary: DataSummary }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass card-shadow rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Data Summary</h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{summary.rowCount.toLocaleString()} rows</span>
          <span>{summary.columnCount} columns</span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryStat label="Dimensions" value={summary.dimensions.length} />
        <SummaryStat label="Measures" value={summary.measures.length} />
        <SummaryStat label="Time Fields" value={summary.timeSeriesColumns.length} />
        <SummaryStat label="Geo Fields" value={summary.geoColumns.length} />
      </div>

      {(summary.missingCellCount > 0 || summary.duplicateRowCount > 0) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {summary.missingCellCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-3.5" />
              {summary.missingCellCount.toLocaleString()} missing values
            </div>
          )}
          {summary.duplicateRowCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1.5 text-xs text-orange-700 dark:text-orange-300">
              <Copy className="size-3.5" />
              {summary.duplicateRowCount.toLocaleString()} duplicate rows
            </div>
          )}
        </div>
      )}

      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {summary.columns.map((col) => {
          const Icon = col.isGeo ? MapPin : TYPE_ICON[col.dataType];
          return (
            <div key={col.name} className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-accent/40">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", TYPE_COLOR[col.dataType])}>
                  <Icon className="size-3" />
                </span>
                <span className="truncate font-medium">{col.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal capitalize">
                  {col.role}
                </Badge>
                {col.missingPct > 0 && <span className="text-[10px] text-muted-foreground">{(col.missingPct * 100).toFixed(0)}% empty</span>}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
