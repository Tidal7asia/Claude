"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, FileText, FileSpreadsheet, Presentation, Link as LinkIcon, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { downloadCSV, downloadExcel, exportNodeToPDF, exportNodeToPNG, exportNodeToPPTX, generateShareLink } from "@/lib/export/export";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { toast } from "sonner";

export function ExportMenu({ canvasRef }: { canvasRef: React.RefObject<HTMLDivElement | null> }) {
  const dataset = useDashboardStore((s) => s.dataset);
  const [busy, setBusy] = useState(false);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleShareLink() {
    const link = generateShareLink(dataset?.id ?? "dashboard");
    navigator.clipboard?.writeText(link);
    toast.success("Share link copied to clipboard", { icon: <Check className="size-4" /> });
  }

  const sheet = dataset?.sheets.find((s) => s.id === dataset.activeSheetId) ?? dataset?.sheets[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={busy} />}>
        <Download className="size-3.5" /> Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => canvasRef.current && withBusy(() => exportNodeToPNG(canvasRef.current!, "dashboard"))}
        >
          <ImageIcon /> Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => canvasRef.current && withBusy(() => exportNodeToPDF(canvasRef.current!, "dashboard"))}
        >
          <FileText /> Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            canvasRef.current && withBusy(() => exportNodeToPPTX(canvasRef.current!, "dashboard", "Dashboard"))
          }
        >
          <Presentation /> Export as PowerPoint
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!sheet}
          onClick={() => sheet && downloadCSV(sheet.rows, sheet.headers, sheet.name)}
        >
          <FileSpreadsheet /> Export data as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!sheet}
          onClick={() => sheet && downloadExcel(sheet.rows, sheet.headers, sheet.name, sheet.name)}
        >
          <FileSpreadsheet /> Export data as Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleShareLink}>
          <LinkIcon /> Copy share link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
