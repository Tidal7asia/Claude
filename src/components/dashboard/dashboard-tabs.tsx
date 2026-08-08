"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DashboardTabs() {
  const tabs = useDashboardStore((s) => s.tabs);
  const activeTabId = useDashboardStore((s) => s.activeTabId);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const addTab = useDashboardStore((s) => s.addTab);
  const removeTab = useDashboardStore((s) => s.removeTab);
  const renameTab = useDashboardStore((s) => s.renameTab);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          onDoubleClick={() => {
            setRenamingId(tab.id);
            setDraft(tab.name);
          }}
          className={cn(
            "group flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            tab.id === activeTabId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
          )}
        >
          {renamingId === tab.id ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft.trim()) renameTab(tab.id, draft.trim());
                setRenamingId(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-24 px-1.5 text-xs"
            />
          ) : (
            <span>{tab.name}</span>
          )}
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => addTab(`Tab ${tabs.length + 1}`)}
        className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
