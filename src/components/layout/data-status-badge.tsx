"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { validateSheet } from "@/lib/data/validate";
import { InspectRowsDialog } from "@/components/validation/inspect-rows-dialog";
import { cn } from "@/lib/utils";

export function DataStatusBadge() {
  const dataset = useDashboardStore((s) => s.dataset);
  const activeSheetId = useDashboardStore((s) => s.activeSheetId);
  const [inspecting, setInspecting] = useState<{ title: string; rowIndices: number[]; column?: string } | null>(null);
  const sheet = dataset?.sheets.find((s) => s.id === activeSheetId) ?? dataset?.sheets[0];

  const report = useMemo(() => (sheet ? validateSheet(sheet.headers, sheet.rows, sheet.summary) : null), [sheet]);

  if (!sheet || !report) return null;
  const ok = report.status === "ok";

  return (
    <>
      <Popover>
        <PopoverTrigger
          render={
            <button
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium",
                ok ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
              )}
            />
          }
        >
          {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          <span className="hidden sm:inline">{ok ? "Data OK" : `${report.issues.length} issue${report.issues.length === 1 ? "" : "s"}`}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-2 p-3">
          <p className="text-xs font-semibold">{ok ? "No data-quality issues found" : "Data-quality issues"}</p>
          {ok ? (
            <p className="text-xs text-muted-foreground">
              No mixed-type columns, duplicate rows, or columns with excessive missing data in &ldquo;{sheet.name}&rdquo;.
            </p>
          ) : (
            <div className="space-y-2">
              {report.issues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/5 px-2 py-1.5">
                  <p className="text-[11px] text-foreground">{issue.message}</p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 shrink-0"
                    onClick={() => setInspecting({ title: issue.message, rowIndices: issue.affectedRowIndices, column: issue.column })}
                  >
                    <Search className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

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
    </>
  );
}
