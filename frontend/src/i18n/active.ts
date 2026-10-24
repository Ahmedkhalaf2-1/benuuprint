import { DEFAULT_LOCALE, type Locale } from "./config";
import { makeFormatter, type Formatter } from "./format";
import { localizeDeep } from "./localize";
import { makeTranslator, type Translator } from "./translate";

/**
 * Client-side "current locale" for code that formats outside a React render (module-level table column definitions, helpers).
 * Components should prefer `useI18n()`. This is set by `LocaleProvider` in the browser only: on the server it stays English,
 * so concurrent requests can never leak one visitor's language into another's render.
 */
let active: { locale: Locale; fmt: Formatter; t: Translator } = (() => { const t = makeTranslator(DEFAULT_LOCALE); return { locale: DEFAULT_LOCALE, fmt: makeFormatter(DEFAULT_LOCALE, t), t }; })();

export function setActiveLocale(locale: Locale): void {
  if (typeof window === "undefined" || active.locale === locale) return;
  const t = makeTranslator(locale);
  active = { locale, fmt: makeFormatter(locale, t), t };
}
export const getActive = () => active;

/**
 * Wraps a constant map/array of English display strings so every read returns the ACTIVE locale's text (English unchanged).
 * Keeps call sites as they were (`LABELS[code]`), and works for module-level tables. Codes/keys are never touched.
 */
export function localizedMap<T extends object>(map: T): T {
  return new Proxy(map, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string" || typeof v === "function") return v;
      return active.locale === "en" ? v : localizeDeep(v, active.t.text);
    },
  });
}
