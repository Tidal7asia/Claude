"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, LineChart, Link2, ChevronDown, Trophy } from "lucide-react";
import { generateInsights, generatePlainEnglishSummary, type Insight, type InsightKind } from "@/lib/ai/insights";
import { cn } from "@/lib/utils";
import type { DataSummary } from "@/types/data";
import type { RawRow } from "@/types/dashboard";

const KIND_ICON: Record<InsightKind, React.ComponentType<{ className?: string }>> = {
  "top-performer": Trophy,
  "bottom-performer": TrendingDown,
  trend: LineChart,
  outlier: AlertTriangle,
  correlation: Link2,
  growth: TrendingUp,
  "missing-data": AlertTriangle,
  duplicates: AlertTriangle,
  summary: Sparkles,
};

const SEVERITY_STYLE: Record<Insight["severity"], string> = {
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  info: "bg-primary/10 text-primary",
};

export function InsightsPanel({ rows, summary }: { rows: RawRow[]; summary: DataSummary }) {
  const [expanded, setExpanded] = useState(true);
  const insights = useMemo(() => generateInsights(rows, summary), [rows, summary]);
  const plainSummary = useMemo(() => generatePlainEnglishSummary(rows, summary), [rows, summary]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass card-shadow rounded-2xl p-4">
      <button className="flex w-full items-center justify-between" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-white">
            <Sparkles className="size-3.5" />
          </div>
          <h3 className="text-sm font-semibold">AI Insights</h3>
        </div>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plainSummary}</p>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {insights.map((insight, i) => {
                const Icon = KIND_ICON[insight.kind];
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex gap-2.5 rounded-xl border border-border/60 bg-card/40 p-3"
                  >
                    <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg", SEVERITY_STYLE[insight.severity])}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{insight.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{insight.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
              {!insights.length && <p className="text-xs text-muted-foreground">Not enough data to surface insights yet.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
