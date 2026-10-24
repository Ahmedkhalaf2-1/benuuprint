/**
 * Presentation-only formatting. Business time (SLA, ETA, delay) is computed by the
 * backend; these helpers only render values it returns.
 */
const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? dateTime.format(d) : "—";
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? dateOnly.format(d) : "—";
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Backend reports ages and delays in minutes. */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "—";
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${m % 60 ? ` ${m % 60}m` : ""}`;
  const d = Math.floor(h / 24);
  return `${d}d${h % 24 ? ` ${h % 24}h` : ""}`;
}

/** "RELEASED_FOR_PACKAGING" -> "Released for packaging" */
export function humanizeCode(code: string): string {
  const s = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

/** Decimal strings from the backend are shown as-is, grouped, never summed across currencies. */
export function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  const body = Number.isFinite(n)
    ? new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    : amount;
  return `${currency} ${body}`;
}
