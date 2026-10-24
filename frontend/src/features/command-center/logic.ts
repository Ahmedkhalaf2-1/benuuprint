import { getActive } from "@/i18n/active";
import type { CommercialSummary, SampleListItem } from "@/features/samples/types";
import type { OrderFulfillment, OrderListItem } from "@/features/orders/types";
import type { JobListItem } from "@/features/production/types";
import type { Shipment } from "@/features/fulfillment/types";
import type { AttentionItem } from "@/features/management/types";
import { attentionHref } from "@/features/management/logic";
import { localizedMap } from "@/i18n/active";

export type QueueKey = "newRequests" | "needsReview" | "readyForQuotation" | "awaitingCustomer" | "awaitingPayment" | "readyForProduction" | "inProduction" | "readyForShipment" | "deliveryIssues";
export type Group = "commercial" | "production" | "delivery";
export type Urgency = "critical" | "high" | "normal";
export type ItemKind = "sample" | "order" | "job" | "shipment" | "attention";

export interface QueueItem {
  id: string;
  queue: QueueKey | "attention";
  kind: ItemKind;
  ref: string;
  title: string;
  status?: string;
  /** What the user should do next (human wording). */
  action: string;
  /** The exact place to do it. */
  href: string;
  urgency: Urgency;
  /** ISO time the item started waiting (for ordering: older first). */
  since?: string | null;
  dueAt?: string | null;
}

export type Can = (permission: string) => boolean;

export interface QueueDef { title: string; blurb: string; group: Group; weight: number; /** Any-of: the queue is shown only to people who can ACT on it (read-only access is not enough). */ requires?: string[]; links: Array<{ kind: ItemKind; label: string; href: string }> }
/** Queue definitions: titles/explanations, grouping, ranking weight (higher = earlier among equals) and where "Open queue" goes. */
export const QUEUES: Record<QueueKey, QueueDef> = {
  newRequests: { title: "New requests", blurb: "Submitted sample requests nobody has reviewed yet.", group: "commercial", weight: 45, links: [{ kind: "sample", label: "Samples", href: "/samples?status=SUBMITTED" }] },
  needsReview: { title: "Needs review", blurb: "Samples awaiting an approval decision and orders awaiting confirmation.", group: "commercial", weight: 40, links: [{ kind: "sample", label: "Samples", href: "/samples?status=AWAITING_APPROVAL" }, { kind: "order", label: "Orders", href: "/orders?status=PENDING_CONFIRMATION" }] },
  readyForQuotation: { title: "Ready for quotation", blurb: "Reviewed samples and confirmed orders that have no quotation yet.", group: "commercial", weight: 35, links: [{ kind: "sample", label: "Samples", href: "/samples?status=UNDER_REVIEW" }, { kind: "order", label: "Orders", href: "/orders?status=CONFIRMED" }] },
  awaitingCustomer: { title: "Awaiting customer", blurb: "A quotation was sent; waiting for the customer's decision.", group: "commercial", weight: 10, links: [{ kind: "sample", label: "Samples", href: "/samples?status=QUOTED" }, { kind: "order", label: "Orders", href: "/orders?status=CONFIRMED" }] },
  awaitingPayment: { title: "Awaiting payment", blurb: "Quotation accepted; the payment requirement is not met yet.", group: "commercial", weight: 50, links: [{ kind: "sample", label: "Samples", href: "/samples?status=AWAITING_PAYMENT" }, { kind: "order", label: "Orders", href: "/orders?status=CONFIRMED" }] },
  readyForProduction: { title: "Ready for production", blurb: "Commercial requirements are complete; production has not started.", group: "production", weight: 55, requires: ["factory_jobs.manage", "orders.manage"], links: [{ kind: "sample", label: "Samples", href: "/samples?status=READY_FOR_PRODUCTION" }, { kind: "order", label: "Orders", href: "/orders?status=READY_FOR_PRODUCTION" }, { kind: "job", label: "Planned jobs", href: "/production?view=table&status=PLANNED" }] },
  inProduction: { title: "In production", blurb: "Live factory jobs.", group: "production", weight: 20, requires: ["factory_jobs.manage", "jobs.assign"], links: [{ kind: "job", label: "Production", href: "/production" }] },
  readyForShipment: { title: "Ready for shipment", blurb: "Packed goods waiting for a shipment, and shipments waiting for dispatch.", group: "delivery", weight: 30, requires: ["shipments.manage", "shipments.dispatch"], links: [{ kind: "order", label: "Orders", href: "/orders?status=READY_FOR_DELIVERY" }, { kind: "shipment", label: "Shipments", href: "/delivery?status=READY" }] },
  deliveryIssues: { title: "Delivery issues", blurb: "Failed or returned deliveries.", group: "delivery", weight: 60, requires: ["shipments.manage", "shipments.dispatch", "shipments.complete"], links: [{ kind: "shipment", label: "Failed", href: "/delivery?status=FAILED" }, { kind: "shipment", label: "Returned", href: "/delivery?status=RETURNED" }] },
};
export const QUEUE_ORDER = Object.keys(QUEUES) as QueueKey[];
const any = (can: Can, perms: string[] | undefined) => !perms || perms.some((p) => can(p));
/** Whether the caller may act on a queue (read-only roles — e.g. SALES — do not get production / delivery work queues). */
export const canActOn = (queue: QueueKey, can: Can) => any(can, QUEUES[queue].requires);

