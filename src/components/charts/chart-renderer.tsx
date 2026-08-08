"use client";

import { BarColumnChart, LineAreaChart, StackedBarChart, HistogramChart, WaterfallChart } from "./cartesian-charts";
import { PieDonutChart, RadarChartView, GaugeChart, FunnelChartView } from "./radial-charts";
import { ScatterPlot, BubbleChart } from "./scatter-charts";
import { TreemapChart, HeatmapChart, CalendarHeatmap, GeoBreakdown, BoxPlotChart, TimelineChart } from "./matrix-charts";
import { PivotTable } from "@/components/table/pivot-table";
import { DataTable } from "@/components/table/data-table";
import { EmptyChartState } from "./chart-tooltip";
import type { ChartConfig, RawRow } from "@/types/dashboard";
import type { DataSummary } from "@/types/data";

export function ChartRenderer({ chart, rows, summary }: { chart: ChartConfig; rows: RawRow[]; summary: DataSummary }) {
  const props = { chart, rows, summary };
  switch (chart.type) {
    case "column":
      return <BarColumnChart {...props} horizontal={false} />;
    case "bar":
      return <BarColumnChart {...props} horizontal />;
    case "line":
      return <LineAreaChart {...props} area={false} />;
    case "area":
      return <LineAreaChart {...props} area />;
    case "pie":
      return <PieDonutChart {...props} donut={false} />;
    case "donut":
      return <PieDonutChart {...props} donut />;
    case "stackedBar":
      return <StackedBarChart {...props} />;
    case "treemap":
      return <TreemapChart {...props} />;
    case "heatmap":
      return <HeatmapChart {...props} />;
    case "scatter":
      return <ScatterPlot {...props} />;
    case "bubble":
      return <BubbleChart {...props} />;
    case "histogram":
      return <HistogramChart {...props} />;
    case "boxplot":
      return <BoxPlotChart {...props} />;
    case "radar":
      return <RadarChartView {...props} />;
    case "waterfall":
      return <WaterfallChart {...props} />;
    case "funnel":
      return <FunnelChartView {...props} />;
    case "gauge":
      return <GaugeChart {...props} />;
    case "calendarHeatmap":
      return <CalendarHeatmap {...props} />;
    case "geoMap":
      return <GeoBreakdown {...props} />;
    case "timeline":
      return <TimelineChart {...props} />;
    case "pivot":
      return <PivotTable {...props} />;
    case "table":
      return <DataTable rows={rows} summary={summary} compact />;
    default:
      return <EmptyChartState message="Unsupported chart type." />;
  }
}
