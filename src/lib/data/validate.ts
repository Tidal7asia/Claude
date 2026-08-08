import type { DataSummary, ValidationIssue, ValidationReport } from "@/types/data";
import type { RawRow } from "@/types/dashboard";
import { getNumericValue } from "./detect";

let issueCounter = 0;
function issueId(): string {
  issueCounter += 1;
  return `issue-${issueCounter}`;
}

const HIGH_MISSING_THRESHOLD = 0.3;

/**
 * Surfaces data-quality issues found in the sheet as-uploaded, without altering anything.
 * Every issue links back to the specific row indices that caused it, so the user can inspect
 * (and decide how to handle) the original data rather than have it silently "cleaned".
 */
export function validateSheet(headers: string[], rows: RawRow[], summary: DataSummary): ValidationReport {
  const issues: ValidationIssue[] = [];

  // Mixed-type columns: a column containing a genuine mix of numeric and non-numeric values.
  // This runs on every column, not just ones already classified as a numeric measure — a column
  // that's 60% numbers and 40% text like "N/A"/"pending" falls below the threshold that classifies
  // it as a measure, but the numeric values in it are still real and the mix still needs flagging
  // rather than being silently absorbed into a "text" column.
  for (const col of summary.columns) {
    if (col.dataType === "date" || col.dataType === "boolean" || col.role === "identifier") continue;
    let numericCount = 0;
    const affected: number[] = [];
    rows.forEach((row, i) => {
      const value = row[col.name];
      if (value === null || value === undefined || value === "") return;
      if (getNumericValue(value) === null) affected.push(i);
      else numericCount += 1;
    });
    if (affected.length > 0 && numericCount > 0) {
      issues.push({
        id: issueId(),
        kind: "mixed-type",
        column: col.name,
        message: `"${col.name}" contains both numeric and text values. ${affected.length} row${affected.length === 1 ? "" : "s"} require review.`,
        affectedRowIndices: affected,
      });
    }
  }

  // High-missing columns: >30% empty, worth flagging explicitly rather than quietly averaging over gaps.
  for (const col of summary.columns) {
    if (col.missingPct <= HIGH_MISSING_THRESHOLD || col.missingPct === 1) continue;
    const affected: number[] = [];
    rows.forEach((row, i) => {
      const value = row[col.name];
      if (value === null || value === undefined || value === "") affected.push(i);
    });
    issues.push({
      id: issueId(),
      kind: "high-missing",
      column: col.name,
      message: `"${col.name}" is ${(col.missingPct * 100).toFixed(0)}% empty (${affected.length} of ${rows.length} rows).`,
      affectedRowIndices: affected,
    });
  }

  // Duplicate rows: exact duplicates across every column.
  if (summary.duplicateRowCount > 0) {
    const seen = new Map<string, number>();
    const affected: number[] = [];
    rows.forEach((row, i) => {
      const key = headers.map((h) => String(row[h] ?? "")).join("␟");
      if (seen.has(key)) affected.push(i);
      else seen.set(key, i);
    });
    issues.push({
      id: issueId(),
      kind: "duplicate-rows",
      message: `${affected.length} row${affected.length === 1 ? "" : "s"} appear to be exact duplicates of an earlier row.`,
      affectedRowIndices: affected,
    });
  }

  return {
    status: issues.length > 0 ? "review" : "ok",
    issues,
  };
}
