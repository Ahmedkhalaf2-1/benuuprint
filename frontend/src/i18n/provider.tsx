"use client";

import { useRouter } from "next/navigation";
import { Direction as RadixDirection } from "radix-ui";
import { createContext, startTransition, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_MAX_AGE_SECONDS, directionOf, type Direction, type Locale } from "./config";
import { setActiveLocale } from "./active";
import { localizeDeep } from "./localize";
import { makeFormatter, type Formatter } from "./format";
import { makeTranslator, type Translator } from "./translate";

export interface I18n {
  locale: Locale;
  dir: Direction;
  t: Translator;
  fmt: Formatter;
  /** Localised view of a constant (array/object of English display strings); same reference in English. */
  loc: <T,>(data: T) => T;
  setLocale: (next: Locale) => void;
}

export function buildI18n(locale: Locale, setLocale: (next: Locale) => void = () => {}): I18n {
  const t = makeTranslator(locale);
  return { locale, dir: directionOf(locale), t, fmt: makeFormatter(locale, t), loc: (data) => (locale === "en" ? data : localizeDeep(data, t.text)), setLocale };
}

/** Without a provider (unit tests, isolated renders) everything is English, exactly as before localisation existed. */
const Ctx = createContext<I18n>(buildI18n(DEFAULT_LOCALE));

/**
 * The server reads the locale cookie and passes it in, so the first paint already has the right `lang`/`dir`.
 * Switching writes the cookie (a plain preference; auth cookies and in-memory tokens are never touched), updates <html>
 * immediately, then asks Next to re-render the CURRENT route. No navigation, no remount of the auth providers, no logout.
 */
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<{ locale: Locale; source: Locale }>({ locale: initialLocale, source: initialLocale });
  // The server value changed (e.g. the cookie was updated in another tab, then this route refreshed): adopt it.
  if (state.source !== initialLocale) setState({ locale: initialLocale, source: initialLocale });
  const locale = state.locale;
  setActiveLocale(locale); // browser only; see ./active

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_MAX_AGE_SECONDS}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    document.documentElement.lang = next;
    document.documentElement.dir = directionOf(next);
    setState((s) => ({ ...s, locale: next }));
    startTransition(() => router.refresh());
  }, [router]);

  const value = useMemo(() => buildI18n(locale, setLocale), [locale, setLocale]);
  // Radix primitives (select, menus, tabs, popovers) take their arrow-key and placement direction from this, not from <html dir>.
  return <Ctx.Provider value={value}><RadixDirection.Provider dir={value.dir}>{children}</RadixDirection.Provider></Ctx.Provider>;
}

export const useI18n = (): I18n => useContext(Ctx);
