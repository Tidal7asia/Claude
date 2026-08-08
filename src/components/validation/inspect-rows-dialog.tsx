"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { SheetData } from "@/types/data";
import { cn } from "@/lib/utils";

export function InspectRowsDialog({
  open,
  onOpenChange,
  sheet,
  rowIndices,
  highlightColumn,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: SheetData;
  rowIndices: number[];
  highlightColumn?: string;
  title: string;
}) {
  const rows = rowIndices.map((i) => ({ index: i, row: sheet.rows[i] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Showing the exact row(s) from &ldquo;{sheet.name}&rdquo; as uploaded — nothing here has been modified.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className="border-b border-border p-2 text-left font-medium text-muted-foreground">Row #</th>
                {sheet.headers.map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "whitespace-nowrap border-b border-border p-2 text-left font-medium text-muted-foreground",
                      h === highlightColumn && "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ index, row }) => (
                <tr key={index} className="hover:bg-accent/40">
                  <td className="border-b border-border/60 p-2 font-medium tabular-nums text-muted-foreground">{index + 1}</td>
                  {sheet.headers.map((h) => (
                    <td
                      key={h}
                      className={cn(
                        "whitespace-nowrap border-b border-border/60 p-2 tabular-nums",
                        h === highlightColumn && "bg-amber-500/5 font-medium"
                      )}
                    >
                      {row[h] === null || row[h] === undefined || row[h] === "" ? (
                        <span className="text-muted-foreground">empty</span>
                      ) : (
                        String(row[h])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
