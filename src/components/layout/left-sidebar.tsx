"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  FileSpreadsheet,
  Plus,
  BarChart3,
  Sigma,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  BookOpenText,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { FiltersPanel } from "@/components/filters/filters-panel";
import { CHART_TYPE_LABELS } from "@/lib/charts/recommend";
import { validateExpression } from "@/lib/data/calculated-fields";
import { formatFileSize } from "@/lib/data/load-dataset";
import type { ChartConfig, ChartType, RawRow } from "@/types/dashboard";
import type { ColumnDataType, ColumnRole, DataSummary } from "@/types/data";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils/id";

const DATA_TYPES: ColumnDataType[] = ["text", "number", "currency", "percentage", "date", "category", "boolean"];
const ROLES: ColumnRole[] = ["dimension", "measure", "time", "geo", "identifier"];

function SidebarSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 py-3">
      <div className="flex items-center justify-between px-1">
        <button className="flex flex-1 items-center gap-1.5 text-left" onClick={() => setOpen((o) => !o)}>
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
          <ChevronDown className={cn("size-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-1 pt-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LeftSidebar({ rows, summary, rawSummary }: { rows: RawRow[]; summary: DataSummary; rawSummary: DataSummary }) {
  const isOpen = useDashboardStore((s) => s.isLeftSidebarOpen);
  const dataset = useDashboardStore((s) => s.dataset);
  const activeSheetId = useDashboardStore((s) => s.activeSheetId);
  const setActiveSheet = useDashboardStore((s) => s.setActiveSheet);
  const tabs = useDashboardStore((s) => s.tabs);
  const activeTabId = useDashboardStore((s) => s.activeTabId);
  const selectedWidgetId = useDashboardStore((s) => s.selectedWidgetId);
  const setSelectedWidget = useDashboardStore((s) => s.setSelectedWidget);
  const removeChart = useDashboardStore((s) => s.removeChart);
  const addChart = useDashboardStore((s) => s.addChart);
  const calculatedFields = useDashboardStore((s) => s.calculatedFields);
  const addCalculatedField = useDashboardStore((s) => s.addCalculatedField);
  const removeCalculatedField = useDashboardStore((s) => s.removeCalculatedField);
  const columnOverrides = useDashboardStore((s) => s.columnOverrides);
  const setColumnOverride = useDashboardStore((s) => s.setColumnOverride);
  const clearColumnOverride = useDashboardStore((s) => s.clearColumnOverride);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldExpr, setNewFieldExpr] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [fieldPopoverOpen, setFieldPopoverOpen] = useState(false);

  const [chartPopoverOpen, setChartPopoverOpen] = useState(false);
  const [newChartType, setNewChartType] = useState<ChartType>("bar");
  const [newChartDim, setNewChartDim] = useState<string | undefined>(summary.dimensions[0]);
  const [newChartMeasure, setNewChartMeasure] = useState<string | undefined>(summary.measures[0]);

  function handleAddChart() {
    if (!activeSheetId) return;
    const chart: ChartConfig = {
      id: generateId("chart"),
      type: newChartType,
      title: `${CHART_TYPE_LABELS[newChartType]}${newChartMeasure ? `: ${newChartMeasure}` : ""}`,
      encoding: { dimension: newChartDim, measure: newChartMeasure, aggregation: "sum", sort: "desc" },
      colorScheme: "brand",
      showLegend: true,
      showLabels: false,
      showGrid: true,
      sheetId: activeSheetId,
    };
    addChart(chart);
    setChartPopoverOpen(false);
  }

  function handleAddField() {
    const error = validateExpression(newFieldExpr);
    if (!newFieldName.trim()) {
      setFieldError("Give this field a name.");
      return;
    }
    if (error) {
      setFieldError(error);
      return;
    }
    addCalculatedField({ id: generateId("calc"), name: newFieldName.trim(), expression: newFieldExpr, resultType: "number" });
    setNewFieldName("");
    setNewFieldExpr("");
    setFieldError(null);
    setFieldPopoverOpen(false);
  }

  if (!isOpen) return null;

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="hidden shrink-0 overflow-hidden border-r border-border bg-card/40 md:block"
    >
      <div className="h-full w-[280px] overflow-y-auto px-3 py-3">
        <SidebarSection title="Dataset" icon={Database}>
          <div className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-primary" />
              <p className="min-w-0 flex-1 truncate text-xs font-medium">{dataset?.fileName}</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
              <span>{dataset ? formatFileSize(dataset.fileSize) : ""}</span>
              <span className="text-right">{dataset?.fileType.toUpperCase()}</span>
              <span>{summary.rowCount.toLocaleString()} rows</span>
              <span className="text-right">{summary.columnCount} cols</span>
            </div>
          </div>
        </SidebarSection>

        <SidebarSection title="Field Dictionary" icon={BookOpenText} defaultOpen={false}>
          <div className="space-y-0.5">
            {rawSummary.columns.map((col) => {
              const override = columnOverrides[col.name];
              return (
                <Popover key={col.name} open={editingColumn === col.name} onOpenChange={(o) => setEditingColumn(o ? col.name : null)}>
                  <PopoverTrigger
                    render={
                      <button className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-accent/40" />
                    }
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{col.name}</span>
                    <span className="ml-2 flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                      {override && <RotateCcw className="size-2.5 text-primary" />}
                      <span className="capitalize">{col.dataType}</span>
                      <span>·</span>
                      <span className="capitalize">{col.role}</span>
                    </span>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 space-y-2.5 p-3">
                    <p className="truncate text-xs font-medium">{col.name}</p>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground">Data type</p>
                      <Select value={col.dataType} onValueChange={(v) => v && setColumnOverride(col.name, { dataType: v as ColumnDataType })}>
                        <SelectTrigger className="h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs capitalize">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground">Role</p>
                      <Select value={col.role} onValueChange={(v) => v && setColumnOverride(col.name, { role: v as ColumnRole })}>
                        <SelectTrigger className="h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs capitalize">
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {override && (
                      <button
                        onClick={() => clearColumnOverride(col.name)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="size-3" /> Reset to auto-detected
                      </button>
                    )}
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </SidebarSection>

        {dataset && dataset.sheets.length > 1 && (
          <SidebarSection title="Sheets" icon={FileSpreadsheet}>
            <div className="space-y-1">
              {dataset.sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => setActiveSheet(sheet.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs",
                    sheet.id === activeSheetId ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <span className="truncate">{sheet.name}</span>
                  <span className="shrink-0 text-[10px] opacity-70">{sheet.rows.length.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </SidebarSection>
        )}

        <SidebarSection title="Filters" icon={BarChart3} defaultOpen>
          <FiltersPanel rows={rows} summary={summary} />
        </SidebarSection>

        <SidebarSection
          title="Visualizations"
          icon={BarChart3}
          action={
            <Popover open={chartPopoverOpen} onOpenChange={setChartPopoverOpen}>
              <PopoverTrigger render={<Button size="icon" variant="ghost" className="size-6" />}>
                <Plus className="size-3.5" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-2.5 p-3">
                <p className="text-xs font-medium">Add a chart</p>
                <Select value={newChartType} onValueChange={(v) => v && setNewChartType(v as ChartType)}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CHART_TYPE_LABELS) as ChartType[])
                      .filter((t) => t !== "kpi")
                      .map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {CHART_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={newChartDim ?? "__none__"} onValueChange={(v) => setNewChartDim(!v || v === "__none__" ? undefined : v)}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">No dimension</SelectItem>
                    {summary.columns.map((c) => (
                      <SelectItem key={c.name} value={c.name} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newChartMeasure ?? "__none__"} onValueChange={(v) => setNewChartMeasure(!v || v === "__none__" ? undefined : v)}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Measure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">No measure</SelectItem>
                    {summary.measures.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 w-full text-xs" onClick={handleAddChart}>
                  Add to Dashboard
                </Button>
              </PopoverContent>
            </Popover>
          }
        >
          <div className="space-y-0.5">
            {activeTab?.widgets.map((w) => (
              <div
                key={w.chart.id}
                onClick={() => setSelectedWidget(w.chart.id)}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs",
                  selectedWidgetId === w.chart.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                )}
              >
                <span className="truncate">{w.chart.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChart(w.chart.id);
                  }}
                  className="shrink-0 opacity-0 hover:text-destructive group-hover:opacity-100"
                >
                  {selectedWidgetId === w.chart.id ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                </button>
              </div>
            ))}
            {!activeTab?.widgets.length && <p className="px-2 text-[11px] text-muted-foreground">No charts yet.</p>}
          </div>
        </SidebarSection>

        <SidebarSection
          title="Calculated Fields"
          icon={Sigma}
          defaultOpen={false}
          action={
            <Popover open={fieldPopoverOpen} onOpenChange={setFieldPopoverOpen}>
              <PopoverTrigger render={<Button size="icon" variant="ghost" className="size-6" />}>
                <Plus className="size-3.5" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-2 p-3">
                <p className="text-xs font-medium">New calculated field</p>
                <Input placeholder="Field name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} className="h-8 text-xs" />
                <Input
                  placeholder="e.g. [Revenue] - [Cost]"
                  value={newFieldExpr}
                  onChange={(e) => setNewFieldExpr(e.target.value)}
                  className="h-8 text-xs"
                />
                {fieldError && <p className="text-[11px] text-destructive">{fieldError}</p>}
                <p className="text-[10px] text-muted-foreground">Reference columns in [brackets]. Supports + − × ÷ and parentheses.</p>
                <Button size="sm" className="h-8 w-full text-xs" onClick={handleAddField}>
                  Create Field
                </Button>
              </PopoverContent>
            </Popover>
          }
        >
          <div className="space-y-1">
            {calculatedFields.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{f.expression}</p>
                </div>
                <button onClick={() => removeCalculatedField(f.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {!calculatedFields.length && <p className="px-1 text-[11px] text-muted-foreground">No calculated fields yet.</p>}
          </div>
        </SidebarSection>
      </div>
    </motion.aside>
  );
}
