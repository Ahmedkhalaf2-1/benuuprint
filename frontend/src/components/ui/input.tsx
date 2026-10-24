import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const fieldClass =
  "w-full rounded-md border bg-surface-sunken px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors hover:border-border-strong focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60 aria-invalid:border-danger";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} className={cn(fieldClass, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-20 py-2", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-[0.8125rem] font-medium text-foreground/90", className)} {...props} />;
}
