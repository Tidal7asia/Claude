"use client";

import { useState } from "react";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { UploadZone } from "@/components/upload/upload-zone";
import { ValidationScreen } from "@/components/validation/validation-screen";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DarkModeToggle } from "@/components/layout/dark-mode-toggle";
import { Aperture } from "lucide-react";
import type { Dataset } from "@/types/data";

export default function Home() {
  const dataset = useDashboardStore((s) => s.dataset);
  const setDataset = useDashboardStore((s) => s.setDataset);
  const [pendingDataset, setPendingDataset] = useState<Dataset | null>(null);

  if (dataset) return <DashboardView />;

  if (pendingDataset) {
    return (
      <ValidationScreen
        dataset={pendingDataset}
        onContinue={() => setDataset(pendingDataset)}
        onCancel={() => setPendingDataset(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_45%),radial-gradient(circle_at_80%_10%,color-mix(in_oklch,var(--accent)_25%,transparent),transparent_40%)]">
      <header className="glass-nav sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-white">
            <Aperture className="size-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold">Lens</span>
            <span className="text-[10px] text-muted-foreground">by Tidal7</span>
          </div>
        </div>
        <DarkModeToggle />
      </header>
      <UploadZone onParsed={setPendingDataset} />
    </div>
  );
}
