import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm px-1.5 text-[0.75rem] font-medium leading-none", {
  variants: {
    variant: {
      neutral: "bg-tone-neutral-bg text-tone-neutral-fg ring-1 ring-inset ring-white/5",
      brand: "bg-brand-soft text-brand-hover ring-1 ring-inset ring-brand/25",
      outline: "border bg-surface text-muted-foreground",
      danger: "bg-tone-danger-bg text-tone-danger-fg ring-1 ring-inset ring-tone-danger-dot/30",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