const ageOf = (iso?: string | null) => iso ?? null;

/* ------------------------------ samples ------------------------------ */
/** Sample lifecycle status → queue + next action. Statuses are the backend's; permissions only change the wording / where it links. */
export function classifySample(s: Pick<SampleListItem, "id" | "sampleNumber" | "status" | "customer" | "productType" | "customProductName" | "submittedAt" | "updatedAt">, can: Can): QueueItem | null {
  const base = { id: `sample:${s.id}`, kind: "sample" as const, ref: s.sampleNumber, title: `${s.customer.displayName} · ${s.productType?.name ?? s.customProductName ?? "Custom product"}`, status: s.status, urgency: "normal" as Urgency };
  const to = (tab?: string) => `/samples/${s.id}${tab ? `?tab=${tab}` : ""}`;
  switch (s.status) {
    case "SUBMITTED": return { ...base, queue: "newRequests", action: can("samples.review") ? "Review request" : "Open request", href: to(), since: ageOf(s.submittedAt ?? s.updatedAt) };
    case "AWAITING_APPROVAL": return { ...base, queue: "needsReview", action: can("approvals.manage") || can("samples.approve") ? "Record approval decision" : "Open sample", href: to("approvals"), since: ageOf(s.updatedAt) };
    case "UNDER_REVIEW": return { ...base, queue: "readyForQuotation", action: can("quotations.create") ? "Prepare quotation" : "Continue review", href: can("quotations.read") ? to("commercial") : to(), since: ageOf(s.updatedAt) };
    case "QUOTED": return { ...base, queue: "awaitingCustomer", action: can("quotations.approve") ? "Record customer decision" : "Follow up with customer", href: can("quotations.read") ? to("commercial") : to(), since: ageOf(s.updatedAt) };
    case "AWAITING_PAYMENT": return { ...base, queue: "awaitingPayment", action: can("payments.verify") ? "Verify payment" : can("payments.manage") ? "Record payment" : "Check payment", href: can("payments.read") ? to("commercial") : to(), since: ageOf(s.updatedAt) };
    case "READY_FOR_PRODUCTION": return can("factory_jobs.manage") ? { ...base, queue: "readyForProduction", action: "Start production", href: to("production"), since: ageOf(s.updatedAt) } : null; // only people who can create the job
    default: return null;
  }
}

/* ------------------------------ orders ------------------------------- */
export interface OrderContext {
  /** Commercial summary of a CONFIRMED order (undefined = not loaded / no permission). */
  commercial?: Pick<CommercialSummary, "quotation" | "reapprovalRequired" | "releaseGate"> | null;
  /** Live (non-final) jobs of this order, when the caller may read jobs. `null` = unknown. */
  jobs?: Array<Pick<JobListItem, "id" | "jobNumber" | "status">> | null;
  /** Order detail fulfillment (only fetched for PARTIALLY_SHIPPED orders). */
  fulfillment?: Pick<OrderFulfillment, "shippableQuantity"> | null;
}
const highOrder = (o: Pick<OrderListItem, "priority" | "isDelayed">): Urgency => (o.priority === "URGENT" || o.priority === "HIGH" || o.isDelayed ? "high" : "normal");

