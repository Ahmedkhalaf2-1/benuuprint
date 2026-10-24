import type { CustomerAddress } from "@/features/customers/types";
import type { SampleOptions } from "@/features/master-data/types";

/** Shapes from the live OpenAPI (/customer/*). Customer-safe projections only: no internal status, notes or staff data. */
export type { CustomerAddress, SampleOptions };

export const CUSTOMER_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "QUOTATION_READY", "PAYMENT_REQUIRED", "PAYMENT_UNDER_REVIEW", "IN_SAMPLE_PRODUCTION", "REVISION_REQUESTED", "AWAITING_CUSTOMER_APPROVAL", "APPROVED", "CHANGES_REQUESTED", "CANCELLED"] as const;
export type CustomerSampleStatus = (typeof CUSTOMER_STATUSES)[number];

export interface CustomerIdentity { id: string; customerNumber: string; name: string; email: string }
export interface CustomerMe extends CustomerIdentity { phone: string | null; whatsapp: string | null; accountStatus: string }
export interface CustomerProfile extends CustomerIdentity { phone: string | null; whatsapp: string | null; country: string | null; city: string | null; instagram: string | null; preferredLocale: "en" | "ar" | null }
export type ProfileUpdate = Partial<Pick<CustomerProfile, "phone" | "whatsapp" | "country" | "city" | "instagram" | "preferredLocale">>;
export interface CustomerBrand { id: string; brandNumber: string; name: string; instagram: string | null; website: string | null; description: string | null; primaryColor: string | null; secondaryColor: string | null }

export interface NamedRef { id: string; name: string }
export interface SampleListItem {
  id: string; sampleNumber: string; status: CustomerSampleStatus; statusLabel: string; nextStep: string; editable: boolean;
  brand: NamedRef; productName: string | null; fabricName: string | null; colorName: string | null; submittedAt: string | null; createdAt: string; updatedAt: string;
}
/** What the backend says the customer can do right now (the frontend never re-derives it from the status). */
export const ORDER_ACTIONS = ["EDIT_ORDER", "SUBMIT_ORDER", "ACCEPT_QUOTATION", "REJECT_QUOTATION", "UPLOAD_PAYMENT_PROOF", "REORDER"] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];
export const CUSTOMER_ACTIONS = ["EDIT_REQUEST", "UPLOAD_FILE", "ACCEPT_TERMS", "SUBMIT_REQUEST", "ACCEPT_QUOTATION", "REJECT_QUOTATION", "UPLOAD_PAYMENT_PROOF", "APPROVE_SAMPLE", "REQUEST_CHANGES"] as const;
export type CustomerAction = (typeof CUSTOMER_ACTIONS)[number];
export interface PortalFile { source?: "YOU" | "BENUE_PRINT"; attachmentId: string; assetId: string; type: FileType; originalName: string; mimeType: string; sizeBytes: number; description: string | null; uploadedAt: string }
export const FILE_TYPES = ["REFERENCE", "ARTWORK", "SIZE_CHART", "OTHER"] as const;
export type FileType = (typeof FILE_TYPES)[number];
export interface PortalDecoration { id: string; printMethod: NamedRef; placement: string; side: string; width: string | null; height: string | null; unit: string | null; colorCount: number | null; notes: string | null; artworkRequired: boolean; artwork: { id: string; name: string; versionCount: number } | null }
export interface PortalAccessory { id: string; accessory: NamedRef | null; customName: string | null; quantity: number | null; notes: string | null }
export interface PortalComponent { id: string; componentOption: NamedRef | null; category: string | null; customName: string | null; notes: string | null }
export interface TermsState { required: boolean; accepted: boolean; activeTermsVersionId: string | null; activeVersion: number | null }
export interface SampleDetail extends SampleListItem {
  revisionNumber: number;
  productTypeId: string | null; customProductName: string | null; customProductDescription: string | null;
  fabricId: string | null; customFabricName: string | null; customFabricDescription: string | null; fabricProvider: string | null; gsm: number | null;
  fabricColorId: string | null; customColorName: string | null; customPantone: string | null; customHex: string | null;
  size: NamedRef | null; fitMethod: string | null; pattern: { patternVersionId: string; name: string; fitType: string | null } | null;
  notes: string | null; fitNotes: string | null; printNotes: string | null; fabricNotes: string | null; specialInstructions: string | null;
  decorations: PortalDecoration[]; accessories: PortalAccessory[]; components: PortalComponent[]; files: PortalFile[]; terms: TermsState; allowedActions?: CustomerAction[];
}
export interface SubmissionCheck { ready: boolean; problems: string[] }
export interface PortalTerms { id: string; version: number; title: string; content: string }
export interface ActivityEvent { at: string; status: CustomerSampleStatus; title: string; message: string | null }
export interface PortalMessage { id: string; at: string; from: string; content: string }

