import { api } from "@/lib/api/client";
import type { CommercialSummary } from "@/features/samples/types";
import type { CommercialTarget, LineInput, Payment, Quotation, QuotationVersion } from "./types";

const enc = encodeURIComponent;

/** Samples and orders share the quotation/payment model; only the owner path and the decision route differ. */
export const targetBase = (t: CommercialTarget) => (t.kind === "sample" ? `/admin/samples/${enc(t.id)}` : `/admin/orders/${enc(t.id)}`);

export const listQuotations = (t: CommercialTarget, signal?: AbortSignal) => api.get<Quotation[]>(`${targetBase(t)}/quotations`, { signal });

export interface QuotationBody { lineItems: LineInput[]; discount?: number; taxPercent?: number; notes?: string | null; validUntil?: string | null }
export const createQuotation = (t: CommercialTarget, body: QuotationBody & { currency?: string }) => api.post<Quotation>(`${targetBase(t)}/quotations`, body);
/** A new version supersedes a SENT predecessor immediately; the history is kept. */
export const createQuotationVersion = (quotationId: string, body: QuotationBody) => api.post<QuotationVersion>(`/admin/quotations/${enc(quotationId)}/versions`, body);
/** DRAFT versions only: sent/accepted versions are immutable (the API answers 409). */
export const updateQuotationVersion = (versionId: string, body: QuotationBody) => api.patch<QuotationVersion>(`/admin/quotation-versions/${enc(versionId)}`, body);
export const sendQuotationVersion = (versionId: string) => api.post<QuotationVersion>(`/admin/quotation-versions/${enc(versionId)}/send`);
/** Staff RECORD the customer's decision; `sourceNote` (3–500 chars) is mandatory evidence. */
export const decideQuotationVersion = (t: CommercialTarget, versionId: string, decision: "accept" | "reject", body: { sourceNote: string; responseNote?: string }) =>
  api.post<QuotationVersion>(`${t.kind === "order" ? "/admin/order-quotation-versions" : "/admin/quotation-versions"}/${enc(versionId)}/${decision}`, body);

export const listPayments = (t: CommercialTarget, signal?: AbortSignal) => api.get<Payment[]>(`${targetBase(t)}/payments`, { signal });
export interface PaymentBody { amount: number; method: string; currency?: string; transactionReference?: string; proofAssetId?: string; receivedAt?: string }
export const createPayment = (t: CommercialTarget, body: PaymentBody) => api.post<Payment>(`${targetBase(t)}/payments`, body);
export const paymentAction = (paymentId: string, action: "review" | "verify" | "cancel", body?: undefined) => api.post<Payment>(`/admin/payments/${enc(paymentId)}/${action}`, body);
export const rejectPayment = (paymentId: string, reason: string) => api.post<Payment>(`/admin/payments/${enc(paymentId)}/reject`, { reason });

/**
 * Order summary also carries overpaid, reapprovalRequired and the production release gate. Its quotation is FLAT
 * (`quotationNumber`, `quotationVersionId`, `quotationStatus`), so it is normalised to the sample summary's `quotation` object
 * (the order summary has no version number).
 */
interface OrderSummaryRaw extends Omit<CommercialSummary, "quotation" | "sampleId" | "sampleNumber"> {
  orderId: string;
  orderNumber: string;
  quotationNumber: string | null;
  quotationVersionId: string | null;
  quotationStatus: string | null;
}
export async function getCommercialSummary(t: CommercialTarget, signal?: AbortSignal): Promise<CommercialSummary> {
  if (t.kind === "sample") return api.get<CommercialSummary>(`/admin/samples/${enc(t.id)}/commercial-summary`, { signal });
  const r = await api.get<OrderSummaryRaw>(`/admin/orders/${enc(t.id)}/commercial`, { signal });
  const { orderId: _orderId, orderNumber, quotationNumber, quotationVersionId, quotationStatus, ...rest } = r;
  void _orderId;
  return {
    ...rest,
    sampleId: "",
    sampleNumber: orderNumber,
    quotation: quotationNumber && quotationStatus ? { quotationId: "", quotationNumber, versionId: quotationVersionId ?? "", versionNumber: null, status: quotationStatus, total: (r.acceptedTotal ?? r.quotedTotal) ?? "0.00" } : null,
  } as CommercialSummary & { orderId?: string };
}
