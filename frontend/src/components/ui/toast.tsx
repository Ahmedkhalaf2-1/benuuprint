"use client";

import { Toaster as Sonner, toast } from "sonner";
import { useI18n } from "@/i18n/provider";

/** Toasts follow the reading direction: bottom-right in LTR, bottom-left in RTL, with the toast text laid out RTL. */
export function Toaster() {
  const { dir } = useI18n();
  return (
    <Sonner
      dir={dir}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      toastOptions={{ classNames: { toast: "!rounded-md !border !bg-surface !text-foreground !text-sm !shadow-md" } }}
    />
  );
}

export { toast };
