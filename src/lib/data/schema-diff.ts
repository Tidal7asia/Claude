import type { SheetData } from "@/types/data";
import type { SchemaDiff } from "@/types/dashboard";

/**
 * Compares two sheets' structure. Deliberately only reports additions/removals — it does not try to
 * guess that a column was "renamed", since that can't be known for certain from headers alone and
 * guessing wrong would misrepresent the source data.
 */
export function diffSchemas(previous: SheetData, next: SheetData): SchemaDiff {
  const prevSet = new Set(previous.headers);
  const nextSet = new Set(next.headers);
  const addedColumns = next.headers.filter((h) => !prevSet.has(h));
  const removedColumns = previous.headers.filter((h) => !nextSet.has(h));

  return {
    structurallyIdentical: addedColumns.length === 0 && removedColumns.length === 0,
    addedColumns,
    removedColumns,
    rowCountBefore: previous.rows.length,
    rowCountAfter: next.rows.length,
    columnCountBefore: previous.headers.length,
    columnCountAfter: next.headers.length,
  };
}