export function classifyOrder(o: Pick<OrderListItem, "id" | "orderNumber" | "status" | "customer" | "priority" | "isDelayed" | "createdAt" | "targetDeliveryDate">, ctx: OrderContext, can: Can): QueueItem | null {
  const base = { id: `order:${o.id}`, kind: "order" as const, ref: o.orderNumber, title: o.customer.name, status: o.status, urgency: highOrder(o), since: ageOf(o.createdAt), dueAt: o.targetDeliveryDate };
  const to = (tab?: string) => `/orders/${o.id}${tab ? `?tab=${tab}` : ""}`;
  switch (o.status) {
    case "PENDING_CONFIRMATION": return { ...base, queue: "needsReview", action: can("orders.confirm") ? "Confirm order" : "Open order", href: to() };
    case "CONFIRMED": {
      const c = ctx.commercial;
      if (c === undefined) return null; // commercial state unknown (no permission / not loaded): never guess
      const link = to("commercial");
      if (c === null || !c.quotation || c.reapprovalRequired) return { ...base, queue: "readyForQuotation", action: c?.reapprovalRequired ? "Re-approve commercial terms" : can("quotations.create") ? "Prepare quotation" : "Open commercial", href: link };
      if (c.quotation.status === "SENT" || c.quotation.status === "DRAFT") return { ...base, queue: c.quotation.status === "SENT" ? "awaitingCustomer" : "readyForQuotation", action: c.quotation.status === "SENT" ? (can("quotations.approve") ? "Record customer decision" : "Follow up with customer") : "Send quotation", href: link };
      if (c.quotation.status === "ACCEPTED") {
        if (c.releaseGate && !c.releaseGate.satisfied) return { ...base, queue: "awaitingPayment", action: can("payments.verify") ? "Verify payment" : can("payments.manage") ? "Record payment" : "Check payment", href: link };
        return { ...base, queue: "readyForProduction", action: can("orders.manage") ? "Release to production" : "Open order", href: to() };
      }
      return null;
    }
    case "READY_FOR_PRODUCTION": {
      if (!can("factory_jobs.manage")) return null; // creating / releasing the job is the action
      const jobs = ctx.jobs;
      if (jobs && jobs.length > 0) {
        const planned = jobs.find((j) => j.status === "PLANNED");
        return planned ? { ...base, queue: "readyForProduction", action: "Release job to factory", href: `/production/jobs/${planned.id}`, ref: o.orderNumber, title: `${o.customer.name} · ${planned.jobNumber}` } : null; // a started job is an In-production item
      }
      return { ...base, queue: "readyForProduction", action: "Start production", href: to("production") };
    }
    case "READY_FOR_DELIVERY": return can("shipments.manage") ? { ...base, queue: "readyForShipment", action: "Create shipment", href: to("shipments") } : null;
    case "PARTIALLY_SHIPPED": {
      const n = ctx.fulfillment?.shippableQuantity ?? 0;
      return n > 0 && can("shipments.manage") ? { ...base, queue: "readyForShipment", action: getActive().t("dashboard.createShipmentUnitsWaiting", { n }), href: to("shipments") } : null;
    }
    default: return null;
  }
}

