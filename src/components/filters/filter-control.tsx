"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { distinctValues } from "@/lib/data/aggregate";
import { formatValue } from "@/lib/data/aggregate";
import type { FilterDef, RawRow } from "@/types/dashboard";

export function FilterControl({
  filter,
  rows,
  onChange,
}: {
  filter: FilterDef;
  rows: RawRow[];
  onChange: (value: FilterDef["value"]) => void;
}) {
  const [search, setSearch] = useState("");
  const options = useMemo(() => distinctValues(rows, filter.column), [rows, filter.column]);
  const filteredOptions = useMemo(
    () => options.filter((o) => String(o).toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  switch (filter.kind) {
    case "search":
      return (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.value.search ?? ""}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Contains…"
            className="h-7 pl-6 text-xs"
          />
        </div>
      );

    case "dateRange":
      return (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={filter.value.dateRange?.[0]?.slice(0, 10) ?? ""}
            onChange={(e) => onChange({ dateRange: [e.target.value || null, filter.value.dateRange?.[1] ?? null] })}
            className="h-7 text-xs"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            value={filter.value.dateRange?.[1]?.slice(0, 10) ?? ""}
            onChange={(e) => onChange({ dateRange: [filter.value.dateRange?.[0] ?? null, e.target.value || null] })}
            className="h-7 text-xs"
          />
        </div>
      );

    case "numericRange": {
      const min = filter.value.boundsMin ?? 0;
      const max = filter.value.boundsMax ?? 100;
      const value = filter.value.numericRange ?? [min, max];
      return (
        <div className="space-y-2 px-1">
          <Slider
            min={min}
            max={max}
            step={(max - min) / 100 || 1}
            value={value}
            onValueChange={(v) => {
              const arr = Array.isArray(v) ? v : [v, v];
              onChange({ numericRange: [arr[0], arr[1] ?? arr[0]] });
            }}
          />
          <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{formatValue(value[0])}</span>
            <span>{formatValue(value[1])}</span>
          </div>
        </div>
      );
    }

    case "dropdown":
      return (
        <Select
          value={String(filter.value.selected?.[0] ?? "")}
          onValueChange={(v) => onChange({ selected: v ? [v] : [] })}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={String(o)} value={String(o)} className="text-xs">
                {String(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "checkbox":
    case "multiSelect":
    default: {
      const selected = new Set((filter.value.selected ?? []).map(String));
      return (
        <div className="space-y-1.5">
          {options.length > 6 && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search options…" className="h-7 pl-6 text-xs" />
            </div>
          )}
          <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
            {filteredOptions.slice(0, 100).map((opt) => {
              const key = String(opt);
              const checked = selected.has(key);
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent/50">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = new Set(selected);
                      if (c) next.add(key);
                      else next.delete(key);
                      onChange({ selected: [...next] });
                    }}
                  />
                  <span className="truncate">{key}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }
  }
}
