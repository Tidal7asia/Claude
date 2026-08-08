"use client";

import { useTheme } from "next-themes";
import { getCategoricalPalette, getInk, getSequentialPalette } from "@/lib/charts/theme";

// Charts only ever mount client-side after a dataset is loaded (never part of the initial
// server-rendered upload screen), so resolvedTheme is already settled — no hydration guard needed.
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const theme: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  return {
    theme,
    palette: getCategoricalPalette(theme),
    sequential: getSequentialPalette(theme),
    ink: getInk(theme),
  };
}
