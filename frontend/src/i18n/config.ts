/** Locale model. Routes are NOT locale-prefixed: the active locale lives in a cookie so every existing URL keeps working. */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export type Direction = "ltr" | "rtl";

export const DEFAULT_LOCALE: Locale = "en";
/** Non-sensitive preference cookie (readable by the client so the switcher can write it). Never holds auth data. */
export const LOCALE_COOKIE = "bp_locale";
export const LOCALE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const LOCALE_META: Record<Locale, { dir: Direction; intl: string; short: string; name: string }> = {
  en: { dir: "ltr", intl: "en-GB", short: "EN", name: "English" },
  ar: { dir: "rtl", intl: "ar-EG", short: "العربية", name: "العربية" },
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
export const directionOf = (locale: Locale): Direction => LOCALE_META[locale].dir;
