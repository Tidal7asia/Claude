"use client";

import { useMemo, useState } from "react";
import { type SortingState, flexRender } from "@tanstack/react-table";
import {
  type LegacyColumnDef as ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable as useReactTable,
} from "@tanstack/react-table/legacy";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { downloadCSV, downloadExcel } from "@/lib/export/export";
import { getNumericValue } from "@/lib/data/detect";
import { formatValue } from "@/lib/data/aggregate";
import type { RawRow } from "@/types/dashboard";
import type { DataSummary } from "@/types/data";
import { cn } from "@/lib/utils";

export function DataTable({ rows, summary, compact = false }: { rows: RawRow[]; summary: DataSummary; compact?: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const numericBounds = useMemo(() => {
    const bounds: Record<string, [number, number]> = {};
    for (const col of summary.columns) {
      if (col.role !== "measure") continue;
      const values = rows.map((r) => getNumericValue(r[col.name])).filter((n): n is number => n !== null);
      if (values.length) bounds[col.name] = [Math.min(...values), Math.max(...values)];
    }
    return bounds;
  }, [rows, summary.columns]);

  const columns = useMemo<ColumnDef<RawRow>[]>(
    () =>
      summary.columns.map((col, idx) => ({
        accessorKey: col.name,
        header: col.name,
        size: idx === 0 ? 180 : 140,
        cell: (info) => {
          const value = info.getValue();
          const isMeasure = col.role === "measure";
          const num = isMeasure ? getNumericValue(value as never) : null;
          let bg: string | undefined;
          if (isMeasure && num !== null && numericBounds[col.name]) {
            const [min, max] = numericBounds[col.name];
            const t = max > min ? (num - min) / (max - min) : 0;
            bg = `color-mix(in oklch, var(--primary) ${Math.round(t * 22)}%, transparent)`;
          }
          const display =
            value === null || value === undefined || value === ""
              ? "—"
              : isMeasure && num !== null
                ? formatValue(num, col.isCurrency ? "currency" : col.dataType === "percentage" ? "percentage" : "number", col.currencySymbol)
                : String(value);
          return (
            <div
              className={cn("truncate rounded px-1.5 py-0.5", isMeasure && "text-right tabular-nums")}
              style={bg ? { background: bg } : undefined}
            >
              {display}
            </div>
          );
        },
      })),
    [summary.columns, numericBounds]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    initialState: { pagination: { pageIndex: 0, pageSize: compact ? 8 : 25 } },
  });

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search records…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        {!compact && (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadCSV(rows, summary.columns.map((c) => c.name), "data-export")}>
              <Download className="size-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadExcel(rows, summary.columns.map((c) => c.name), "data-export")}>
              <Download className="size-3.5" /> Excel
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs" style={{ width: table.getTotalSize() }}>
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header, i) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(
                      "relative select-none border-b border-border p-2 text-left font-medium text-muted-foreground",
                      i === 0 && "sticky left-0 z-20 bg-card"
                    )}
                  >
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-primary/40"
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-accent/40">
                {row.getVisibleCells().map((cell, i) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className={cn("border-b border-border/60 p-1.5", i === 0 && "sticky left-0 z-10 bg-card font-medium")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {table.getFilteredRowModel().rows.length.toLocaleString()} records · Page {table.getState().pagination.pageIndex + 1} of{" "}
          {Math.max(1, table.getPageCount())}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="size-7" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="size-7" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
