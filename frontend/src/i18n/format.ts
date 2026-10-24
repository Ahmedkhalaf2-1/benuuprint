import { LOCALE_META, type Locale } from "./config";
import type { Translator } from "./translate";

const EM_DASH = "—";
const toDate = (v: string | Date | null | undefined): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "RELEASED_FOR_PACKAGING" -> "Released for packaging" (English fallback for codes without a translation). */
export function humanizeCode(code: string): string {
  const s = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Display currency symbols. The API value (e.g. "EGP") is never changed; this is presentation only. */
const AR_CURRENCY: Record<string, string> = { EGP: "ج.م" };

export interface Formatter {
  date: (v: string | Date | null | undefined) => string;
  dateTime: (v: string | Date | null | undefined) => string;
  number: (n: number, opts?: Intl.NumberFormatOptions) => string;
  /** Decimal strings from the backend are shown as-is (grouped), never recomputed. */
  money: (amount: string, currency: string) => string;
  duration: (minutes: number | null | undefined) => string;
  /** Localised display of a backend enum/status code. The code itself is never altered or sent translated. */
  code: (code: string | null | undefined) => string;
  /** Localised display of a role code (SUPER_ADMIN, SALES, ...). Permission identifiers are never translated. */
  role: (code: string) => string;
}

export function makeFormatter(locale: Locale, t: Translator): Formatter {
  const intl = LOCALE_META[locale].intl;
  const dateFmt = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "short", year: "numeric" });
  const dateTimeFmt = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const num = new Intl.NumberFormat(intl);
  const money = new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const unit = (value: number, u: "minute" | "hour" | "day") => new Intl.NumberFormat(intl, { style: "unit", unit: u, unitDisplay: "narrow" }).format(value);

  return {
    date: (v) => { const d = toDate(v); return d ? dateFmt.format(d) : EM_DASH; },
    dateTime: (v) => { const d = toDate(v); return d ? dateTimeFmt.format(d) : EM_DASH; },
    number: (n, opts) => (opts ? new Intl.NumberFormat(intl, opts).format(n) : num.format(n)),
    money: (amount, currency) => {
      const n = Number(amount);
      const body = Number.isFinite(n) ? money.format(n) : amount;
      if (locale === "ar") return `${body} ${AR_CURRENCY[currency] ?? currency}`;
      return `${currency} ${body}`;
    },
    duration: (minutes) => {
      if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return EM_DASH;
      const m = Math.max(0, Math.round(minutes));
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      if (locale === "en") {
        if (m < 60) return `${m}m`;
        if (h < 24) return `${h}h${m % 60 ? ` ${m % 60}m` : ""}`;
        return `${d}d${h % 24 ? ` ${h % 24}h` : ""}`;
      }
      if (m < 60) return unit(m, "minute");
      if (h < 24) return m % 60 ? `${unit(h, "hour")} ${unit(m % 60, "minute")}` : unit(h, "hour");
      return h % 24 ? `${unit(d, "day")} ${unit(h % 24, "hour")}` : unit(d, "day");
    },
    code: (code) => (code ? t.dyn("codes", code) ?? humanizeCode(code) : EM_DASH),
    role: (code) => t.dyn("roles", code) ?? humanizeCode(code),
  };
}
