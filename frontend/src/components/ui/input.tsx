import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const fieldClass =
  "w-full rounded-md border bg-surface-sunken px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors hover:border-border-strong focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60 aria-invalid:border-danger";

/** Values that are technical, not prose, must stay left-to-right inside Arabic pages (emails, URLs, phone numbers, codes, tokens). */
const LTR_TYPES = new Set(["email", "tel", "url", "password", "number"]);
const LTR_MODES = new Set(["email", "tel", "url", "numeric", "decimal"]);
const LTR_ID = /email|phone|whatsapp|instagram|website|hex|pantone|token|tracking|url|currency|(^|[-_])(ig|wa|web|ref)([-_]|$)/i;

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  const ltr = LTR_TYPES.has(type) || (props.inputMode !== undefined && LTR_MODES.has(props.inputMode)) || (props.id !== undefined && LTR_ID.test(props.id));
  return <input type={type} dir={ltr ? "ltr" : undefined} className={cn(fieldClass, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-20 py-2", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-[0.8125rem] font-medium text-foreground/90", className)} {...props} />;
}
