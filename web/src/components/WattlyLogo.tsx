import { cn } from "@/lib/utils";

export function WattlyLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
        <circle cx="18" cy="18" r="17" stroke="#22c55e" strokeWidth="2" />
        <path
          d="M18 8c-4 4-6 8-6 12 0 3 2 6 6 6s6-3 6-6c0-4-2-8-6-12z"
          fill="#22c55e"
          opacity="0.9"
        />
        <path
          d="M10 22c2-1 4-2 8-2s6 1 8 2"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M12 14h2M22 14h2" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="font-semibold text-xl tracking-tight">Wattly</span>
    </div>
  );
}
