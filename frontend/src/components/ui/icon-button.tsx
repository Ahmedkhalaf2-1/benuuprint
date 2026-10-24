import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

/** Icon-only button: `label` is mandatory so it always has an accessible name. */
export function IconButton({
  label,
  icon,
  className,
  variant = "ghost",
  size = "md",
  ...props
}: Omit<ComponentProps<typeof Button>, "children" | "size"> & { label: string; icon: ReactNode; size?: "sm" | "md" }) {
  return (
    <Button
      variant={variant}
      aria-label={label}
      title={label}
      className={cn("px-0", size === "sm" ? "size-8" : "size-9", className)}
      {...props}
    >
      {icon}
    </Button>
  );
}
