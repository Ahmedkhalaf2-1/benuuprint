import type { ReactNode } from "react";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/** Label + control + hint + inline error, wired for accessibility via `id`. */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden className="ms-0.5 text-danger">*</span> : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </Label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function FormError({ message, requestId }: { message: string; requestId?: string }) {
  return (
    <div role="alert" className="rounded-md bg-tone-danger-bg px-3 py-2 text-sm text-tone-danger-fg">
      <p>{message}</p>
      {requestId ? <p className="mt-0.5 text-xs opacity-80">Reference: {requestId}</p> : null}
    </div>
  );
}
