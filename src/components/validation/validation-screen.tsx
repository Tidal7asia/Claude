"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Hash,
  Calendar,
  Percent,
  DollarSign,
  Tags,
  ToggleLeft,
  Type,
  MapPin,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateSheet } from "@/lib/data/validate";
import { formatFileSize } from "@/lib/data/load-dataset";
import { InspectRowsDialog } from "./inspect-rows-dialog";
import type { Dataset, ColumnDataType } from "@/types/data";
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

export function ValidationScreen({
  dataset,
  onContinue,
  onCancel,
}: {
  dataset: Dataset;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const [activeSheetId, setActiveSheetId] = useState(dataset.activeSheetId);
  const sheet = dataset.sheets.find((s) => s.id === activeSheetId) ?? dataset.sheets[0];
  const [inspecting, setInspecting] = useState<{ title: string; rowIndices: number[]; column?: string } | null>(null);

  const report = useMemo(() => validateSheet(sheet.headers, sheet.rows, sheet.summary), [sheet]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="mb-6 flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Review before building the dashboard</h1>
            <p className="text-sm text-muted-foreground">
              We inspect your file before visualizing anything — nothing is changed, renamed, or cleaned automatically.
            </p>
          </div>
        </div>

        {/* File & sheet facts */}
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
          <Fact label="File name" value={dataset.fileName} />
          <Fact label="File size" value={formatFileSize(dataset.fileSize)} />
          <Fact label="Rows" value={sheet.summary.rowCount.toLocaleString()} />
          <Fact label="Columns" value={String(sheet.summary.columnCount)} />
        </div>

        {dataset.sheets.length > 1 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Sheet:</span>
            <Select value={activeSheetId} onValueChange={(v) => v && setActiveSheetId(v)}>
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dataset.sheets.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name} ({s.rows.length.toLocaleString()} rows)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status banner */}
        <div
          className={cn(
            "mb-6 flex items-start gap-3 rounded-xl border p-4",
            report.status === "ok"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          )}
        >
          {report.status === "ok" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className={cn("text-sm font-semibold", report.status === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
              {report.status === "ok" ? "Data successfully loaded" : `Review required — ${report.issues.length} issue${report.issues.length === 1 ? "" : "s"} found`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {report.status === "ok"
                ? "No mixed-type columns, no duplicate rows, no columns with excessive missing data."
                : "Nothing has been changed automatically. Inspect the rows below, then continue if the data is as expected."}
            </p>
          </div>
        </div>

        {/* Issues */}
        {report.issues.length > 0 && (
          <div className="mb-6 space-y-2">
            {report.issues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <p className="text-xs text-foreground">{issue.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 gap-1 text-xs"
                  onClick={() =>
                    setInspecting({
                      title: issue.message,
                      rowIndices: issue.affectedRowIndices,
                      column: issue.column,
                    })
                  }
                >
                  <Search className="size-3" /> Inspect {issue.affectedRowIndices.length > 50 ? "rows" : `${issue.affectedRowIndices.length} row${issue.affectedRowIndices.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Detected columns */}
        <div className="mb-6 overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Detected columns ({sheet.headers.length})
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Header (exact)</th>
                  <th className="px-4 py-2 font-medium">Detected type</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Missing</th>
                  <th className="px-4 py-2 font-medium">Range</th>
                </tr>
              </thead>
              <tbody>
                {sheet.summary.columns.map((col) => {
                  const Icon = TYPE_ICON[col.dataType];
                  const range = col.dateRange
                    ? `${new Date(col.dateRange.min).toLocaleDateString()} – ${new Date(col.dateRange.max).toLocaleDateString()}`
                    : col.stats
                      ? `${col.stats.min.toLocaleString()} – ${col.stats.max.toLocaleString()}`
                      : "—";
                  return (
                    <tr key={col.name} className="border-t border-border/60">
                      <td className="px-4 py-2 font-medium">{col.name}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5 capitalize text-muted-foreground">
                          <Icon className="size-3.5" /> {col.dataType}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary" className="text-[10px] font-normal capitalize">
                          {col.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {col.missingCount > 0 ? `${col.missingCount} (${(col.missingPct * 100).toFixed(0)}%)` : "0"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{range}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {sheet.summary.geoColumns.length > 0 && (
          <p className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> Geographic field(s) detected: {sheet.summary.geoColumns.join(", ")}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onCancel}>
            <ArrowLeft className="size-3.5" /> Choose a different file
          </Button>
          <Button onClick={onContinue} className="gap-1.5">
            Continue to Dashboard <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </motion.div>

      {inspecting && (
        <InspectRowsDialog
          open
          onOpenChange={(open) => !open && setInspecting(null)}
          sheet={sheet}
          rowIndices={inspecting.rowIndices}
          highlightColumn={inspecting.column}
          title={inspecting.title}
        />
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}
