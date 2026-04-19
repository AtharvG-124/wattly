"use client";

import { cn } from "@/lib/utils";

/** Mirrors how an RGB LED might show home status — green/yellow/red from waste score. */
export function RgbBadge({ wasteScore }: { wasteScore: number }) {
  const level =
    wasteScore < 35 ? "good" : wasteScore < 65 ? "warn" : "bad";
  const label =
    level === "good" ? "Looking good" : level === "warn" ? "Watch usage" : "High waste risk";

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "h-14 w-14 rounded-2xl border-2 shadow-lg transition-shadow",
          level === "good" && "bg-emerald-500/30 border-emerald-400 shadow-emerald-500/20",
          level === "warn" && "bg-amber-500/30 border-amber-400 shadow-amber-500/20",
          level === "bad" && "bg-red-500/30 border-red-400 shadow-red-500/20"
        )}
        aria-label={`Status ${label}`}
      />
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500">LED-style indicator (matches your Iris device)</p>
      </div>
    </div>
  );
}
