import { humanizeCode } from "@/lib/utils/format";

const STATUS: Record<string, string> = { READY: "Ready to start", WAITING: "Waiting", PENDING: "Waiting", IN_PROGRESS: "In progress", COMPLETED: "Completed", BLOCKED: "Blocked", SKIPPED: "Skipped", CANCELLED: "Cancelled", ON_HOLD: "On hold", PLANNED: "Planned" };
export const statusLabel = (s: string | null | undefined) => (s ? STATUS[s] ?? humanizeCode(s) : "—");

export const SOURCE_LABEL: Record<string, string> = { GLOBAL_DEFAULT: "Factory default", CUSTOMER_OVERRIDE: "Customer override", MANUAL: "Manual assignment", UNASSIGNED: "Unassigned" };
export const sourceLabel = (s: string | null | undefined) => (s ? SOURCE_LABEL[s] ?? humanizeCode(s) : "Unassigned");

export const REASON_TEXT: Record<string, string> = { ASSIGNEE_DISABLED: "is no longer available", ASSIGNEE_INELIGIBLE: "no longer holds the role this area needs" };

/** Presentation grouping of backend stage keys. Unknown keys fall under Production; the backend only distinguishes FACTORY / FULFILLMENT. */
const PRE = ["FABRIC_PREPARATION", "PATTERN_MAKING"];
export type AreaGroup = "PRE_PRODUCTION" | "PRODUCTION" | "FULFILLMENT";
export const GROUP_TITLE: Record<AreaGroup, string> = { PRE_PRODUCTION: "Pre-production", PRODUCTION: "Production", FULFILLMENT: "Fulfillment" };
export const groupOf = (a: { stageKey: string; group: string }): AreaGroup => (a.group === "FULFILLMENT" ? "FULFILLMENT" : PRE.includes(a.stageKey) ? "PRE_PRODUCTION" : "PRODUCTION");
export function groupAreas<T extends { stageKey: string; group: string }>(items: T[]): Array<{ group: AreaGroup; items: T[] }> {
  return (Object.keys(GROUP_TITLE) as AreaGroup[]).map((g) => ({ group: g, items: items.filter((i) => groupOf(i) === g) })).filter((g) => g.items.length);
}

/** Time of day for same-day events, date + time otherwise. */
export function clock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
