import type { Locale } from "./config";
import { messages, type Messages } from "./messages";

type Ns = keyof Messages;
/** Every valid "namespace.key" (type-checked: a typo or a missing key is a compile error). */
export type MessageKey = { [N in Ns]: `${N}.${Extract<keyof Messages[N], string>}` }[Ns];
export type Vars = Record<string, string | number | null | undefined>;

const interpolate = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? "") : m)) : s);

function lookup(locale: Locale, ns: string, key: string): string | undefined {
  const v = (messages[locale] as unknown as Record<string, Record<string, string> | undefined>)[ns]?.[key];
  return typeof v === "string" ? v : undefined;
}

export interface Translator {
  (key: MessageKey, vars?: Vars): string;
  /** Looks a dynamic key up (e.g. a backend code). Returns undefined when there is no translation in the active locale AND none in English. */
  has: (ns: Ns, key: string) => boolean;
  dyn: (ns: Ns, key: string, vars?: Vars) => string | undefined;
  /** Display text for data held in constants (catalogue copy, legal text): looks the exact English string up in `phrases`; falls back to the English. */
  text: (en: string) => string;
  /** CLDR plural pick: uses `<base>Zero|One|Two|Few|Many|Other`, falling back to `<base>Other`. `{n}` is interpolated. */
  plural: (ns: Ns, base: string, n: number, vars?: Vars) => string;
}

export function makeTranslator(locale: Locale): Translator {
  const get = (ns: string, key: string) => lookup(locale, ns, key) ?? lookup("en", ns, key);
  const t = ((key: MessageKey, vars?: Vars) => {
    const dot = key.indexOf(".");
    return interpolate(get(key.slice(0, dot), key.slice(dot + 1)) ?? key, vars);
  }) as Translator;
  t.has = (ns, key) => get(ns, key) !== undefined;
  t.dyn = (ns, key, vars) => {
    const v = lookup(locale, ns, key);
    return v === undefined ? undefined : interpolate(v, vars);
  };
  t.text = (en) => (locale === "en" ? en : (messages[locale].phrases as Record<string, string>)[en] ?? en);
  t.plural = (ns, base, n, vars) => {
    const cat = new Intl.PluralRules(locale).select(n);
    const pick = (c: string) => get(ns, base + c.charAt(0).toUpperCase() + c.slice(1));
    return interpolate(pick(cat) ?? pick("other") ?? base, { n, ...vars });
  };
  return t;
}
