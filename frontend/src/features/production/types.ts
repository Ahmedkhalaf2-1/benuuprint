/** Shapes verified against the live OpenAPI + live responses (2026-10-22). */
export const STAGE_STATUSES = ["WAITING", "READY", "IN_PROGRESS", "BLOCKED", "COMPLETED", "SKIPPED", "FAILED", "CANCELLED"] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];
export const JOB_STATUSES = ["PLANNED", "READY", "IN_PROGRESS", "BLOCKED", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type SourceType = "SAMPLE_PRODUCTION" | "BULK_ORDER" | "ORDER_BATCH";
export const BLOCKER_TYPES = ["WAITING_FOR_CUSTOMER", "MATERIAL_UNAVAILABLE", "ARTWORK_ISSUE", "PATTERN_REVISION", "MACHINE_MAINTENANCE", "PAYMENT_PENDING", "SUPPLIER_DELAY", "QUALITY_ISSUE", "STAFFING", "OTHER"] as const;
export type BlockerType = (typeof BLOCKER_TYPES)[number];

export interface Party { id: string; name: string; number: string | null }
export interface Assignee { assignmentId: string; userId: string; name: string; isPrimary: boolean; context: string | null; assignedAt: string }

export interface JobStage {
  id: string;
  jobId: string;
  stageCode: string;
  stageName: string;
  departmentType: string;
  sequence: number;
  /** 1 for the original run; rework adds 2, 3… */
  attempt: number;
  status: StageStatus;
  isRequired: boolean;
  isQcStage: boolean;
  requiresAssignment: boolean;
  requiresCompletionNote: boolean;
  requiresAttachment: boolean;
  /** Replaced by a newer occurrence after rework (kept as history). */
  superseded: boolean;
  dependsOnStageIds: string[];
  readyAt: string | null;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  isDelayed: boolean;
  isOnHold: boolean;
  holdReason: string | null;
  blockedAt: string | null;
  blockReason: string | null;
  completionNote: string | null;
  reworkRecordId: string | null;
  assignees: Assignee[];
}

export interface JobListItem {
  id: string;
  jobNumber: string;
  sourceType: SourceType;
  status: JobStatus;
  priority: Priority;
  sampleNumber: string | null;
  orderId: string | null;
  orderNumber: string | null;
  orderBatchId: string | null;
  batchNumber: string | null;
  plannedQuantity: number | null;
  completedQuantity: number;
  rejectedQuantity: number;
  customer: Party;
  brand: Party;
  productName: string;
  workflowCode: string;
  workflowVersion: number;
  targetCompletionDate: string | null;
  progress: { completedStages?: number; totalStages?: number } & Record<string, unknown>;
  delayedStages: number;
  openBlockers: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface JobDetail extends JobListItem {
  sampleId: string | null;
  sampleProductionSpecId: string;
  specRevision: number;
  specHash: string;
  assignedSalesUserId: string | null;
  requestedStartDate: string | null;
  holdReason: string | null;
  heldAt: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  internalNotes: string | null;
  stages: JobStage[];
}

export interface BoardCard {
  stageId: string;
  jobId: string;
  jobNumber: string;
  productName: string;
  brandName: string;
  customerName: string;
  priority: Priority;
  status: StageStatus;
  attempt: number;
  isDelayed: boolean;
  isOnHold: boolean;
  dueAt: string | null;
  readyAt: string | null;
  startedAt: string | null;
  blockReason: string | null;
  assignees: Assignee[];
}
export interface BoardColumn { stageCode: string; stageName: string; departmentType: string; sequence: number; counts: Record<string, number>; total: number; cards: BoardCard[] }
export interface Board { columns: BoardColumn[]; meta?: { page: number; pageSize: number; total: number } }

export interface Blocker {
  id: string;
  jobId: string;
  jobStageId: string | null;
  stageName: string | null;
  type: BlockerType;
  description: string;
  status: "OPEN" | "RESOLVED" | "CANCELLED";
  createdByUserId: string;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface JobNote { id: string; jobId: string; jobStageId: string | null; visibility: "INTERNAL"; content: string; authorUserId: string; authorName: string; createdAt: string }

/** JobActivity: the operational timeline (not the security audit log). */
export interface Activity { id: string; type: string; message: string; jobStageId: string | null; actorUserId: string | null; actorName: string | null; metadata: Record<string, unknown> | null; createdAt: string }

export type QcResultType = "PASS_FAIL" | "TEXT" | "NUMBER" | "MEASUREMENT" | "PHOTO_REQUIRED";
export interface QcResult {
  itemId: string;
  itemCode: string;
  label: string;
  resultType: QcResultType;
  required: boolean;
  result: "PASS" | "FAIL" | "NA" | null;
  numericValue: number | string | null;
  textValue: string | null;
  notes: string | null;
  /** Template item config (e.g. min / max / unit / photos needed), when the backend includes it. */
  config?: Record<string, unknown> | null;
  description?: string | null;
}
export interface QcInspection {
  id: string;
  jobId: string;
  jobStageId: string;
  stageName: string;
  templateCode: string;
  templateVersion: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  overallResult: "PASS" | "FAIL" | "CONDITIONAL_PASS" | null;
  inspectorUserId: string;
  inspectorName: string;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  photoCount: number;
  results: QcResult[];
  reworkId?: string | null;
  inspectedQuantity: number | null;
  passedQuantity: number | null;
  failedQuantity: number | null;
}

export interface Rework {
  id: string;
  jobId: string;
  failedStageId: string;
  qcInspectionId: string | null;
  targetStageCode: string;
  targetStageName: string;
  reason: string;
  /** Units sent back (bulk jobs); null for sample production. */
  affectedQuantity: number | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  newStageIds: string[];
  createdByUserId: string;
  createdAt: string;
  resolvedAt: string | null;
}

export type StaffAction = "START" | "COMPLETE" | "RAISE_BLOCKER" | "START_QC" | "ADD_NOTE" | "ATTACH_FILE";
export interface StageFile { attachmentId: string; assetId: string; type: string; originalName: string; mimeType: string; sizeBytes: number; description: string | null; createdAt: string }
export interface StageQuantity { required: number; produced: number; rejected: number; reworkFlagged: number; remaining: number; reworkAffectedQuantity: number | null }
export interface StageReport { id: string; jobStageId: string; producedQuantity: number; rejectedQuantity: number; reworkQuantity: number; orderVariantId: string | null; notes: string | null; reportedByUserId: string; reportedByName: string | null; createdAt: string }
export interface StageReports { quantity: StageQuantity; reports: StageReport[] }

export interface StaffJobSummary { id: string; jobNumber: string; productName: string; brandName: string; priority: Priority; status: JobStatus; targetCompletionDate: string | null }
export interface StaffStageListItem extends JobStage { job: StaffJobSummary }
export interface StaffJobListItem { id: string; jobNumber: string; productName: string; brandName: string; priority: Priority; status: JobStatus; targetCompletionDate: string | null; myStages: StaffStageListItem[] }

/** Task view built by the backend from the frozen spec: its keys differ per department, so it is rendered generically. */
export type TaskView = Record<string, unknown>;
export interface OrderViewVariant { variantId: string; size: { code: string; name: string } | null; color: { name: string; hex: string | null } | null; quantity: number; notes: string | null }
/** Bulk jobs: what the order asks for (no prices, no customer contact). */
export interface OrderView { orderNumber: string; plannedQuantity: number; batch: boolean; items: Array<{ productName: string; notes: string | null; variants: OrderViewVariant[] }> }
export const variantLabel = (v: OrderViewVariant) => [v.color?.name, v.size?.name].filter(Boolean).join(" / ") || "Variant";
export interface StaffStageDetail {
  stage: JobStage;
  job: StaffJobSummary;
  taskView: TaskView;
  /** What the backend allows THIS caller to do now: the UI shows exactly these. */
  allowedActions: StaffAction[];
  blockers: Blocker[];
  notes: JobNote[];
  files: StageFile[];
  /** Bulk jobs only. */
  quantity: StageQuantity | null;
  orderView: OrderView | null;
  qcInspection: QcInspection | null;
}

export interface StageDefinition { id: string; code: string; name: string; description: string | null; departmentType: string; defaultSequence: number; expectedDurationMinutes: number | null; requiresAssignment: boolean; requiresCompletionNote: boolean; requiresAttachment: boolean; isQcStage: boolean; eligibleRoleCodes: string[]; isActive: boolean }
