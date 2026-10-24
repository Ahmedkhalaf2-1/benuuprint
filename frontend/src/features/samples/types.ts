/** Shapes verified against the live OpenAPI + live responses (2026-10-21). */
export const SAMPLE_STATUSES = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "QUOTED", "AWAITING_PAYMENT", "READY_FOR_PRODUCTION", "IN_PRODUCTION",
  "AWAITING_APPROVAL", "APPROVED", "COMPLETED", "ON_HOLD", "REJECTED", "CANCELLED",
] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const PAYMENT_STATES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export const FIT_METHODS = ["BENUE_PATTERN", "COPY_CUSTOMER_PIECE", "CUSTOM_SIZE_CHART", "NOT_SURE"] as const;
export type FitMethod = (typeof FIT_METHODS)[number];

export const FABRIC_PROVIDERS = ["CUSTOMER", "BENUE_PRINT", "NOT_DECIDED"] as const;
export type FabricProvider = (typeof FABRIC_PROVIDERS)[number];

export const DECORATION_SIDES = ["FRONT", "BACK", "LEFT_SLEEVE", "RIGHT_SLEEVE", "OTHER"] as const;
export const DECORATION_UNITS = ["CM", "MM", "IN"] as const;

/** Attachment types accepted on a sample (AttachSampleAssetDto). */
export const SAMPLE_ATTACHMENT_TYPES = ["REFERENCE", "MOCKUP", "SIZE_CHART", "ARTWORK", "OTHER"] as const;
export type SampleAttachmentType = (typeof SAMPLE_ATTACHMENT_TYPES)[number];

export const ARTWORK_PURPOSES = ["FRONT_PRINT", "BACK_PRINT", "EMBROIDERY", "LABEL", "PACKAGING", "GENERAL_REFERENCE", "OTHER"] as const;
export type ArtworkPurpose = (typeof ARTWORK_PURPOSES)[number];

export interface Ref { id: string; code: string; name: string }

