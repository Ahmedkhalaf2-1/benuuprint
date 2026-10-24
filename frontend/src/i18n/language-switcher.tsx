"use client";

import { Languages } from "lucide-react";
import { LOCALES, LOCALE_META, type Locale } from "./config";
import { useI18n } from "./provider";
import { cn } from "@/lib/utils/cn";

/**
 * Two-option language toggle (EN | العربية). `variant="public"` uses the public site's tokens, `app` the staff/customer shells.
 * Each option carries its own `lang` so screen readers pronounce the label correctly. Switching keeps the current route and session.
 */
export function LanguageSwitcher({ variant = "app", className, compact = false }: { variant?: "public" | "app"; className?: string; compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const other = LOCALES.find((l) => l !== locale) as Locale;

  if (compact) {
    return (
      <button type="button" lang={other} onClick={() => setLocale(other)} aria-label={t("common.switchLanguageTo", { language: LOCALE_META[other].name })} data-testid="language-switcher-compact"
        className={cn("inline-flex h-11 min-w-11 items-center justify-center gap-1.5 px-2 text-sm", variant === "public" ? "text-pub-muted active:text-pub-text" : "text-muted-foreground active:text-foreground", className)}>
        <Languages aria-hidden className="size-4" />{LOCALE_META[other].short}
      </button>
    );
  }
  return (
    <div role="group" aria-label={t("common.language")} data-testid="language-switcher" className={cn("inline-flex items-center border", variant === "public" ? "border-pub-line" : "border-border rounded-md", className)}>
      {LOCALES.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === locale} onClick={() => setLocale(l)}
          className={cn("h-8 px-2.5 text-xs font-medium transition-colors",
            variant === "public" ? (l === locale ? "bg-pub-brand-deep/30 text-pub-text" : "text-pub-muted hover:text-pub-text") : (l === locale ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"))}>
          {LOCALE_META[l].short}
        </button>
      ))}
    </div>
  );
}