/* -------------------------------- jobs -------------------------------- */
export function classifyJob(j: Pick<JobListItem, "id" | "jobNumber" | "status" | "priority" | "openBlockers" | "delayedStages" | "customer" | "productName" | "createdAt" | "targetCompletionDate" | "orderId" | "sourceType">, can: Can): QueueItem | null {
  const base = { id: `job:${j.id}`, kind: "job" as const, ref: j.jobNumber, title: `${j.customer.name} · ${j.productName}`, status: j.status, since: ageOf(j.createdAt), dueAt: j.targetCompletionDate, href: `/production/jobs/${j.id}` };
  if (!can("factory_jobs.manage") && !can("jobs.assign")) return null; // factory work is for people who can act on it
  const risky = j.openBlockers > 0 || j.delayedStages > 0 || j.priority === "URGENT";
  if (j.status === "PLANNED") return { ...base, queue: "readyForProduction", action: "Release job to factory", urgency: j.priority === "URGENT" ? "high" : "normal" };
  if (!["READY", "IN_PROGRESS", "BLOCKED", "ON_HOLD"].includes(j.status)) return null;
  const action = j.openBlockers > 0 ? "Resolve blocker" : j.status === "ON_HOLD" ? "Resume job" : j.delayedStages > 0 ? "Review overdue stage" : j.status === "READY" ? "Assign staff and start" : "Track progress";
  return { ...base, queue: "inProduction", action, urgency: risky ? "high" : "normal" };
}

/* ------------------------------ shipments ----------------------------- */
export function classifyShipment(s: Pick<Shipment, "id" | "shipmentNumber" | "status" | "orderId" | "orderNumber" | "recipientName" | "createdAt" | "scheduledAt">, can: Can): QueueItem | null {
  const base = { id: `shipment:${s.id}`, kind: "shipment" as const, ref: s.shipmentNumber, title: `${s.orderNumber} · ${s.recipientName}`, status: s.status, href: `/orders/${s.orderId}?tab=shipments&shipment=${s.id}`, since: ageOf(s.createdAt), dueAt: s.scheduledAt };
  switch (s.status) {
    case "FAILED": return any(can, ["shipments.dispatch", "shipments.complete", "shipments.manage"]) ? { ...base, queue: "deliveryIssues", action: "Retry or return delivery", urgency: "high" } : null;
    case "RETURNED": return any(can, ["shipments.manage", "shipments.dispatch", "shipments.complete"]) ? { ...base, queue: "deliveryIssues", action: can("shipments.manage") ? "Plan a new shipment" : "Review return", urgency: "high" } : null;
    case "READY": return any(can, ["shipments.dispatch", "shipments.manage"]) ? { ...base, queue: "readyForShipment", action: can("shipments.dispatch") ? "Dispatch shipment" : "Open shipment", urgency: "normal" } : null;
    default: return null;
  }
}

/* ------------------------- Needs attention (Phase 6) ------------------------- */
const ATTENTION_ACTIONS: Record<string, string> = localizedMap({
  BLOCKED_STAGE: "Resolve blocker", DELAYED_STAGE: "Review overdue stage", OVERDUE_JOB: "Review overdue job", OVERDUE_ORDER: "Review overdue order", FAILED_QC: "Review QC failure", OPEN_REWORK: "Follow up rework",
  PAYMENT_BLOCK: "Verify payment", COMMERCIAL_REAPPROVAL_REQUIRED: "Re-approve commercial terms", UNASSIGNED_READY_STAGE: "Assign staff", APPROACHING_DEADLINE: "Check approaching deadline",
  SHIPMENT_FAILED: "Handle failed delivery", DELIVERY_DELAY: "Chase delayed delivery", PACKAGING_DELAY: "Check packaging",
});
export const attentionAction = (type: string) => ATTENTION_ACTIONS[type] ?? "Open";
/** Which permission lets someone ACT on an attention category (the backend lets management readers SEE all of them). */
const ATTENTION_ACT: Record<string, string[]> = {
  BLOCKED_STAGE: ["factory_jobs.manage", "jobs.assign"], DELAYED_STAGE: ["factory_jobs.manage", "jobs.assign"], OVERDUE_JOB: ["factory_jobs.manage", "jobs.assign"], UNASSIGNED_READY_STAGE: ["jobs.assign", "factory_jobs.manage"],
  FAILED_QC: ["qc.manage", "rework.manage", "factory_jobs.manage"], OPEN_REWORK: ["rework.manage", "factory_jobs.manage"], PACKAGING_DELAY: ["packaging.manage", "factory_jobs.manage"],
  SHIPMENT_FAILED: ["shipments.manage", "shipments.dispatch", "shipments.complete"], DELIVERY_DELAY: ["shipments.manage", "shipments.dispatch", "orders.manage"],
  PAYMENT_BLOCK: ["payments.read", "orders.commercial.read"], COMMERCIAL_REAPPROVAL_REQUIRED: ["quotations.create", "orders.commercial.read"], OVERDUE_ORDER: ["orders.read"], APPROACHING_DEADLINE: ["orders.read", "factory_jobs.manage"],
};
export function classifyAttention(a: AttentionItem, can: Can = () => true): QueueItem | null {
  const href = attentionHref(a);
  if (!href || !any(can, ATTENTION_ACT[a.type])) return null;
  return { id: `attention:${a.type}:${a.entityId ?? a.reference ?? a.title}`, queue: "attention", kind: "attention", ref: a.reference ?? "", title: a.title, status: a.type, action: attentionAction(a.type), href, urgency: a.severity === "CRITICAL" ? "critical" : a.severity === "WARNING" ? "high" : "normal", since: a.ageMinutes != null ? new Date(Date.now() - a.ageMinutes * 60_000).toISOString() : null, dueAt: a.dueAt ?? null };
}

