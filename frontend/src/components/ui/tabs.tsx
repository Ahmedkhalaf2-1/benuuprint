"use client";

import { Tabs as T } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const Tabs = T.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof T.List>) {
  return <T.List className={cn("flex gap-4 overflow-x-auto border-b", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger className={cn("-mb-px h-10 whitespace-nowrap border-b-2 border-transparent text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-brand data-[state=active]:text-foreground", className)} {...props} />
  );
}
export const TabsContent = T.Content;
