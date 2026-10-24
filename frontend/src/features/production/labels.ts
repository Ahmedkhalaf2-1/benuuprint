import { humanizeCode } from "@/lib/utils/format";
import { localizedMap } from "@/i18n/active";

export const ACTIVITY_LABELS: Record<string, string> = localizedMap({
  JOB_CREATED: "Job created", JOB_RELEASED: "Job released", STAGE_READY: "Stage ready", STAGE_ASSIGNED: "Assigned", STAGE_UNASSIGNED: "Unassigned", STAGE_STARTED: "Started",
  STAGE_COMPLETED: "Completed", STAGE_SKIPPED: "Skipped", STAGE_BLOCKED: "Blocked", BLOCKER_RESOLVED: "Blocker resolved", BLOCKER_CANCELLED: "Blocker cancelled", STAGE_HELD: "Stage held",
  STAGE_RESUMED: "Stage resumed", QC_STARTED: "QC started", QC_PASSED: "QC passed", QC_CONDITIONAL_PASS: "QC conditional pass", QC_FAILED: "QC failed", REWORK_CREATED: "Rework created",
  REWORK_RESOLVED: "Rework resolved", JOB_HOLD: "Job on hold", JOB_RESUMED: "Job resumed", JOB_CANCELLED: "Job cancelled", JOB_COMPLETED: "Job completed", PRIORITY_CHANGED: "Priority changed",
  NOTE_ADDED: "Note added", ASSET_ATTACHED: "File attached", ADMIN_OVERRIDE: "Admin override", QUANTITY_REPORTED: "Quantity reported",
});
export const activityLabel = (t: string) => ACTIVITY_LABELS[t] ?? humanizeCode(t);
export const SOURCE_LABELS: Record<string, string> = localizedMap({ SAMPLE_PRODUCTION: "Sample", BULK_ORDER: "Bulk order", ORDER_BATCH: "Order batch" });
export const BLOCKER_LABELS: Record<string, string> = localizedMap({
  WAITING_FOR_CUSTOMER: "Waiting for customer", MATERIAL_UNAVAILABLE: "Material unavailable", ARTWORK_ISSUE: "Artwork issue", PATTERN_REVISION: "Pattern revision", MACHINE_MAINTENANCE: "Machine maintenance",
  PAYMENT_PENDING: "Payment pending", SUPPLIER_DELAY: "Supplier delay", QUALITY_ISSUE: "Quality issue", STAFFING: "Staffing", OTHER: "Other",
});
/** Stage evidence types the staff upload accepts (asset type enum values relevant to the floor). */
export const STAGE_FILE_TYPES = ["STAGE_PHOTO", "PRODUCTION_REFERENCE", "PATTERN_OUTPUT", "PRINT_PROOF", "OTHER"] as const;
