"use client";

import { Aperture, Upload, Settings, PanelLeft, PanelRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DarkModeToggle } from "./dark-mode-toggle";
import { ExportMenu } from "./export-menu";
import { SavedDashboardsMenu } from "./saved-dashboards-menu";
import { ReplaceDatasetFlow } from "./replace-dataset-flow";
import { VersionHistoryPanel } from "./version-history-panel";
import { DataStatusBadge } from "./data-status-badge";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { useState } from "react";

export function TopNav({ canvasRef }: { canvasRef: React.RefObject<HTMLDivElement | null> }) {
  const dataset = useDashboardStore((s) => s.dataset);
  const reset = useDashboardStore((s) => s.reset);
  const toggleLeftSidebar = useDashboardStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useDashboardStore((s) => s.toggleRightSidebar);
  const toggleAssistant = useDashboardStore((s) => s.toggleAssistant);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <header className="glass-nav sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-white">
          <Aperture className="size-4" />
        </div>
        <span className="hidden text-sm font-semibold sm:inline">Lens</span>
      </div>

      {dataset && (
        <>
          <Button variant="ghost" size="icon" className="ml-1 size-8 md:hidden" onClick={() => toggleLeftSidebar()}>
            <PanelLeft className="size-4" />
          </Button>

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <Popover open={confirmReset} onOpenChange={setConfirmReset}>
            <PopoverTrigger render={<Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" />}>
              <Upload className="size-3.5" /> Upload Spreadsheet
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 space-y-2 p-3">
              <p className="text-xs">Uploading a new file will replace your current dashboard.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => reset()}>
                  Continue
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <ReplaceDatasetFlow />
          <VersionHistoryPanel />
          <SavedDashboardsMenu />

          <div className="mx-1 hidden h-6 w-px bg-border lg:block" />
          <DataStatusBadge />
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        {dataset && (
          <>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => toggleAssistant()}>
              <Sparkles className="size-3.5" /> AI Assistant
            </Button>
            <ExportMenu canvasRef={canvasRef} />
            <Button variant="ghost" size="icon" className="hidden size-8 lg:flex" onClick={() => toggleRightSidebar()}>
              <PanelRight className="size-4" />
            </Button>
          </>
        )}
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
            <Settings className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3 p-3">
            <p className="text-xs font-semibold">Settings</p>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Compact widget headers</Label>
              <Switch disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Auto-refresh insights</Label>
              <Switch defaultChecked disabled />
            </div>
            <p className="text-[10px] text-muted-foreground">More workspace settings coming soon.</p>
          </PopoverContent>
        </Popover>
        <DarkModeToggle />
      </div>
    </header>
  );
}
