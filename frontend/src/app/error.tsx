"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

/** Last-resort error screen in the Benuu Print language. It never signs anyone out: it only offers a retry. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <div aria-hidden className="flex size-12 items-center justify-center rounded-sm border bg-surface-sunken text-danger"><AlertCircle className="size-6" /></div>
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">{t("common.somethingWentWrong")}</p>
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t("common.weCouldnTLoadThisPage")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("common.pleaseTryAgainIfItKeeps")}</p>
      {error.digest ? <p className="text-xs text-muted-foreground">{t("common.referenceLabel")} <code className="font-mono">{error.digest}</code></p> : null}
      <Button onClick={reset}>{t("common.tryAgain")}</Button>
    </main>
  );
}
