/**
 * Presentation-only formatting. Business time (SLA, ETA, delay) is computed by the
 * backend; these helpers only render values it returns.
 */
import { getActive } from "@/i18n/active";

/**
 * These helpers follow the ACTIVE locale (English unless the browser switched to Arabic), so module-level code such as table column
 * definitions localises too. Components can equally use `useI18n().fmt`, which is the same implementation.
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  return getActive().fmt.dateTime(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  return getActive().fmt.date(value);
}

/** Backend reports ages and delays in minutes. */
export function formatDuration(minutes: number | null | undefined): string {
  return getActive().fmt.duration(minutes);
}

/** "RELEASED_FOR_PACKAGING" -> "Released for packaging" (English) / the canonical Arabic translation when one exists. */
export function humanizeCode(code: string): string {
  return getActive().fmt.code(code);
}

export function formatNumber(value: number): string {
  return getActive().fmt.number(value);
}

/** Decimal strings from the backend are shown as-is, grouped, never summed across currencies. */
export function formatMoney(amount: string, currency: string): string {
  return getActive().fmt.money(amount, currency);
}

/** Display text for English strings held outside React (module-level column definitions etc.): the active locale's phrase, else the English. */
export function tx(english: string): string {
  return getActive().t.text(english);
}
