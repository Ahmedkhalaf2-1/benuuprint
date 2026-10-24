/**
 * Decimal-safe money helpers. Amounts are 2-decimal STRINGS everywhere (the API returns strings); arithmetic uses integer
 * minor units (BigInt), never floating point. Totals shown to users always come from the server: `previewTotals` is only a
 * live preview while editing a quotation and must be labelled as such.
 */
const AMOUNT = /^-?\d+(\.\d{1,2})?$/;

export const isMoneyInput = (v: string, opts: { allowNegative?: boolean } = {}) => AMOUNT.test(v.trim()) && (opts.allowNegative || !v.trim().startsWith("-"));

/** "12.5" -> 1250n ; null when not a valid 2-decimal amount. */
export function toMinor(v: string): bigint | null {
  const t = v.trim();
  if (!AMOUNT.test(t)) return null;
  const neg = t.startsWith("-");
  const [i, f = ""] = t.replace("-", "").split(".");
  const n = BigInt(i! + f.padEnd(2, "0"));
  return neg ? -n : n;
}

export function fromMinor(n: bigint): string {
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const s = abs.toString().padStart(3, "0");
  return `${neg ? "-" : ""}${s.slice(0, -2)}.${s.slice(-2)}`;
}

/** Half-up integer division (away from zero on ties), matching the server's half-up rounding. */
function divRound(num: bigint, den: bigint): bigint {
  const neg = num < 0n;
  const a = neg ? -num : num;
  const q = (a * 2n + den) / (2n * den);
  return neg ? -q : q;
}

export interface PreviewLine { quantity: string; unitPrice: string }

/** quantity (2dp) × unit price (2dp) -> amount in minor units. */
export function lineAmount(l: PreviewLine): bigint | null {
  const q = toMinor(l.quantity);
  const u = toMinor(l.unitPrice);
  return q === null || u === null ? null : divRound(q * u, 100n);
}

export function previewTotals(lines: PreviewLine[], discount: string, taxPercent: string): { subtotal: string; discount: string; tax: string; total: string } | null {
  let subtotal = 0n;
  for (const l of lines) {
    const a = lineAmount(l);
    if (a === null) return null;
    subtotal += a;
  }
  const d = toMinor(discount || "0");
  const t = toMinor(taxPercent || "0");
  if (d === null || t === null) return null;
  const base = subtotal - d;
  const tax = divRound(base * t, 10000n);
  return { subtotal: fromMinor(subtotal), discount: fromMinor(d), tax: fromMinor(tax), total: fromMinor(base + tax) };
}

/** Compare two amount strings exactly. */
export const isPositive = (v: string | null | undefined) => (v ? (toMinor(v) ?? 0n) > 0n : false);
