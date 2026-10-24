import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Operational panel. Variants carry meaning, not decoration:
 * default (a surface), raised (nested/secondary), attention (needs a human: amber rail), action (the next step: emerald rail), sunken (inset data).
 */
const cardVariants = cva("rounded-lg border", {
  variants: {
    variant: {
      default: "bg-surface",
      raised: "bg-surface-muted",
      sunken: "bg-surface-sunken",
      attention: "border-tone-warning-dot/40 bg-surface shadow-[inset_2px_0_0_var(--tone-warning-dot)]",
      action: "border-brand/35 bg-brand-soft/40 shadow-[inset_2px_0_0_var(--brand)]",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Card({ className, variant, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}

/** Small technical label (mono, uppercase) used for eyebrows and field captions across the product. */
export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-brand", className)} {...props} />;
}
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-2 border-b px-4 py-3", className)} {...props} />;
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold leading-tight", className)} {...props} />;
}
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
