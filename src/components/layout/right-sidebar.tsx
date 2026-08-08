"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { CHART_TYPE_LABELS } from "@/lib/charts/recommend";
import { CATEGORICAL_LIGHT } from "@/lib/charts/theme";
import type { ChartType, AggregationType } from "@/types/dashboard";
import type { DataSummary } from "@/types/data";
import { cn } from "@/lib/utils";

const AGGREGATIONS: AggregationType[] = ["sum", "avg", "count", "min", "max", "median", "distinct"];
const CHART_TYPES = Object.keys(CHART_TYPE_LABELS).filter((t) => t !== "kpi") as ChartType[];
const COLOR_SCHEMES = [
  { id: "brand", label: "Brand", swatch: CATEGORICAL_LIGHT[0] },
  { id: "warm", label: "Warm", swatch: CATEGORICAL_LIGHT[1] },
  { id: "aqua", label: "Aqua", swatch: CATEGORICAL_LIGHT[2] },
];

export function RightSidebar({ summary }: { summary: DataSummary }) {
  const isOpen = useDashboardStore((s) => s.isRightSidebarOpen);
  const toggle = useDashboardStore((s) => s.toggleRightSidebar);
  const selectedWidgetId = useDashboardStore((s) => s.selectedWidgetId);
  const tabs = useDashboardStore((s) => s.tabs);
  const updateChart = useDashboardStore((s) => s.updateChart);

  const chart = tabs.flatMap((t) => t.widgets).find((w) => w.chart.id === selectedWidgetId)?.chart;

  const allFields = summary.columns.map((c) => c.name);
  const dimensionFields = summary.columns.filter((c) => c.role !== "measure").map((c) => c.name);
  const measureFields = summary.columns.filter((c) => c.role === "measure").map((c) => c.name);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 288, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="hidden shrink-0 overflow-hidden border-l border-border bg-card/40 lg:block"
        >
          <div className="h-full w-72 overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Settings2 className="size-4" /> Chart Settings
              </h2>
              <button onClick={() => toggle(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            {!chart ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                Select a chart on the canvas to edit its settings.
              </p>
            ) : (
              <div className="space-y-5">
                <Field label="Chart Type">
                  <Select value={chart.type} onValueChange={(v) => updateChart(chart.id, { type: v as ChartType })}>
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {CHART_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Dimension / Category">
                  <Select
                    value={chart.encoding.dimension ?? "__none__"}
                    onValueChange={(v) => updateChart(chart.id, { encoding: { ...chart.encoding, dimension: !v || v === "__none__" ? undefined : v } })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">None</SelectItem>
                      {dimensionFields.map((f) => (
                        <SelectItem key={f} value={f} className="text-xs">
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Group By (secondary)">
                  <Select
                    value={chart.encoding.secondaryDimension ?? "__none__"}
                    onValueChange={(v) => updateChart(chart.id, { encoding: { ...chart.encoding, secondaryDimension: !v || v === "__none__" ? undefined : v } })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">None</SelectItem>
                      {allFields.map((f) => (
                        <SelectItem key={f} value={f} className="text-xs">
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Measure / Value">
                  <Select
                    value={chart.encoding.measure ?? "__none__"}
                    onValueChange={(v) => updateChart(chart.id, { encoding: { ...chart.encoding, measure: !v || v === "__none__" ? undefined : v } })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">None</SelectItem>
                      {measureFields.map((f) => (
                        <SelectItem key={f} value={f} className="text-xs">
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {(chart.type === "scatter" || chart.type === "bubble") && (
                  <Field label="Secondary Measure">
                    <Select
                      value={chart.encoding.secondaryMeasure ?? "__none__"}
                      onValueChange={(v) => updateChart(chart.id, { encoding: { ...chart.encoding, secondaryMeasure: !v || v === "__none__" ? undefined : v } })}
                    >
                      <SelectTrigger className="h-8 w-full text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">None</SelectItem>
                        {measureFields.map((f) => (
                          <SelectItem key={f} value={f} className="text-xs">
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field label="Aggregation">
                  <Select
                    value={chart.encoding.aggregation}
                    onValueChange={(v) => updateChart(chart.id, { encoding: { ...chart.encoding, aggregation: v as AggregationType } })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGGREGATIONS.map((a) => (
                        <SelectItem key={a} value={a} className="text-xs capitalize">
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Sort">
                  <div className="flex gap-1.5">
                    {(["none", "asc", "desc"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateChart(chart.id, { encoding: { ...chart.encoding, sort: s } })}
                        className={cn(
                          "flex-1 rounded-lg border px-2 py-1 text-xs capitalize transition-colors",
                          (chart.encoding.sort ?? "none") === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Color Scheme">
                  <div className="flex gap-2">
                    {COLOR_SCHEMES.map((scheme) => (
                      <button
                        key={scheme.id}
                        onClick={() => updateChart(chart.id, { colorScheme: scheme.id })}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border-2",
                          chart.colorScheme === scheme.id ? "border-primary" : "border-transparent"
                        )}
                        title={scheme.label}
                      >
                        <span className="size-5 rounded-full" style={{ background: scheme.swatch }} />
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3">
                  <ToggleRow label="Show Legend" checked={chart.showLegend} onChange={(v) => updateChart(chart.id, { showLegend: v })} />
                  <ToggleRow label="Show Labels" checked={chart.showLabels} onChange={(v) => updateChart(chart.id, { showLabels: v })} />
                  <ToggleRow label="Show Grid" checked={chart.showGrid} onChange={(v) => updateChart(chart.id, { showGrid: v })} />
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-30 hidden rounded-full shadow-lg lg:flex"
          onClick={() => toggle(true)}
        >
          <Settings2 className="size-4" />
        </Button>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