/** PATCH body: `null` clears a field (switching catalogue ↔ custom must clear the other side). `factoryInstructions` does not exist here. */
export type SampleBody = Partial<{
  brandId: string;
  productTypeId: string | null; customProductName: string | null; customProductDescription: string | null;
  fabricId: string | null; customFabricName: string | null; customFabricDescription: string | null; fabricColorId: string | null; customColorName: string | null; customPantone: string | null; customHex: string | null;
  fabricProvider: string; gsm: number | null; sampleSizeOptionId: string | null; fitMethod: string; patternVersionId: string | null;
  notes: string | null; fitNotes: string | null; printNotes: string | null; fabricNotes: string | null; specialInstructions: string | null;
}>;

/* ---- 7B: commercial, payment, production, approval ---- */
export type CommercialKind = "sample" | "order";
export type QuotationStatus = "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "SUPERSEDED";
export interface QuotationLine { type: string; description: string; quantity: string; unitPrice: string; amount: string }
export interface QuotationVersion {
  id: string; versionNumber: number; status: QuotationStatus; isCurrent: boolean; actionable: boolean; currency: string; lineItems: QuotationLine[];
  /** Orders only: an order change made this version obsolete (it no longer applies). */ endedByChange?: boolean;
  subtotal: string; discount: string; taxPercent: string; tax: string; total: string; validUntil: string | null; sentAt: string | null; acceptedAt: string | null; rejectedAt: string | null; supersededAt: string | null; notes: string | null;
}
export interface PortalQuotation { id: string; quotationNumber: string; currency: string; status: QuotationStatus; versions: QuotationVersion[] }
export interface PortalQuotations { quotations: PortalQuotation[]; actionableVersionId: string | null; requiresReview: boolean; notice: string | null }
export type PaymentSummaryStatus = "NOT_REQUIRED_YET" | "PAYMENT_REQUIRED" | "PAYMENT_UNDER_REVIEW" | "PAID";
export interface PaymentSummary { status: PaymentSummaryStatus; currency: string | null; requiredAmount: string | null; verifiedAmount: string; pendingAmount: string; remainingAmount: string | null }
export const PAYMENT_METHODS = ["INSTAPAY", "VODAFONE_CASH", "TELDA", "BANK_TRANSFER", "CASH", "OTHER"] as const;
export interface PortalPayment {
  id: string; paymentNumber: string; amount: string; currency: string; method: string; status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "CANCELLED"; transactionReference: string | null; proofFileName: string | null; hasProof: boolean;
  receivedAt: string | null; submittedAt: string; verifiedAt: string | null; /** Only text the team wrote for the customer. */ message: string | null; canReplaceProof: boolean;
}
export interface PortalPayments { summary: PaymentSummary; payments: PortalPayment[] }
export type StepState = "PENDING" | "ACTIVE" | "DONE";
export interface ProductionStep { code: string; label: string; state: StepState }
export interface PortalProduction { phase: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE"; steps: ProductionStep[] }
export interface CommercialSummary {
  sampleId: string;
  quotation: { quotationId: string; quotationNumber: string; versionId: string; versionNumber: number; status: "SENT" | "ACCEPTED"; total: string; currency: string; validUntil: string | null; requiresReview: boolean } | null;
  payment: PaymentSummary; nextAction: "REVIEW_QUOTATION" | "PAY" | "REVIEW_SAMPLE" | "NONE"; allowedActions: CustomerAction[];
}
export const CHANGE_CATEGORIES = ["FIT", "FABRIC", "COLOUR", "ARTWORK", "DECORATION", "CONSTRUCTION", "OTHER"] as const;
export type ChangeCategory = (typeof CHANGE_CATEGORIES)[number];

/* ---- 7C: customer orders ---- */
export const ORDER_STATUSES = ["DRAFT", "PENDING_CONFIRMATION", "QUOTATION_PENDING", "QUOTATION_READY", "PAYMENT_REQUIRED", "PAYMENT_UNDER_REVIEW", "READY_FOR_PRODUCTION", "IN_PRODUCTION", "PACKAGING", "READY_TO_SHIP", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"] as const;
export type CustomerOrderStatus = (typeof ORDER_STATUSES)[number];
export interface OrderListItem { id: string; orderNumber: string; status: CustomerOrderStatus; statusLabel: string; nextStep: string; brand: NamedRef; productName: string | null; totalQuantity: number; targetDeliveryDate: string | null; createdAt: string; updatedAt: string }
export interface OrderVariant { id: string; size: NamedRef | string | null; color: NamedRef | string | null; sizeOptionId: string | null; fabricColorId: string | null; quantity: number; notes: string | null }
export interface OrderItem { id: string; productName: string; quantity: number; notes: string | null; variants: OrderVariant[] }
export interface OrderDetail extends OrderListItem {
  allowedActions: OrderAction[]; reference: { sampleNumber: string; sampleId: string; productName: string };
  items: OrderItem[]; quantities: { total: number; shipped: number; delivered: number; remaining: number };
  customerNotes: string | null; preferredAddressId: string | null; confirmedAt: string | null; deliveredAt: string | null; reorderOf: { id?: string; orderNumber?: string } | string | null;
  commercial: { paymentStatus: PaymentSummaryStatus; currency: string | null; requiredAmount: string | null; remainingAmount: string | null; requiresReview: boolean }; progressPercent: number;
}
export interface OrderCommercial { orderId: string; quotationNumber: string | null; actionableVersionId: string | null; requiresReview: boolean; notice: string | null; payment: PaymentSummary; readyForProduction: boolean; nextAction: "REVIEW_QUOTATION" | "PAY" | "NONE"; allowedActions: OrderAction[] }
export interface OrderProductionStep { code: string; label: string; state: StepState }
export interface OrderProduction { phase: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE"; steps: OrderProductionStep[]; progressPercent: number; packaging: "NOT_STARTED" | "IN_PACKAGING" | "READY_FOR_SHIPMENT"; eta: { estimatedCompletion: string; confidence: "ESTIMATED" | "APPROXIMATE"; note: string } | null }
export type ShipmentState = "PREPARING" | "ON_THE_WAY" | "DELIVERED" | "DELIVERY_ATTEMPT_FAILED" | "RETURNED";
export interface PortalShipment { id: string; orderId: string; shipmentNumber: string; status: ShipmentState; quantity: number; destination: string | { city?: string | null; country?: string | null } | null; courierName: string | null; trackingNumber: string | null; trackingUrl: string | null; scheduledAt: string | null; dispatchedAt: string | null; deliveredAt: string | null }
export interface PortalShipments { summary: { totalUnits: number; shippedUnits: number; deliveredUnits: number; remainingUnits: number; partiallyShipped: boolean }; shipments: PortalShipment[] }
export interface OrderActivityEvent { at: string; kind: "ORDER" | "PAYMENT"; title: string; message: string | null }
export interface OrderItemsBody { quantity: number; variants: Array<{ sizeOptionId?: string; fabricColorId?: string; quantity: number; notes?: string }>; notes?: string }
export interface OrderUpdateBody { targetDeliveryDate?: string | null; customerNotes?: string | null; preferredAddressId?: string | null }
