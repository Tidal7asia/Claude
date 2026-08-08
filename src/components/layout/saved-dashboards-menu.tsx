"use client";

import { useState } from "react";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { deleteSavedDashboard, listSavedDashboards, loadSavedDashboard, saveCurrentDashboard } from "@/lib/store/persistence";
import type { SavedDashboard } from "@/types/dashboard";
import { toast } from "sonner";

export function SavedDashboardsMenu() {
  const [dashboards, setDashboards] = useState<SavedDashboard[]>(() => listSavedDashboards());
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("My Dashboard");

  function handleSave() {
    saveCurrentDashboard(name.trim() || "Untitled Dashboard");
    setDashboards(listSavedDashboards());
    setSaveOpen(false);
    toast.success("Dashboard saved");
  }

  function handleLoad(d: SavedDashboard) {
    loadSavedDashboard(d);
    toast.success(`Loaded "${d.name}"`);
  }

  function handleDelete(id: string) {
    deleteSavedDashboard(id);
    setDashboards(listSavedDashboards());
  }

  return (
    <div className="flex items-center gap-1">
      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger render={<Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" />}>
          <Save className="size-3.5" /> Save
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-2 p-3">
          <p className="text-xs font-medium">Save dashboard</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
          <Button size="sm" className="h-8 w-full text-xs" onClick={handleSave}>
            Save Layout
          </Button>
        </PopoverContent>
      </Popover>

      <DropdownMenu onOpenChange={(next) => next && setDashboards(listSavedDashboards())}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" />}>
          <FolderOpen className="size-3.5" /> Saved Dashboards
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs">Saved Dashboards</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {dashboards.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">Nothing saved yet.</p>}
          {dashboards.map((d) => (
            <DropdownMenuItem key={d.id} className="flex items-center justify-between gap-2" onSelect={(e) => e.preventDefault()}>
              <button className="min-w-0 flex-1 truncate text-left" onClick={() => handleLoad(d)}>
                {d.name}
              </button>
              <button className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(d.id)}>
                <Trash2 className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
