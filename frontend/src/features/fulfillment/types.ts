/** Shapes verified against the live OpenAPI + live responses (2026-10-22). */
export const SHIPMENT_STATUSES = ["DRAFT", "READY", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED", "CANCELLED"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export const DELIVERY_METHODS = ["OWN_DELIVERY", "COURIER", "CUSTOMER_PICKUP"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export interface PackagingComponent { id: string; componentOptionId: string | null; componentCode: string | null; name: string; category: string | null; quantityPerUnit: number | null; notes: string | null }
export interface PackagingReconciliation { completedQuantity: number; packedQuantity: number; damagedQuantity: number; cartonCount: number; packagingComplete: boolean; shippableQuantity: number }
export interface PackagingReport { id: string; jobStageId: string; packedQuantity: number; damagedQuantity: number; cartonCount: number; notes: string | null; reportedByName: string | null; createdAt: string }
/** Packaging SPECIFICATION (what to pack with) + reconciliation and the execution reports. Not the same as packaging execution. */
export interface PackagingSpec {
  id: string | null;
  defined: boolean;
  foldingInstructions: string | null;
  polybagRequired: boolean;
  labelsRequired: boolean;
  hangTagsRequired: boolean;
  stickersRequired: boolean;
  stickerNotes: string | null;
  unitsPerCarton: number | null;
  cartonNotes: string | null;
  specialInstructions: string | null;
  components: PackagingComponent[];
  reconciliation: PackagingReconciliation;
  reports: PackagingReport[];
  updatedAt: string | null;
}
export interface PackagingSpecInput {
  foldingInstructions?: string; polybagRequired?: boolean; labelsRequired?: boolean; hangTagsRequired?: boolean; stickersRequired?: boolean; stickerNotes?: string;
  unitsPerCarton?: number; cartonNotes?: string; specialInstructions?: string; components?: Array<{ componentOptionId?: string; customName?: string; quantityPerUnit?: number; notes?: string }>;
}
export interface PackagingReportBody { packedQuantity: number; damagedQuantity?: number; cartonCount?: number; orderVariantId?: string; notes?: string }

export interface ShipmentLine { orderVariantId: string; label: string; quantity: number }
/** The destination as it was when the shipment was created (immutable). */
export type AddressSnapshot = Record<string, unknown> | null;
export interface Shipment {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderNumber: string;
  status: ShipmentStatus;
  deliveryMethod: DeliveryMethod;
  recipientName: string;
  recipientPhone: string;
  addressSnapshot: AddressSnapshot;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  scheduledAt: string | null;
  readyAt: string | null;
  dispatchedAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  returnedAt: string | null;
  cancelledAt: string | null;
  failureReason: string | null;
  returnReason: string | null;
  cancelReason: string | null;
  hasProof: boolean;
  notes: string | null;
  deliveryNotes: string | null;
  assignedDeliveryUserId: string | null;
  assignedDeliveryName: string | null;
  totalQuantity: number;
  lines: ShipmentLine[];
  createdAt: string;
}
export interface CreateShipmentBody {
  deliveryMethod: DeliveryMethod;
  recipientName: string;
  recipientPhone: string;
  customerAddressId?: string;
  address?: { country?: string; state?: string; city: string; area?: string; addressLine1: string; addressLine2?: string; postalCode?: string; notes?: string };
  courierName?: string; trackingNumber?: string; trackingUrl?: string; scheduledAt?: string; notes?: string; deliveryNotes?: string; assignedDeliveryUserId?: string;
  lines: Array<{ orderVariantId: string; quantity: number }>;
}

/** What a DELIVERY user sees: no prices, no order internals. */
export interface StaffDelivery {
  id: string;
  shipmentNumber: string;
  status: ShipmentStatus;
  deliveryMethod: DeliveryMethod;
  recipientName: string;
  recipientPhone: string;
  address: AddressSnapshot;
  packages: ShipmentLine[];
  totalQuantity: number;
  deliveryNotes: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  scheduledAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  hasProof: boolean;
}

export interface TrackingStatus { enabled: boolean; tokenId: string | null; createdAt: string | null; expiresAt: string | null; lastUsedAt: string | null }
/** The raw token appears ONLY in this response (the backend stores its hash). */
export interface TrackingToken { token: string; path: string; url: string | null; expiresAt: string | null; tokenId: string }
export interface PublicTracking {
  orderNumber: string; status: string; currentStage: string | null; progressPercent: number; totalQuantity: number; deliveredQuantity: number; remainingDeliveryQuantity: number; targetDeliveryDate: string | null;
  shipments: Array<{ shipmentNumber: string; status: string; quantity: number; courierName: string | null; trackingUrl: string | null; dispatchedAt: string | null; deliveredAt: string | null }>;
  updatedAt: string;
}
