"use client";

import { History, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboardStore } from "@/lib/store/dashboard-store";

export function VersionHistoryPanel() {
  const versions = useDashboardStore((s) => s.datasetVersions);

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" />}>
        <History className="size-3.5" /> Version History
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-semibold">Dataset uploads</p>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {[...versions].reverse().map((v, i) => {
            const diff = v.diffFromPrevious;
            return (
              <div key={v.id} className="space-y-1.5 rounded-lg px-2 py-2 text-xs hover:bg-accent/40">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium">{v.fileName}</p>
                  {i === 0 && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(v.uploadedAt).toLocaleString()}</p>
                <div className="flex gap-3 tabular-nums text-muted-foreground">
                  <span>
                    {diff ? `${diff.rowCountBefore.toLocaleString()} → ` : ""}
                    {v.rowCount.toLocaleString()} rows
                  </span>
                  <span>
                    {diff ? `${diff.columnCountBefore} → ` : ""}
                    {v.columnCount} cols
                  </span>
                </div>
                {diff && !diff.structurallyIdentical && (
                  <div className="space-y-0.5">
                    {diff.addedColumns.length > 0 && (
                      <p className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <Plus className="size-3" /> {diff.addedColumns.join(", ")}
                      </p>
                    )}
                    {diff.removedColumns.length > 0 && (
                      <p className="flex items-center gap-1 text-red-700 dark:text-red-300">
                        <Minus className="size-3" /> {diff.removedColumns.join(", ")}
                      </p>
                    )}
                  </div>
                )}
                {diff?.structurallyIdentical && <p className="text-muted-foreground">No structural changes</p>}
              </div>
            );
          })}
          {!versions.length && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No uploads yet.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
