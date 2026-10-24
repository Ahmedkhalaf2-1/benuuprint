"use client";

import { ChevronsUp, ChevronUp, Minus } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

const config: Record<Priority, { label: string; cls: string; Icon: typeof Minus | null }> = {
  LOW: { label: "Low", cls: "text-muted-foreground", Icon: null },
  NORMAL: { label: "Normal", cls: "text-muted-foreground", Icon: null },
  HIGH: { label: "High", cls: "bg-tone-warning-bg text-tone-warning-fg", Icon: ChevronUp },
  URGENT: { label: "Urgent", cls: "bg-danger text-white", Icon: ChevronsUp },
};

export function PriorityBadge({ priority, className }: { priority: Priority | string; className?: string }) {
  const { fmt } = useI18n();
  const c = config[priority as Priority] ?? config.NORMAL;
  const Icon = c.Icon;
  return (
    <span
      data-priority={priority}
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm px-1.5 text-[0.75rem] font-medium leading-none",
        c.cls,
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3" strokeWidth={2.5} /> : null}
      {fmt.code(config[priority as Priority] ? priority : "NORMAL")}
    </span>
  );
}
