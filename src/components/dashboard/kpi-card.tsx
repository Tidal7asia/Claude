"use client";

import { motion } from "framer-motion";
import { Hash, DollarSign, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, Layers, ArrowBigUpDash, ArrowBigDownDash, Search } from "lucide-react";
import { AnimatedNumber } from "./animated-number";
import { formatValue } from "@/lib/data/aggregate";
import type { KpiCardData } from "@/lib/charts/kpi";
import { cn } from "@/lib/utils";

const ICONS: Record<KpiCardData["icon"], React.ComponentType<{ className?: string }>> = {
  records: Hash,
  sum: DollarSign,
  avg: BarChart3,
  median: Layers,
  growth: TrendingUp,
  max: ArrowBigUpDash,
  min: ArrowBigDownDash,
  distinct: Hash,
};

export function KpiCard({ kpi, index, onViewSource }: { kpi: KpiCardData; index: number; onViewSource: () => void }) {
  const Icon = ICONS[kpi.icon];
  const formatType = kpi.format;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="glass card-shadow group relative overflow-hidden rounded-2xl p-4"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        <AnimatedNumber value={kpi.value} formatter={(v) => formatValue(v, formatType, kpi.currencySymbol)} />
      </div>
      {kpi.delta !== undefined && (
        <div
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 text-xs font-medium",
            kpi.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {kpi.delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          vs. prior period
        </div>
      )}
      <button
        onClick={onViewSource}
        className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <Search className="size-3" /> View source rows
      </button>
      <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-primary/5 blur-2xl" />
    </motion.div>
  );
}
