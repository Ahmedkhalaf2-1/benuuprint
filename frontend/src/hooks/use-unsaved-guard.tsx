"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/provider";

/**
 * Guards unsaved changes against: tab close / reload (beforeunload) AND in-app link clicks (a capture-phase click
 * listener on internal <a> links, which covers sidebar, breadcrumbs and Link components). Programmatic router calls
 * from the page itself are the page's responsibility; the browser Back button is not intercepted (documented limitation).
 * Render the returned `dialog` somewhere in the page.
 */
export function useUnsavedGuard(dirty: boolean) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const bypass = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (bypass.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // hash / same page
      e.preventDefault();
      e.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(o) => !o && setPending(null)}
      title={t("common.discardUnsavedChanges")}
      description={t("common.youHaveChangesThatAreNot")}
      confirmLabel={t("common.discardAndLeave")}
      destructive
      onConfirm={() => {
        const href = pending;
        setPending(null);
        if (href) {
          bypass.current = true;
          router.push(href);
        }
      }}
    />
  );
  return { dialog };
}
