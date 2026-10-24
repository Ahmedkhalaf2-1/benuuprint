import { StatusBadge } from "@/components/data-display/status-badge";

/** The backend already sends a customer-safe status and label; this only picks the badge colour. */
export function CustomerStatus({ status, label }: { status: string; label: string }) {
  return <StatusBadge status={status} label={label} />;
}

/** Statuses where the customer is the one expected to act (shown on the dashboard; actions arrive in Phase 7B). */
export const AWAITING_CUSTOMER = ["QUOTATION_READY", "PAYMENT_REQUIRED", "AWAITING_CUSTOMER_APPROVAL", "CHANGES_REQUESTED"] as const;
export const IN_PROGRESS = ["SUBMITTED", "UNDER_REVIEW", "PAYMENT_UNDER_REVIEW", "IN_SAMPLE_PRODUCTION", "REVISION_REQUESTED"] as const;

/**
 * Contextual call to action on list rows. The list payload has no `allowedActions`, so this follows the backend's customer status
 * projection (it is only a label: the actual actions on the detail page are decided by `allowedActions`).
 */
export function rowCta(status: string, editable: boolean): string {
  if (editable) return "Continue editing";
  switch (status) {
    case "QUOTATION_READY": return "Review quotation";
    case "PAYMENT_REQUIRED": return "Upload payment proof";
    case "IN_SAMPLE_PRODUCTION": return "Track production";
    case "AWAITING_CUSTOMER_APPROVAL": return "Review sample";
    default: return "View sample";
  }
}

/* ---- orders ---- */
export const ORDER_AWAITING = ["DRAFT", "QUOTATION_READY", "PAYMENT_REQUIRED"] as const;
export const ORDER_IN_PRODUCTION = ["READY_FOR_PRODUCTION", "IN_PRODUCTION", "PACKAGING", "READY_TO_SHIP"] as const;
export const ORDER_IN_DELIVERY = ["PARTIALLY_SHIPPED", "SHIPPED"] as const;
export const ORDER_CLOSED = ["DELIVERED", "COMPLETED", "CANCELLED"] as const;

/** A label only: the list has no `allowedActions`, so this follows the backend's status projection. The detail page's buttons come from `allowedActions`. */
export function orderRowCta(status: string): string {
  switch (status) {
    case "DRAFT": return "Continue editing";
    case "QUOTATION_READY": return "Review quotation";
    case "PAYMENT_REQUIRED": return "Upload payment proof";
    case "READY_FOR_PRODUCTION": case "IN_PRODUCTION": case "PACKAGING": case "READY_TO_SHIP": return "Track production";
    case "PARTIALLY_SHIPPED": case "SHIPPED": return "Track shipment";
    case "DELIVERED": case "COMPLETED": return "Reorder";
    default: return "View order";
  }
}
