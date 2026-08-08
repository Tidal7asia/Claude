"use client";

import { useRef, useState } from "react";
import { RefreshCw, Plus, Minus, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { loadDataset } from "@/lib/data/load-dataset";
import { diffSchemas } from "@/lib/data/schema-diff";
import { validateSheet } from "@/lib/data/validate";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { ACCEPTED_MIME } from "@/lib/data/parse";
import type { Dataset } from "@/types/data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReplaceDatasetFlow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Dataset | null>(null);
  const [busy, setBusy] = useState(false);
  const currentDataset = useDashboardStore((s) => s.dataset);
  const activeSheetId = useDashboardStore((s) => s.activeSheetId);
  const replaceDataset = useDashboardStore((s) => s.replaceDataset);

  const previousSheet = currentDataset?.sheets.find((s) => s.id === activeSheetId) ?? currentDataset?.sheets[0];
  const nextSheet = pending ? pending.sheets.find((s) => s.id === pending.activeSheetId) ?? pending.sheets[0] : null;
  const diff = previousSheet && nextSheet ? diffSchemas(previousSheet, nextSheet) : null;
  const validation = nextSheet ? validateSheet(nextSheet.headers, nextSheet.rows, nextSheet.summary) : null;

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const parsed = await loadDataset(file);
      setPending(parsed);
    } catch (err) {
      toast.error("Couldn't read that file", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function confirmReplace() {
    if (!pending) return;
    const { removedFilters } = replaceDataset(pending);
    toast.success("Dataset updated", {
      description: diff?.structurallyIdentical
        ? "Structure matched the previous version — your layout, charts, and filters were kept."
        : "Structure changed — your layout and charts were kept, see below for what's different.",
    });
    if (removedFilters.length) {
      toast.warning(`${removedFilters.length} filter${removedFilters.length === 1 ? "" : "s"} removed`, {
        description: `"${removedFilters.map((f) => f.label).join('", "')}" referenced column(s) that no longer exist in the new file.`,
      });
    }
    setPending(null);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={Object.values(ACCEPTED_MIME).flat().join(",")}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => inputRef.current?.click()} disabled={busy}>
        <RefreshCw className={cn("size-3.5", busy && "animate-spin")} /> Replace Dataset
      </Button>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Replace dataset with &ldquo;{pending?.fileName}&rdquo;?</DialogTitle>
            <DialogDescription>
              Your dashboard layout, charts, and filters are kept — only the underlying data changes.
            </DialogDescription>
          </DialogHeader>

          {diff && (
            <div className="space-y-3">
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-3 text-xs",
                  diff.structurallyIdentical ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
                )}
              >
                {diff.structurallyIdentical ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <p>
                  {diff.structurallyIdentical
                    ? "Dataset updated successfully — the column structure matches the previous file."
                    : "Your new spreadsheet differs from the previous structure."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-[10px] uppercase text-muted-foreground">Rows</p>
                  <p className="font-medium tabular-nums">
                    {diff.rowCountBefore.toLocaleString()} → {diff.rowCountAfter.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-[10px] uppercase text-muted-foreground">Columns</p>
                  <p className="font-medium tabular-nums">
                    {diff.columnCountBefore} → {diff.columnCountAfter}
                  </p>
                </div>
              </div>

              {!diff.structurallyIdentical && (
                <div className="space-y-1.5">
                  {diff.addedColumns.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="secondary" className="gap-1 text-emerald-700 dark:text-emerald-300">
                        <Plus className="size-3" /> Added
                      </Badge>
                      <span className="text-muted-foreground">{diff.addedColumns.join(", ")}</span>
                    </div>
                  )}
                  {diff.removedColumns.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="secondary" className="gap-1 text-red-700 dark:text-red-300">
                        <Minus className="size-3" /> Removed
                      </Badge>
                      <span className="text-muted-foreground">
                        {diff.removedColumns.join(", ")} — charts or filters using these may show no data.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {validation && validation.status === "review" && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠ {validation.issues.length} data-quality issue{validation.issues.length === 1 ? "" : "s"} found in the new
                  file (mixed types, duplicates, or missing data) — you can inspect these afterward in the Data Summary panel.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={confirmReplace}>Replace Dataset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
