import type { AttentionItem, EtaQuality, Range } from "./types";

/** A percentage the backend may be unable to compute: `null` stays "unknown" (never 0%). */
export function formatPercent(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${Number.isInteger(v) ? v : v.toFixed(digits)}%`;
}

/** Minutes → "1h 5m" / "2d 3h"; null/undefined → "—" (unknown, not 0). */
export function formatMinutes(m: number | null | undefined): string {
  if (m === null || m === undefined || !Number.isFinite(m)) return "—";
  if (m < 1) return m === 0 ? "0m" : "<1m";
  const mins = Math.round(m);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h${mins % 60 ? ` ${mins % 60}m` : ""}`;
  const d = Math.floor(h / 24);
  return `${d}d${h % 24 ? ` ${h % 24}h` : ""}`;
}

/** Sum of money per currency — never across currencies. Strings stay decimal strings (no float arithmetic on money). */
export function currencyKeys(blocks: Array<{ currency: string }>): string[] {
  return [...new Set(blocks.map((b) => b.currency))].sort();
}

export interface EtaView { label: string; tone: "ok" | "caution" | "unknown"; caveat: string | null }
/**
 * ETA wording from the backend's data quality. Only HIGH is presented as a plain estimate; anything else carries a caveat and a
 * missing estimate is "Not estimable" (never today's date).
 */
export function etaView(at: string | null | undefined, quality: EtaQuality | undefined, fmt: (iso: string) => string): EtaView {
  if (!at) return { label: "Not estimable", tone: "unknown", caveat: null };
  const label = `Estimated completion: ${fmt(at)}`;
  if (quality === "HIGH") return { label, tone: "ok", caveat: null };
  if (quality === "MEDIUM") return { label, tone: "caution", caveat: "Medium confidence — based on limited recent data" };
  if (quality === "LOW") return { label, tone: "caution", caveat: "Low confidence — insufficient recent production data" };
  return { label, tone: "caution", caveat: quality ? `Data quality: ${quality}` : "Confidence not reported" };
}

/** Deep link for a Needs-Attention / alert item: straight to the entity the user must act on. */
export function attentionHref(item: Pick<AttentionItem, "type" | "entityType" | "entityId" | "context" | "reference">): string | null {
  const c = item.context ?? {};
  const t = item.type;
  if (c.shipmentId && c.orderId) return `/orders/${c.orderId}?tab=shipments&shipment=${c.shipmentId}`; // opens that shipment
  if (c.jobId) return c.stageId ? `/production/jobs/${c.jobId}?stage=${c.stageId}` : `/production/jobs/${c.jobId}`;
  if (c.orderId) {
    const tab = t === "PAYMENT_BLOCK" || t === "COMMERCIAL_REAPPROVAL_REQUIRED" ? "?tab=commercial" : t === "PACKAGING_DELAY" ? "?tab=packaging" : t === "SHIPMENT_FAILED" || t === "DELIVERY_DELAY" ? "?tab=shipments" : "";
    return `/orders/${c.orderId}${tab}`;
  }
  if (c.sampleId) return `/samples/${c.sampleId}`;
  if (item.entityId) {
    if (item.entityType === "ORDER") return `/orders/${item.entityId}`;
    if (item.entityType === "SAMPLE") return `/samples/${item.entityId}`;
    if (item.entityType === "JOB") return `/production/jobs/${item.entityId}`;
  }
  return referenceHref(item.reference);
}

/** Last resort for rows without ids (alerts): search the relevant list by the reference number. */
export function referenceHref(reference: string | undefined | null): string | null {
  if (!reference) return null;
  const q = encodeURIComponent(reference);
  if (reference.startsWith("JOB-")) return `/production?view=table&search=${q}`;
  if (reference.startsWith("ORD-")) return `/orders?search=${q}`;
  if (reference.startsWith("SMP-")) return `/samples?search=${q}`;
  if (reference.startsWith("SHP-")) return `/delivery?search=${q}`;
  return null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** `?from=&to=` (YYYY-MM-DD, business-day inputs) → API range. Empty = the backend default (last 30 days). */
export function rangeFromParams(sp: { get: (k: string) => string | null }): Range {
  const ok = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return { from: ok(sp.get("from")), to: ok(sp.get("to")) };
}
export function presetRange(days: number, now = new Date()): Range {
  const to = new Date(now); const from = new Date(now); from.setDate(from.getDate() - days);
  return { from: iso(from), to: iso(to) };
}
export function rangeLabel(r: Range): string {
  return r.from || r.to ? `${r.from ?? "…"} → ${r.to ?? "today"}` : "Last 30 days (default)";
}

export const SEVERITY_RANK: Record<string, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };
/** Utilization state from backend flags only: overloaded comes from the backend; null utilization = no capacity configured. */
export function utilizationState(day: { utilizationPercent: number | null; overloaded: boolean }): "overloaded" | "high" | "normal" | "idle" | "unknown" {
  if (day.utilizationPercent === null) return "unknown";
  if (day.overloaded) return "overloaded";
  if (day.utilizationPercent >= 85) return "high";
  if (day.utilizationPercent === 0) return "idle";
  return "normal";
}