/* -------------------------------- ranking ------------------------------- */
const URGENCY_BASE: Record<Urgency, number> = { critical: 300, high: 200, normal: 100 };
const ATTENTION_WEIGHT = 70;
const DAY = 86_400_000;
/**
 * Deterministic priority (no scoring engine): urgency first (critical > high > normal), then the queue's weight, then how long the
 * item has been waiting (capped at 30 days), then older / reference for a stable order. Attention items use backend severity.
 */
export function priorityScore(i: QueueItem, now = Date.now()): number {
  const weight = i.queue === "attention" ? ATTENTION_WEIGHT : QUEUES[i.queue].weight;
  // waiting time only breaks ties inside a tier: it is capped below the smallest gap between queue weights
  const waited = i.since ? (Math.min(30, Math.max(0, (now - new Date(i.since).getTime()) / DAY)) / 30) * 4.9 : 0;
  return URGENCY_BASE[i.urgency] + weight + waited;
}
/** Deterministic ordering (see priorityScore). Does NOT drop anything: queue counts must stay exact. */
export function rankItems(items: QueueItem[], now = Date.now()): QueueItem[] {
  return [...items].sort((a, b) => priorityScore(b, now) - priorityScore(a, now) || (a.since ?? "").localeCompare(b.since ?? "") || a.ref.localeCompare(b.ref));
}

/** Within one queue, a shipment is its own action; everything else is identified by where it opens. */
const queueKey = (i: QueueItem) => (i.kind === "shipment" ? i.id : i.href);
/** "What to do next" lists one action per destination: opening that page is the action, whichever monitor raised it first. */
export function uniqueByDestination(items: QueueItem[]): QueueItem[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.href) ? false : (seen.add(i.href), true)));
}

export type Filter = "all" | "urgent" | "commercial" | "production" | "delivery";
export const FILTERS: Array<{ value: Filter; label: string }> = [{ value: "all", label: "All" }, { value: "urgent", label: "Urgent" }, { value: "commercial", label: "Commercial" }, { value: "production", label: "Production" }, { value: "delivery", label: "Delivery" }];
export function matchesFilter(i: QueueItem, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "urgent") return i.urgency !== "normal";
  const group: Group | undefined = i.queue === "attention" ? undefined : QUEUES[i.queue].group;
  return group === f;
}

export function groupByQueue(items: QueueItem[]): Record<QueueKey, QueueItem[]> {
  const out = Object.fromEntries(QUEUE_ORDER.map((k) => [k, [] as QueueItem[]])) as Record<QueueKey, QueueItem[]>;
  const seen = new Set<string>();
  for (const i of items) {
    if (i.queue === "attention") continue;
    const key = `${i.queue}|${queueKey(i)}`; // an order and its own planned job point at the same place: one row
    if (seen.has(key)) continue;
    seen.add(key);
    out[i.queue].push(i);
  }
  return out;
}
