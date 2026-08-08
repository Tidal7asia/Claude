"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { GripVertical, MoreHorizontal, Copy, Trash2, Pencil, Download, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { exportNodeToPNG } from "@/lib/export/export";
import { CHART_TYPE_LABELS } from "@/lib/charts/recommend";
import type { ChartConfig, RawRow } from "@/types/dashboard";
import type { DataSummary } from "@/types/data";
import { cn } from "@/lib/utils";

export function WidgetCard({ chart, rows, summary }: { chart: ChartConfig; rows: RawRow[]; summary: DataSummary }) {
  const selectedWidgetId = useDashboardStore((s) => s.selectedWidgetId);
  const setSelectedWidget = useDashboardStore((s) => s.setSelectedWidget);
  const duplicateChart = useDashboardStore((s) => s.duplicateChart);
  const removeChart = useDashboardStore((s) => s.removeChart);
  const renameChart = useDashboardStore((s) => s.renameChart);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chart.title);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedWidgetId === chart.id;

  function commitRename() {
    setRenaming(false);
    if (titleDraft.trim()) renameChart(chart.id, titleDraft.trim());
    else setTitleDraft(chart.title);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      ref={nodeRef}
      onClick={() => setSelectedWidget(chart.id)}
      className={cn(
        "glass card-shadow flex h-full flex-col rounded-2xl p-3 transition-shadow",
        isSelected && "ring-2 ring-primary/60"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="drag-handle flex min-w-0 flex-1 cursor-grab items-center gap-1.5 active:cursor-grabbing">
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50" />
          {renaming ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === "Enter" && commitRename()}
              onClick={(e) => e.stopPropagation()}
              className="h-6 px-1.5 text-xs"
            />
          ) : (
            <p className="truncate text-xs font-semibold">{chart.title}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="hidden rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground sm:inline-block">
            {CHART_TYPE_LABELS[chart.type]}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" />}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setSelectedWidget(chart.id)}>
                <Settings2 /> Edit settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicateChart(chart.id)}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => nodeRef.current && exportNodeToPNG(nodeRef.current, chart.title)}>
                <Download /> Export as PNG
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => removeChart(chart.id)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ChartRenderer chart={chart} rows={rows} summary={summary} />
      </div>
    </motion.div>
  );
}
