"use client";

import { Switch as S } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export function Switch({ className, ...props }: ComponentProps<typeof S.Root>) {
  return (
    <S.Root className={cn("inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border-strong p-0.5 transition-colors data-[state=checked]:bg-brand disabled:opacity-50", className)} {...props}>
      <S.Thumb className="block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4" />
    </S.Root>
  );
}
