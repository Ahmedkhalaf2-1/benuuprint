/** Shapes from the live OpenAPI + live responses (2026-10-21/22). */
export const ORDER_STATUSES = [
  "DRAFT", "PENDING_CONFIRMATION", "CONFIRMED", "READY_FOR_PRODUCTION", "IN_PRODUCTION", "PARTIALLY_COMPLETED", "PRODUCTION_COMPLETED",
  "READY_FOR_PACKAGING", "PACKAGING", "READY_FOR_DELIVERY", "PARTIALLY_SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "ON_HOLD", "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type OrderPriority = (typeof PRIORITIES)[number];
export type PaymentState = "UNPAID" | "PARTIALLY_PAID" | "PAID";
export type BatchStatus = "PLANNED" | "READY" | "IN_PRODUCTION" | "PARTIALLY_COMPLETED" | "COMPLETED" | "ON_HOLD" | "CANCELLED";

export interface OrderParty { id: string; name: string; number: string | null }

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  priority: OrderPriority;
  customer: OrderParty;
  brand: OrderParty;
  sampleNumber: string;
  reorderOfOrderNumber: string | null;
  totalQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  progressPercent: number;
  revisionNumber: number;
  targetDeliveryDate: string | null;
  assignedSalesUserId: string | null;
  isDelayed: boolean;
  paymentState: PaymentState;
  createdAt: string;
}

export interface OrderVariant {
  id: string;
  sizeOptionId: string | null;
  sizeName: string | null;
  customSizeName: string | null;
  fabricColorId: string | null;
  colorName: string | null;
  customColorName: string | null;
  pantone: string | null;
  hex: string | null;
  /** e.g. "Black / M" */
  label: string;
  quantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  /** Units already placed in non-cancelled batches. */
  allocatedQuantity: number;
  notes: string | null;
}

export interface OrderItem {
  id: string;
  productName: string;
  productTypeId: string | null;
  quantity: number;
  /** Sum of the variant quantities (server-computed). */
  variantTotal: number;
  notes: string | null;
  variants: OrderVariant[];
}

export interface BatchAllocation { orderVariantId: string; label: string; quantity: number }

export interface OrderJobSummary {
  id: string;
  jobNumber: string;
  sourceType: "SAMPLE_PRODUCTION" | "BULK_ORDER" | "ORDER_BATCH";
  status: string;
  orderBatchId: string | null;
  batchNumber: string | null;
  plannedQuantity: number | null;
  completedQuantity: number;
  rejectedQuantity: number;
}

export interface OrderBatch {
  id: string;
  batchNumber: string;
  orderId: string;
  status: BatchStatus;
  quantity: number;
  targetStartDate: string | null;
  targetCompletionDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  holdReason: string | null;
  cancelReason: string | null;
  allocations: BatchAllocation[];
  job: OrderJobSummary | null;
  createdAt: string;
}

export interface StageProgress { stageCode: string; stageName: string; status: string; required: number | null; accounted: number | null; isDelayed: boolean }
export interface JobProgress {
  jobId: string;
  jobNumber: string;
  status: string;
  batchNumber: string | null;
  plannedQuantity: number | null;
  completedQuantity: number;
  rejectedQuantity: number;
  currentStage: StageProgress | null;
  activeStages: StageProgress[];
  blockedStages: StageProgress[];
  delayedStages: StageProgress[];
}

export interface ProductionSummary {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  totalQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  /** Units currently sent back by QC/admins and not yet redone. */
  reworkQuantity: number;
  reworkFlaggedQuantity: number;
  remainingQuantity: number;
  /** Units through the final stage ÷ units that can still be delivered. Server-computed. */
  progressPercent: number;
  targetDeliveryDate: string | null;
  isPastTargetDate: boolean;
  batches: OrderBatch[];
  jobs: JobProgress[];
  activeStages: StageProgress[];
  blockedStages: StageProgress[];
  delayedStages: StageProgress[];
  currentStage: StageProgress | null;
}

export interface ApprovedReference { id: string; revision: number; kind: "APPROVED_REFERENCE"; specHash: string; sourceFactoryJobId: string | null; sourceFactoryJobNumber: string | null; createdAt: string }
export interface OrderSpecSummary { id: string; revision: number; totalQuantity: number; specHash: string; createdAt: string }

export interface OrderActivity {
  id: string;
  type: string;
  message: string;
  actorUserId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrderRevision {
  id: string;
  revisionNumber: number;
  reason: string;
  previousSnapshot: Record<string, unknown>;
  specId: string;
  createdByUserId: string;
  /** Changed commercially relevant data: quotations accepted before it no longer apply. */
  commercialImpact: boolean;
  commercialChanges: string[];
  createdAt: string;
}

export interface OrderFulfillment { deliveredQuantity: number; inFlightQuantity: number; shippableQuantity: number; remainingDeliveryQuantity: number; packagingDefined: boolean; packedQuantity: number; packagingComplete: boolean; trackingEnabled: boolean }

export interface OrderDetail extends OrderListItem {
  sourceSampleId: string;
  sampleRevision: number;
  approvedReference: ApprovedReference;
  /** The frozen order specification in force (set at confirmation). */
  currentSpec: OrderSpecSummary | null;
  reorderOfOrderId: string | null;
  confirmedAt: string | null;
  productionStartDate: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  holdReason: string | null;
  internalNotes: string | null;
  items: OrderItem[];
  batches: OrderBatch[];
  factoryJobs: OrderJobSummary[];
  productionSummary: ProductionSummary;
  fulfillment: OrderFulfillment;
  shipments: Array<{ id: string; shipmentNumber: string; status: string; quantity: number; dispatchedAt: string | null; deliveredAt: string | null }>;
  recentActivities: OrderActivity[];
}

/* ---- request bodies ---- */
export interface VariantInput {
  id?: string;
  sizeOptionId?: string;
  customSizeName?: string;
  fabricColorId?: string;
  customColorName?: string;
  pantone?: string;
  hex?: string;
  quantity: number;
  notes?: string;
}
export interface ItemInput { id?: string; quantity: number; notes?: string; variants: VariantInput[] }

/** Frozen order specification (one per confirmed revision): what the factory is committed to. */
export interface OrderSpecVariant { variantId: string; size: { code: string; name: string } | null; color: { name: string; hex: string | null; pantone: string | null } | null; quantity: number; notes: string | null }
export interface OrderSpec {
  id: string;
  revision: number;
  approvedProductionSpecId: string;
  totalQuantity: number;
  specHash: string;
  snapshot: {
    schemaVersion: number;
    totalQuantity: number;
    order: { priority: string; revision: number; orderNumber: string; targetDeliveryDate: string | null; reorderOfOrderNumber: string | null };
    reference: { revision: number; specHash: string; sampleNumber: string; sourceFactoryJobNumber: string | null; approvedProductionSpecId: string };
    items: Array<{ itemId: string; productName: string; quantity: number; notes: string | null; variants: OrderSpecVariant[] }>;
  };
  createdAt: string;
}
