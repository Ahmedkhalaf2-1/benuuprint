/** Semantic tones; each maps to --tone-* tokens. */
export type Tone = "neutral" | "progress" | "review" | "ready" | "success" | "warning" | "blocked" | "danger";

export const toneClasses: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: "bg-tone-neutral-bg text-tone-neutral-fg", dot: "bg-tone-neutral-dot" },
  progress: { badge: "bg-tone-progress-bg text-tone-progress-fg", dot: "bg-tone-progress-dot" },
  review: { badge: "bg-tone-review-bg text-tone-review-fg", dot: "bg-tone-review-dot" },
  ready: { badge: "bg-tone-ready-bg text-tone-ready-fg", dot: "bg-tone-ready-dot" },
  success: { badge: "bg-tone-success-bg text-tone-success-fg", dot: "bg-tone-success-dot" },
  warning: { badge: "bg-tone-warning-bg text-tone-warning-fg", dot: "bg-tone-warning-dot" },
  blocked: { badge: "bg-tone-blocked-bg text-tone-blocked-fg", dot: "bg-tone-blocked-dot" },
  danger: { badge: "bg-tone-danger-bg text-tone-danger-fg", dot: "bg-tone-danger-dot" },
};

/** Single mapping for every domain status in the backend. Unknown codes fall back to neutral. */
export const statusTone: Record<string, Tone> = {
  DRAFT: "neutral",
  PENDING: "neutral",
  PLANNED: "neutral",
  WAITING: "neutral",
  SUBMITTED: "review",
  UNDER_REVIEW: "review",
  AWAITING_APPROVAL: "review",
  AWAITING_PAYMENT: "warning",
  ON_HOLD: "warning",
  READY: "ready",
  CONFIRMED: "ready",
  APPROVED: "success",
  IN_PROGRESS: "progress",
  IN_PRODUCTION: "progress",
  PARTIALLY_COMPLETED: "progress",
  PARTIALLY_SHIPPED: "progress",
  IN_TRANSIT: "progress",
  DISPATCHED: "progress",
  BLOCKED: "blocked",
  COMPLETED: "success",
  DELIVERED: "success",
  FAILED: "danger",
  REJECTED: "danger",
  CANCELLED: "neutral",
  RETURNED: "warning",
  SUPERSEDED: "neutral",
  ACTIVE: "success",
  LEAD: "review",
  INACTIVE: "neutral",
  ARCHIVED: "neutral",
  // customer-facing sample statuses (the backend projection)
  QUOTATION_READY: "ready",
  PAYMENT_REQUIRED: "warning",
  IN_SAMPLE_PRODUCTION: "progress",
  AWAITING_CUSTOMER_APPROVAL: "review",
  CHANGES_REQUESTED: "warning",
  // samples
  QUOTED: "review",
  READY_FOR_PRODUCTION: "ready",
  // quotations / payments
  SENT: "progress",
  ACCEPTED: "success",
  VERIFIED: "success",
  // payment state
  UNPAID: "warning",
  PARTIALLY_PAID: "progress",
  PAID: "success",
  // approvals / versions
  EXPIRED: "neutral",
};

/** Non-colour cue so status never relies on colour alone: a distinct dot shape per tone group. */
export type DotShape = "solid" | "ring" | "square" | "diamond";
export const toneShape: Record<Tone, DotShape> = {
  neutral: "ring",
  progress: "solid",
  review: "solid",
  ready: "solid",
  success: "solid",
  warning: "square",
  blocked: "diamond",
  danger: "diamond",
};
