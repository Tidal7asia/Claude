import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import type { RawRow } from "@/types/dashboard";

export function downloadCSV(rows: RawRow[], headers: string[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${fileName}.csv`);
}

export function downloadExcel(rows: RawRow[], headers: string[], fileName: string, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export async function exportNodeToPNG(node: HTMLElement, fileName: string) {
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: getComputedBg(node) });
  const link = document.createElement("a");
  link.download = `${fileName}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportNodeToPDF(node: HTMLElement, fileName: string) {
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: getComputedBg(node) });
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  const pdf = new jsPDF({ orientation: img.width > img.height ? "landscape" : "portrait", unit: "px", format: [img.width, img.height] });
  pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
  pdf.save(`${fileName}.pdf`);
}

function getComputedBg(node: HTMLElement): string {
  const bg = getComputedStyle(node).backgroundColor;
  return bg && bg !== "rgba(0, 0, 0, 0)" ? bg : "#ffffff";
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportNodeToPPTX(node: HTMLElement, fileName: string, title: string) {
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: getComputedBg(node) });
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  slide.addText(title, { x: 0.4, y: 0.2, fontSize: 20, bold: true });
  slide.addImage({ data: dataUrl, x: 0.4, y: 0.8, w: 9, h: 5, sizing: { type: "contain", w: 9, h: 5 } });
  await pptx.writeFile({ fileName: `${fileName}.pptx` });
}

export function generateShareLink(dashboardId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/dashboard/${dashboardId}`;
}
