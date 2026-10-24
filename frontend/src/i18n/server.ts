import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, directionOf, isLocale, type Locale } from "./config";
import { makeFormatter } from "./format";
import { makeTranslator } from "./translate";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Server-component equivalent of `useI18n()` (reads the same cookie). Note: reading cookies makes the route dynamic. */
export async function getI18n() {
  const locale = await getLocale();
  const t = makeTranslator(locale);
  return { locale, dir: directionOf(locale), t, fmt: makeFormatter(locale, t) };
}

/** Page `<title>` from an English source title (looked up in `phrases`); extra metadata is passed through untouched. */
export async function localizedTitle(title: string, extra: Metadata = {}): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.text(title), ...extra };
}
