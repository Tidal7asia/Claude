import type { DataSummary } from "@/types/data";
import type { ColumnOverride } from "@/types/dashboard";

/** Applies user corrections to auto-detected column type/role, then rebuilds the role index lists
 * (dimensions/measures/time/geo) so overrides actually take effect everywhere charts and filters
 * read from — this is the "ask, don't guess" escape hatch surfaced in the field dictionary. */
export function applyColumnOverrides(summary: DataSummary, overrides: Record<string, ColumnOverride>): DataSummary {
  if (!Object.keys(overrides).length) return summary;

  const columns = summary.columns.map((col) => {
    const override = overrides[col.name];
    if (!override) return col;
    return {
      ...col,
      dataType: override.dataType ?? col.dataType,
      role: override.role ?? col.role,
      isCurrency: override.dataType ? override.dataType === "currency" : col.isCurrency,
      isTimeSeries: override.role ? override.role === "time" : col.isTimeSeries,
      isGeo: override.role ? override.role === "geo" : col.isGeo,
    };
  });

  return {
    ...summary,
    columns,
    dimensions: columns.filter((c) => c.role === "dimension").map((c) => c.name),
    measures: columns.filter((c) => c.role === "measure").map((c) => c.name),
    timeSeriesColumns: columns.filter((c) => c.role === "time").map((c) => c.name),
    geoColumns: columns.filter((c) => c.role === "geo").map((c) => c.name),
    currencyColumns: columns.filter((c) => c.isCurrency).map((c) => c.name),
  };
}
