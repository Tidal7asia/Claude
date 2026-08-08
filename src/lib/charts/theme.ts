// Validated categorical palette (light/dark) — see dataviz skill reference.
// Order is the CVD-safety mechanism: always assign in this fixed order, never cycle/reorder per chart.

export const CATEGORICAL_LIGHT = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

export const SEQUENTIAL_BLUE_LIGHT = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
export const SEQUENTIAL_BLUE_DARK = ["#0d366b", "#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4", "#cde2fb"];

export const DIVERGING_LIGHT: [string, string, string] = ["#2a78d6", "#f0efec", "#e34948"];
export const DIVERGING_DARK: [string, string, string] = ["#3987e5", "#383835", "#e66767"];

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const CHART_SURFACE = { light: "#fcfcfb", dark: "#1a1a19" };
export const CHART_INK = {
  light: { primary: "#0b0b0b", secondary: "#52514e", muted: "#898781", grid: "#e1e0d9", axis: "#c3c2b7" },
  dark: { primary: "#ffffff", secondary: "#c3c2b7", muted: "#898781", grid: "#2c2c2a", axis: "#383835" },
};

export function getCategoricalPalette(theme: "light" | "dark"): string[] {
  return theme === "dark" ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
}

export function getSequentialPalette(theme: "light" | "dark"): string[] {
  return theme === "dark" ? SEQUENTIAL_BLUE_DARK : SEQUENTIAL_BLUE_LIGHT;
}

export function getInk(theme: "light" | "dark") {
  return CHART_INK[theme];
}

export function colorAt(theme: "light" | "dark", index: number): string {
  const palette = getCategoricalPalette(theme);
  if (index < palette.length) return palette[index];
  // fold overflow series into a repeating muted tone rather than inventing new hues
  return getInk(theme).muted;
}
