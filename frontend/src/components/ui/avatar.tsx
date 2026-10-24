import { cn } from "@/lib/utils/cn";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-hover", className)}>
      {initials(name)}
    </span>
  );
}
