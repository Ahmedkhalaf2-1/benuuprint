/** Shapes from the live OpenAPI + live responses (2026-10-21). Money is always a decimal STRING. */
export const QUOTATION_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "SUPERSEDED"] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const LINE_TYPES = ["SAMPLE_FEE", "PATTERN_FEE", "PRINTING", "EMBROIDERY", "DESIGN_SERVICE", "FABRIC", "ACCESSORIES", "PACKAGING", "DISCOUNT_ADJUSTMENT", "OTHER"] as const;
export type LineType = (typeof LINE_TYPES)[number];

export const PAYMENT_METHODS = ["INSTAPAY", "VODAFONE_CASH", "TELDA", "BANK_TRANSFER", "CASH", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "CANCELLED";

export interface QuotationLine {
  id: string;
  type: LineType;
  description: string;
  quantity: string;
  unitPrice: string;
  /** quantity × unit price, calculated by the server. */
  amount: string;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
}

export interface QuotationVersion {
  id: string;
  quotationId: string;
  versionNumber: number;
  status: QuotationStatus;
  currency: string;
  subtotal: string;
  discount: string;
  taxPercent: string;
  tax: string;
  total: string;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  supersededAt: string | null;
  /** Set only for order quotations; kept for the shared type. */
  orderRevision: number | null;
  invalidatedAt: string | null;
  invalidatedByRevision: number | null;
  invalidationReason: string | null;
  lineItems: QuotationLine[];
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  sampleId: string | null;
  orderId: string | null;
  /** Mirrors the live (latest) version. */
  status: QuotationStatus;
  currency: string;
  createdAt: string;
  currentVersion: QuotationVersion | null;
  versions: QuotationVersion[];
}

export interface PaymentProof { assetId: string; originalName: string; mimeType: string; sizeBytes: number }

export interface Payment {
  id: string;
  paymentNumber: string;
  sampleId: string | null;
  orderId: string | null;
  quotationVersionId: string | null;
  amount: string;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string | null;
  /** Metadata only; the file is fetched through the signed download API on click. */
  proof: PaymentProof | null;
  receivedAt: string | null;
  verifiedAt: string | null;
  verifiedByUserId: string | null;
  rejectionReason: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Request line: amounts are sent as numbers with ≤ 2 decimals (the API contract); they come from validated strings. */
export interface LineInput { type: LineType; description: string; quantity: number; unitPrice: number }

/** What a commercial section belongs to. Quotation/payment screens work for both. */
export type CommercialTarget = { kind: "sample" | "order"; id: string };
