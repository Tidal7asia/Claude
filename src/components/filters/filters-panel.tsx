"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Filter as FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { numericBounds } from "@/lib/data/aggregate";
import type { DataSummary } from "@/types/data";
import type { FilterDef, FilterKind, RawRow } from "@/types/dashboard";
import { FilterControl } from "./filter-control";
import { generateId } from "@/lib/utils/id";

function inferKind(dataType: DataSummary["columns"][number]["dataType"]): FilterKind {
  if (dataType === "date") return "dateRange";
  if (dataType === "number" || dataType === "currency" || dataType === "percentage") return "numericRange";
  if (dataType === "boolean") return "checkbox";
  return "multiSelect";
}

export function FiltersPanel({ rows, summary }: { rows: RawRow[]; summary: DataSummary }) {
  const filters = useDashboardStore((s) => s.filters);
  const addFilter = useDashboardStore((s) => s.addFilter);
  const updateFilter = useDashboardStore((s) => s.updateFilter);
  const removeFilter = useDashboardStore((s) => s.removeFilter);
  const clearFilters = useDashboardStore((s) => s.clearFilters);
  const [open, setOpen] = useState(false);

  const availableColumns = summary.columns.filter((c) => !filters.some((f) => f.column === c.name));

  function handleAdd(columnName: string) {
    const col = summary.columns.find((c) => c.name === columnName);
    if (!col) return;
    const kind = inferKind(col.dataType);
    const filter: FilterDef = {
      id: generateId("filter"),
      column: columnName,
      kind,
      label: columnName,
      value:
        kind === "numericRange"
          ? { numericRange: numericBounds(rows, columnName), ...boundsFor(rows, columnName) }
          : {},
    };
    addFilter(filter);
    setOpen(false);
  }

  function boundsFor(r: RawRow[], col: string) {
    const [min, max] = numericBounds(r, col);
    return { boundsMin: min, boundsMax: max };
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <FilterIcon className="size-3.5" /> Filters
        </h3>
        <div className="flex items-center gap-1">
          {filters.length > 0 && (
            <button className="text-[11px] text-muted-foreground hover:text-foreground" onClick={clearFilters}>
              Clear
            </button>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<Button size="icon" variant="ghost" className="size-6" />}>
              <Plus className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5">
              <Select<string> onValueChange={(v) => v && handleAdd(v)}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Choose a field…" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((c) => (
                    <SelectItem key={c.name} value={c.name} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {filters.map((filter) => (
          <motion.div
            key={filter.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-border/70 bg-card/40 p-2.5"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="truncate text-xs font-medium">{filter.label}</span>
              <button onClick={() => removeFilter(filter.id)} className="text-muted-foreground hover:text-destructive">
                <X className="size-3.5" />
              </button>
            </div>
            <FilterControl
              filter={filter}
              rows={rows}
              onChange={(value) => updateFilter(filter.id, { value })}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {!filters.length && <p className="rounded-lg border border-dashed border-border px-2.5 py-3 text-center text-[11px] text-muted-foreground">No filters yet — add one to slice your dashboard.</p>}
    </div>
  );
}
