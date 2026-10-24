"use client";

import { Toaster as Sonner, toast } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{ classNames: { toast: "!rounded-md !border !bg-surface !text-foreground !text-sm !shadow-md" } }}
    />
  );
}

export { toast };
