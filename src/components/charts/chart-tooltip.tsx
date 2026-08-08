"use client";

import type { TooltipContentProps } from "recharts";

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: Partial<TooltipContentProps<number, string>> & { valueFormatter?: (v: number) => string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass card-shadow rounded-xl px-3 py-2 text-xs">
      {label !== undefined && <p className="mb-1 font-medium text-foreground">{String(label)}</p>}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium tabular-nums text-foreground">
              {valueFormatter && typeof p.value === "number" ? valueFormatter(p.value) : String(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
      <p>{message}</p>
    </div>
  );
}
