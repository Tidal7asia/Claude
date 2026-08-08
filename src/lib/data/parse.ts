import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { CellValue } from "@/types/data";

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, CellValue>[];
}

export interface ParsedFile {
  fileType: "xlsx" | "xls" | "csv";
  sheets: ParsedSheet[];
}

function normalizeHeader(raw: unknown, index: number): string {
  const str = String(raw ?? "").trim();
  return str.length > 0 ? str : `Column ${index + 1}`;
}

/** Disambiguate repeated header names (e.g. two side-by-side "Months" columns) so no data is silently
 * dropped when rows are built into a keyed object. */
function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h} (${count + 1})`;
  });
}

/** Many real-world exports (analytics tools, multi-section reports) have a title row, blank rows, or
 * merged section labels above the real header row. Rather than assuming row 0 is the header, scan the
 * first few rows and pick the densest one — the true header row reliably has far more populated cells
 * than a title/spacer row above it. */
function detectHeaderRowIndex(aoa: unknown[][]): number {
  const scanLimit = Math.min(aoa.length, 10);
  let bestIndex = 0;
  let bestCount = -1;
  for (let i = 0; i < scanLimit; i++) {
    const nonEmpty = aoa[i].filter((c) => c !== undefined && c !== null && c !== "").length;
    if (nonEmpty > bestCount) {
      bestCount = nonEmpty;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function coerceCell(value: unknown): CellValue {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).trim();
}

function rowsFromAOA(aoa: unknown[][]): ParsedSheet | null {
  if (!aoa.length) return null;
  const headerIndex = detectHeaderRowIndex(aoa);
  const headerRow = aoa[headerIndex];
  const headers = dedupeHeaders(headerRow.map((h, i) => normalizeHeader(h, i)));
  const dataRows = aoa.slice(headerIndex + 1).filter((r) => r.some((c) => c !== undefined && c !== null && c !== ""));
  const rows = dataRows.map((r) => {
    const obj: Record<string, CellValue> = {};
    headers.forEach((h, i) => {
      obj[h] = coerceCell(r[i]);
    });
    return obj;
  });
  return { name: "", headers, rows };
}

export async function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<unknown[]>(file, {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: true,
      worker: true,
      complete: (result) => {
        const sheet = rowsFromAOA(result.data);
        if (!sheet) return reject(new Error("The CSV file appears to be empty."));
        sheet.name = file.name.replace(/\.csv$/i, "");
        resolve({ fileType: "csv", sheets: [sheet] });
      },
      error: (err: Error) => reject(err),
    });
  });
}

export async function parseExcel(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets: ParsedSheet[] = [];
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
    const sheet = rowsFromAOA(aoa);
    if (sheet && sheet.rows.length > 0) {
      sheet.name = sheetName;
      sheets.push(sheet);
    }
  }
  if (sheets.length === 0) throw new Error("No non-empty sheets were found in this workbook.");
  const ext = file.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";
  return { fileType: ext, sheets };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCSV(file);
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseExcel(file);
  throw new Error("Unsupported file type. Please upload a .csv, .xls, or .xlsx file.");
}

export const ACCEPTED_MIME = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};
