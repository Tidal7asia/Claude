import type { Dataset, SheetData } from "@/types/data";
import { parseSpreadsheetFile } from "./parse";
import { summarizeSheet } from "./detect";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadDataset(file: File): Promise<Dataset> {
  const parsed = await parseSpreadsheetFile(file);

  // yield to the event loop between sheets so the upload UI stays responsive on large files
  const sheets: SheetData[] = [];
  for (const s of parsed.sheets) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const summary = summarizeSheet(s.headers, s.rows);
    sheets.push({ id: uid("sheet"), name: s.name, headers: s.headers, rows: s.rows, summary });
  }

  return {
    id: uid("dataset"),
    fileName: file.name,
    fileSize: file.size,
    fileType: parsed.fileType,
    uploadedAt: new Date().toISOString(),
    sheets,
    activeSheetId: sheets[0].id,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
