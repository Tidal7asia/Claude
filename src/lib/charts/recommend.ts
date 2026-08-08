import type { DataSummary } from "@/types/data";
import type { ChartConfig, ChartType } from "@/types/dashboard";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function baseChart(sheetId: string, type: ChartType, title: string): Omit<ChartConfig, "encoding"> {
  return {
    id: nextId("chart"),
    type,
    title,
    colorScheme: "brand",
    showLegend: true,
    showLabels: false,
    showGrid: true,
    sheetId,
  };
}

/** Recommend an initial set of charts based on detected column roles. */
export function recommendCharts(summary: DataSummary, sheetId: string): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const { dimensions, measures, timeSeriesColumns, geoColumns } = summary;
  const primaryMeasure = measures[0];
  const lowCardDims = dimensions.filter((d) => {
    const col = summary.columns.find((c) => c.name === d);
    return col && col.distinctCount >= 2 && col.distinctCount <= 15;
  });
  const highCardDims = dimensions.filter((d) => {
    const col = summary.columns.find((c) => c.name === d);
    return col && col.distinctCount > 15;
  });

  // Time series -> line/area
  if (timeSeriesColumns.length && primaryMeasure) {
    charts.push({
      ...baseChart(sheetId, "line", `${primaryMeasure} Over Time`),
      encoding: { dimension: timeSeriesColumns[0], measure: primaryMeasure, aggregation: "sum", sort: "none" },
    });
    charts.push({
      ...baseChart(sheetId, "area", `${primaryMeasure} Trend`),
      encoding: { dimension: timeSeriesColumns[0], measure: primaryMeasure, aggregation: "sum", sort: "none" },
    });
  }

  // Low-cardinality dimension -> bar + pie/donut
  if (lowCardDims.length && primaryMeasure) {
    const dim = lowCardDims[0];
    charts.push({
      ...baseChart(sheetId, "bar", `${primaryMeasure} by ${dim}`),
      encoding: { dimension: dim, measure: primaryMeasure, aggregation: "sum", sort: "desc" },
    });
    const distinct = summary.columns.find((c) => c.name === dim)?.distinctCount ?? 0;
    if (distinct <= 8) {
      charts.push({
        ...baseChart(sheetId, "donut", `${dim} Distribution`),
        encoding: { dimension: dim, measure: primaryMeasure, aggregation: "sum", sort: "desc" },
      });
    }
  }

  // Second dimension -> stacked bar
  if (lowCardDims.length >= 2 && primaryMeasure) {
    charts.push({
      ...baseChart(sheetId, "stackedBar", `${primaryMeasure} by ${lowCardDims[0]} & ${lowCardDims[1]}`),
      encoding: {
        dimension: lowCardDims[0],
        secondaryDimension: lowCardDims[1],
        measure: primaryMeasure,
        aggregation: "sum",
        sort: "none",
      },
    });
    charts.push({
      ...baseChart(sheetId, "heatmap", `${lowCardDims[0]} vs ${lowCardDims[1]} Heatmap`),
      encoding: {
        dimension: lowCardDims[0],
        secondaryDimension: lowCardDims[1],
        measure: primaryMeasure,
        aggregation: "sum",
        sort: "none",
      },
    });
  }

  // High cardinality dimension -> treemap (top N)
  if (highCardDims.length && primaryMeasure) {
    charts.push({
      ...baseChart(sheetId, "treemap", `${primaryMeasure} by ${highCardDims[0]} (Top 20)`),
      encoding: { dimension: highCardDims[0], measure: primaryMeasure, aggregation: "sum", sort: "desc", limit: 20 },
    });
  }

  // Two measures -> scatter, three -> bubble
  if (measures.length >= 2) {
    if (measures.length >= 3 && lowCardDims.length) {
      charts.push({
        ...baseChart(sheetId, "bubble", `${measures[0]} vs ${measures[1]} (sized by ${measures[2]})`),
        encoding: {
          dimension: lowCardDims[0],
          measure: measures[0],
          secondaryMeasure: measures[1],
          aggregation: "avg",
          sort: "none",
        },
      });
    } else {
      charts.push({
        ...baseChart(sheetId, "scatter", `${measures[0]} vs ${measures[1]}`),
        encoding: { measure: measures[0], secondaryMeasure: measures[1], aggregation: "avg", sort: "none" },
      });
    }
  }

  // Single measure distribution -> histogram
  if (primaryMeasure) {
    charts.push({
      ...baseChart(sheetId, "histogram", `${primaryMeasure} Distribution`),
      encoding: { measure: primaryMeasure, aggregation: "count", sort: "none" },
    });
  }

  // Multiple measures across a dimension -> radar
  if (measures.length >= 3 && lowCardDims.length) {
    charts.push({
      ...baseChart(sheetId, "radar", `Measure Comparison by ${lowCardDims[0]}`),
      encoding: { dimension: lowCardDims[0], measure: primaryMeasure, aggregation: "avg", sort: "none", limit: 8 },
    });
  }

  // Geo -> map
  if (geoColumns.length && primaryMeasure) {
    charts.push({
      ...baseChart(sheetId, "geoMap", `${primaryMeasure} by ${geoColumns[0]}`),
      encoding: { dimension: geoColumns[0], measure: primaryMeasure, aggregation: "sum", sort: "desc" },
    });
  }

  // Funnel: ordered low-cardinality dim that looks like stages
  const funnelDim = lowCardDims.find((d) => /stage|step|status|funnel/i.test(d));
  if (funnelDim && primaryMeasure) {
    charts.push({
      ...baseChart(sheetId, "funnel", `Funnel by ${funnelDim}`),
      encoding: { dimension: funnelDim, measure: primaryMeasure, aggregation: "sum", sort: "desc" },
    });
  }

  // Gauge for a percentage measure
  const pctMeasure = summary.columns.find((c) => c.dataType === "percentage");
  if (pctMeasure) {
    charts.push({
      ...baseChart(sheetId, "gauge", `${pctMeasure.name} (avg)`),
      encoding: { measure: pctMeasure.name, aggregation: "avg", sort: "none" },
    });
  }

  // Always append a pivot + interactive table
  if (lowCardDims.length && primaryMeasure) {
    charts.push({
      ...baseChart(sheetId, "pivot", "Pivot Table"),
      encoding: {
        dimension: lowCardDims[0],
        secondaryDimension: lowCardDims[1],
        measure: primaryMeasure,
        aggregation: "sum",
        sort: "none",
      },
    });
  }

  charts.push({
    ...baseChart(sheetId, "table", "All Records"),
    encoding: { aggregation: "count", sort: "none" },
  });

  return charts;
}

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: "Bar Chart",
  column: "Column Chart",
  line: "Line Chart",
  area: "Area Chart",
  pie: "Pie Chart",
  donut: "Donut Chart",
  stackedBar: "Stacked Bar",
  treemap: "Treemap",
  heatmap: "Heatmap",
  scatter: "Scatter Plot",
  bubble: "Bubble Chart",
  histogram: "Histogram",
  boxplot: "Box Plot",
  radar: "Radar Chart",
  waterfall: "Waterfall Chart",
  funnel: "Funnel",
  gauge: "Gauge",
  calendarHeatmap: "Calendar Heatmap",
  geoMap: "Geographic Map",
  timeline: "Timeline",
  pivot: "Pivot Table",
  table: "Interactive Data Table",
  kpi: "KPI Card",
};
