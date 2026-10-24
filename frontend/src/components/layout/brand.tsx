import { cn } from "@/lib/utils/cn";

/** Benue Print mark + wordmark, the same wordmark treatment as the public site (uppercase, wide tracking). */
export function Brand({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold", className)}>
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-fill text-sm font-bold text-brand-foreground">B</span>
      {collapsed ? <span className="sr-only">Benue Print</span> : <span className="text-[0.8125rem] uppercase tracking-[0.2em]">Benue Print</span>}
    </span>
  );
}