export interface SampleListItem {
  id: string;
  sampleNumber: string;
  status: SampleStatus;
  paymentState: PaymentState;
  revisionNumber: number;
  customer: { id: string; customerNumber: string; displayName: string };
  brand: { id: string; brandNumber: string; name: string };
  productType: Ref | null;
  customProductName: string | null;
  fabric: Ref | null;
  customFabricName: string | null;
  assignedSales: { id: string; name: string } | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface SampleDecoration {
  id: string;
  printMethod: Ref;
  placement: string;
  side: string;
  /** Decimal strings. */
  width: string | null;
  height: string | null;
  unit: string | null;
  colorCount: number | null;
  notes: string | null;
  artworkRequired: boolean;
  artworkId: string | null;
  sortOrder: number;
}

export interface SampleAccessory {
  id: string;
  accessory: Ref | null;
  customName: string | null;
  quantity: number | null;
  notes: string | null;
  sortOrder: number;
}

export interface SampleComponent {
  id: string;
  componentOption: Ref | null;
  category: string | null;
  customName: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface SampleAttachment {
  attachmentId: string;
  assetId: string;
  type: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface TermsAcceptance {
  id: string;
  termsVersionId: string;
  code: string;
  version: number;
  title: string;
  mode: string;
  sourceNote: string | null;
  acceptedAt: string;
}

export interface SampleDetail extends SampleListItem {
  holdPreviousStatus: SampleStatus | null;
  revisionOfId: string | null;
  customProductDescription: string | null;
  customFabricDescription: string | null;
  fabricColor: { id: string; name: string; hex?: string | null } | null;
  customColorName: string | null;
  customPantone: string | null;
  customHex: string | null;
  fabricProvider: FabricProvider;
  gsm: number | null;
  sampleSize: { id: string; code: string; name: string; scaleCode?: string } | null;
  fitMethod: FitMethod;
  patternVersion: { id: string; versionNumber: number; status: string; patternId: string; patternCode: string; patternReference: string; patternName: string } | null;
  notes: string | null;
  fitNotes: string | null;
  printNotes: string | null;
  fabricNotes: string | null;
  specialInstructions: string | null;
  /** Internal manufacturing instructions: never customer-facing. */
  factoryInstructions: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  decorations: SampleDecoration[];
  accessories: SampleAccessory[];
  components: SampleComponent[];
  attachments: SampleAttachment[];
  termsAcceptances: TermsAcceptance[];
  /** Computed by the backend from status + the caller's permissions: the frontend does not run its own state machine. */
  allowedActions: string[];
}

export interface StatusHistoryEntry {
  id: string;
  sampleId: string;
  fromStatus: string | null;
  toStatus: string;
  action: string;
  reason: string | null;
  actorUserId: string | null;
  source: "STAFF" | "SYSTEM";
  createdAt: string;
}

export interface SampleNote {
  id: string;
  visibility: "INTERNAL" | "CUSTOMER_VISIBLE";
  content: string;
  authorUserId: string;
  authorName: string;
  createdAt: string;
}

export type ApprovalType = "QUOTATION" | "ARTWORK" | "SAMPLE" | "PRODUCTION_SPEC";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";
export interface Approval {
  id: string;
  type: ApprovalType;
  sampleId: string;
  quotationVersionId: string | null;
  artworkVersionId: string | null;
  productionSpecId: string | null;
  status: ApprovalStatus;
  mode: "CUSTOMER_AUTHENTICATED" | "STAFF_RECORDED_ON_BEHALF" | "STAFF_INTERNAL" | null;
  staffRecorded: boolean;
  requestedByUserId: string;
  requestedAt: string;
  expiresAt: string | null;
  respondedAt: string | null;
  respondedByUserId: string | null;
  responseNote: string | null;
  sourceNote: string | null;
  createdAt: string;
}

export interface ArtworkAsset {
  id: string;
  type?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface ArtworkVersion {
  id: string;
  artworkId: string;
  versionNumber: number;
  status: "DRAFT" | "APPROVED" | "SUPERSEDED" | "REJECTED";
  asset: ArtworkAsset | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  supersededAt: string | null;
}
export interface Artwork {
  id: string;
  brandId: string | null;
  sampleId: string | null;
  name: string;
  purpose: ArtworkPurpose;
  approvedVersionId: string | null;
  versions: ArtworkVersion[];
  createdAt: string;
  archivedAt: string | null;
}

export interface ProductionSpec {
  id: string;
  sampleId: string;
  revision: number;
  kind: "PRE_PRODUCTION" | "APPROVED_REFERENCE";
  sourceFactoryJobId: string | null;
  specHash: string;
  schemaVersion: number;
  approvalId: string | null;
  /** Frozen, self-contained specification. Rendered read-only. */
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface CommercialSummary {
  sampleId: string;
  sampleNumber: string;
  currency: string | null;
  quotation: { quotationId: string; quotationNumber: string; versionId: string; versionNumber: number | null; status: string; total: string } | null;
  quotedTotal: string | null;
  acceptedTotal: string | null;
  verifiedPaid: string;
  pendingPayments: string;
  remaining: string | null;
  paymentState: PaymentState;
  /** Order summaries return these; a sample summary may not, so they are only shown when present. */
  overpaid?: string;
  reapprovalRequired?: boolean;
  /** Orders only: whether the commercial conditions for production release are met. */
  releaseGate?: { requireAcceptedQuotation: boolean; requiredPaidPercent: number; requiredPaidAmount: string | null; satisfied: boolean; reasons: string[] };
  counts: { verified: number; pending: number; rejected: number; cancelled: number };
}

export interface Terms {
  id: string;
  code: string;
  version: number;
  title: string;
  content: string;
  effectiveAt?: string;
  isActive?: boolean;
  createdAt?: string;
}

/** Sample-production factory job, from GET /admin/factory-jobs (needs jobs.read_all). */
export interface FactoryJobSummary {
  id: string;
  jobNumber: string;
  sourceType: string;
  status: string;
  priority: string;
  sampleNumber: string | null;
  progress: unknown;
  startedAt: string | null;
  completedAt: string | null;
  targetCompletionDate: string | null;
}

export interface StaffUser { id: string; name: string; email: string; status: string; roles?: Array<{ code?: string; name?: string } | string> }
