import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium tracking-[0.01em] transition-[color,background-color,border-color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-fill text-brand-foreground hover:bg-brand-fill-hover",
        secondary: "border border-border-strong bg-transparent text-foreground hover:border-muted-foreground/60 hover:bg-white/5",
        ghost: "text-foreground hover:bg-white/5",
        danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
        link: "h-auto p-0 text-brand hover:underline",
      },
      size: { sm: "h-8 px-2.5", md: "h-9 px-3.5", lg: "h-10 px-4" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ className, variant, size, loading, asChild, disabled, children, type = "button", ref, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? children : (
        <>
          {loading ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}
