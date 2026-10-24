import { cn } from "@/lib/utils/cn";
import { humanizeCode } from "@/lib/utils/format";
import { statusTone, toneClasses, toneShape, type DotShape } from "./status";

const shapeClass: Record<DotShape, string> = {
  solid: "rounded-full",
  ring: "rounded-full bg-transparent! border-[1.5px] border-current",
  square: "rounded-[1px]",
  diamond: "rotate-45 rounded-[1px]",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const tone = statusTone[status] ?? "neutral";
  const c = toneClasses[tone];
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-sm px-1.5 text-[0.75rem] font-medium leading-none ring-1 ring-inset ring-current/20",
        c.badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0", c.dot, shapeClass[toneShape[tone]])} />
      {label ?? humanizeCode(status)}
    </span>
  );
}
