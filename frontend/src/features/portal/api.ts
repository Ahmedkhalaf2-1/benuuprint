import { customerApi as api } from "@/lib/customer/client";
import type { Paginated, QueryParams } from "@/types/api";
import type { CommercialKind, OrderActivityEvent, OrderCommercial, OrderDetail, OrderItemsBody, OrderListItem, OrderProduction, OrderUpdateBody, PortalShipments, ChangeCategory, CommercialSummary, PortalPayment, PortalPayments, PortalProduction, PortalQuotations, ActivityEvent, CustomerAddress, CustomerBrand, CustomerMe, CustomerProfile, FileType, PortalAccessory, PortalComponent, PortalDecoration, PortalFile, PortalMessage, PortalTerms, ProfileUpdate, SampleBody, SampleDetail, SampleListItem, SampleOptions, SubmissionCheck, TermsState } from "./types";

const enc = encodeURIComponent;
const s = (id: string) => `/customer/samples/${enc(id)}`;

/** Public (no session) customer auth calls go straight to the backend; sign-in/refresh/logout go through the same-origin BFF (see auth-api). */
export const activateAccount = (body: { token: string; password: string }) => api.post<void>("/customer/auth/activate", body, { anonymous: true });
/** Self-signup (public, no session). Backend contract: register -> 201 {status:"verification_required", email: masked}; verify-email {token} -> 200 {status:"verified"}; resend-verification {email} -> 200 {message} (identical whether or not an account matches). */
export interface RegisterBody { name: string; email: string; phone?: string; password: string; acceptedTerms: true; acceptedPrivacy: true }
export interface RegisterResult { status?: string; email?: string; emailVerificationRequired?: boolean }
export const registerCustomer = (body: RegisterBody) => api.post<RegisterResult>("/customer/auth/register", body, { anonymous: true });
/** Public. Whether signing up requires email verification (a deployment setting; never assume it). */
export const getCustomerAuthConfig = (signal?: AbortSignal) => api.get<{ emailVerificationRequired: boolean }>("/customer/auth/config", { signal, anonymous: true });
export const verifyEmail = (body: { token: string }) => api.post<{ status: "verified" }>("/customer/auth/verify-email", body, { anonymous: true });
export const resendVerification = (body: { email: string }) => api.post<{ message: string }>("/customer/auth/resend-verification", body, { anonymous: true });
export const forgotPassword = (body: { email: string }) => api.post<{ message: string }>("/customer/auth/forgot-password", body, { anonymous: true });
export const resetPassword = (body: { token: string; newPassword: string }) => api.post<void>("/customer/auth/reset-password", body, { anonymous: true });
export const changePassword = (body: { currentPassword: string; newPassword: string }) => api.post<void>("/customer/auth/change-password", body);
export const getMe = (signal?: AbortSignal) => api.get<CustomerMe>("/customer/auth/me", { signal });

export const getProfile = (signal?: AbortSignal) => api.get<CustomerProfile>("/customer/profile", { signal });
export const updateProfile = (body: ProfileUpdate) => api.patch<CustomerProfile>("/customer/profile", body);
export const listBrands = (signal?: AbortSignal) => api.get<CustomerBrand[]>("/customer/brands", { signal });
export const listAddresses = (signal?: AbortSignal) => api.get<CustomerAddress[]>("/customer/addresses", { signal });
export type AddressBody = { type?: string; country: string; state?: string; city: string; area?: string; addressLine1: string; addressLine2?: string; postalCode?: string; notes?: string; isDefault?: boolean };
export const createAddress = (body: AddressBody) => api.post<CustomerAddress>("/customer/addresses", body);
export const updateAddress = (id: string, body: Partial<AddressBody>) => api.patch<CustomerAddress>(`/customer/addresses/${enc(id)}`, body);

export const getOptions = (signal?: AbortSignal) => api.get<SampleOptions>("/customer/configurator/sample-options", { signal });
export const getTerms = (signal?: AbortSignal) => api.get<PortalTerms>("/customer/terms/sample", { signal });

export const listSamples = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<SampleListItem>>("/customer/samples", { query, signal });
export const getSample = (id: string, signal?: AbortSignal) => api.get<SampleDetail>(s(id), { signal });
/** Creating a draft needs only the brand; everything else is added with PATCH. The customer is never sent: it comes from the session. */
export const createSample = (body: { brandId: string } & SampleBody) => api.post<SampleDetail>("/customer/samples", body);
export const updateSample = (id: string, body: SampleBody) => api.patch<SampleDetail>(s(id), body);
export const getSubmissionCheck = (id: string, signal?: AbortSignal) => api.get<SubmissionCheck>(`${s(id)}/submission-check`, { signal });
export const submitSample = (id: string) => api.post<SampleDetail>(`${s(id)}/submit`);
export const acceptTerms = (id: string, termsVersionId?: string) => api.post<{ termsVersionId: string; version: number; acceptedAt: string }>(`${s(id)}/terms/accept`, termsVersionId ? { termsVersionId } : {});
export const getActivity = (id: string, signal?: AbortSignal) => api.get<ActivityEvent[]>(`${s(id)}/activity`, { signal });
export const getMessages = (id: string, signal?: AbortSignal) => api.get<PortalMessage[]>(`${s(id)}/messages`, { signal });

export type DecorationBody = { printMethodId?: string; placement?: string; side?: string; width?: number | null; height?: number | null; unit?: string; colorCount?: number | null; notes?: string | null; artworkRequired?: boolean };
export const addDecoration = (id: string, body: DecorationBody & { printMethodId: string; placement: string }) => api.post<PortalDecoration>(`${s(id)}/decorations`, body);
export const updateDecoration = (id: string, did: string, body: DecorationBody) => api.patch<PortalDecoration>(`${s(id)}/decorations/${enc(did)}`, body);
export const removeDecoration = (id: string, did: string) => api.delete<void>(`${s(id)}/decorations/${enc(did)}`);
export type AccessoryBody = { accessoryId?: string; customName?: string; quantity?: number; notes?: string };
export const addAccessory = (id: string, body: AccessoryBody) => api.post<PortalAccessory>(`${s(id)}/accessories`, body);
export const removeAccessory = (id: string, aid: string) => api.delete<void>(`${s(id)}/accessories/${enc(aid)}`);
export type ComponentBody = { componentOptionId?: string; customName?: string; notes?: string };
export const addComponent = (id: string, body: ComponentBody) => api.post<PortalComponent>(`${s(id)}/components`, body);
export const removeComponent = (id: string, cid: string) => api.delete<void>(`${s(id)}/components/${enc(cid)}`);

export const listFiles = (id: string, signal?: AbortSignal) => api.get<PortalFile[]>(`${s(id)}/files`, { signal });
/** Multipart upload through the backend private pipeline (never to storage directly). ARTWORK + decorationId = a version of that placement's artwork. */
export function uploadFile(id: string, file: File, type: FileType, opts: { description?: string; decorationId?: string } = {}) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", type);
  if (opts.description) fd.append("description", opts.description);
  if (opts.decorationId) fd.append("decorationId", opts.decorationId);
  return api.post<PortalFile>(`${s(id)}/files`, fd);
}
export const removeFile = (id: string, attachmentId: string) => api.delete<void>(`${s(id)}/files/${enc(attachmentId)}`);
export const fileUrlPath = (id: string, attachmentId: string) => `${s(id)}/files/${enc(attachmentId)}/download-url`;
export type { TermsState };

/* ---- 7B: quotation, payment, production, approval (all /customer/*, ids of the resource only) ---- */
export const getCommercial = (id: string, signal?: AbortSignal) => api.get<CommercialSummary>(`${s(id)}/commercial`, { signal });
const base = (kind: CommercialKind, id: string) => (kind === "order" ? `/customer/orders/${enc(id)}` : s(id));
export const getQuotations = (id: string, kind: CommercialKind = "sample", signal?: AbortSignal) => api.get<PortalQuotations>(`${base(kind, id)}/quotation`, { signal });
const qv = (kind: CommercialKind) => (kind === "order" ? "order-quotation-versions" : "quotation-versions");
export const acceptQuotation = (versionId: string, kind: CommercialKind = "sample") => api.post<SampleDetail | OrderDetail>(`/customer/${qv(kind)}/${enc(versionId)}/accept`);
export const rejectQuotation = (versionId: string, reason?: string, kind: CommercialKind = "sample") => api.post<SampleDetail | OrderDetail>(`/customer/${qv(kind)}/${enc(versionId)}/reject`, reason ? { reason } : {});
export const getPayments = (id: string, kind: CommercialKind = "sample", signal?: AbortSignal) => api.get<PortalPayments>(`${base(kind, id)}/payments`, { signal });
export interface PaymentInput { file: File; amount: number; method: string; transactionReference?: string; receivedAt?: string }
/** Multipart: the proof goes through the backend private pipeline; the customer can never mark a payment verified. */
export function submitPayment(id: string, p: PaymentInput, kind: CommercialKind = "sample") {
  const fd = new FormData();
  fd.append("file", p.file);
  fd.append("amount", String(p.amount));
  fd.append("method", p.method);
  if (p.transactionReference) fd.append("transactionReference", p.transactionReference);
  if (p.receivedAt) fd.append("receivedAt", p.receivedAt);
  return api.post<PortalPayment>(`${base(kind, id)}/payments`, fd);
}
export function replaceProof(paymentId: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<PortalPayment>(`/customer/payments/${enc(paymentId)}/proof`, fd);
}
export const proofUrlPath = (paymentId: string) => `/customer/payments/${enc(paymentId)}/proof/download-url`;
export const getProduction = (id: string, signal?: AbortSignal) => api.get<PortalProduction>(`${s(id)}/production`, { signal });
export const approveSample = (id: string, note?: string) => api.post<SampleDetail>(`${s(id)}/approve`, note ? { note } : {});
export const requestChanges = (id: string, body: { reason: string; categories?: ChangeCategory[] }) => api.post<SampleDetail>(`${s(id)}/request-changes`, body);

/* ---- 7C: orders (all /customer/*; the customer comes from the session) ---- */
const o = (id: string) => `/customer/orders/${enc(id)}`;
export const listOrders = (query: QueryParams, signal?: AbortSignal) => api.get<Paginated<OrderListItem>>("/customer/orders", { query, signal });
export const getOrder = (id: string, signal?: AbortSignal) => api.get<OrderDetail>(o(id), { signal });
export interface CreateOrderBody { items?: OrderItemsBody; targetDeliveryDate?: string; customerNotes?: string; preferredAddressId?: string }
export const createOrder = (sampleId: string, body: CreateOrderBody) => api.post<OrderDetail>(`${s(sampleId)}/create-order`, body);
export const updateOrder = (id: string, body: OrderUpdateBody) => api.patch<OrderDetail>(o(id), body);
export const putOrderItems = (id: string, body: OrderItemsBody) => api.put<OrderDetail>(`${o(id)}/items`, body);
export const submitOrder = (id: string) => api.post<OrderDetail>(`${o(id)}/submit`);
export const reorder = (id: string, body: { targetDeliveryDate?: string; customerNotes?: string; cloneItems?: boolean }) => api.post<OrderDetail>(`${o(id)}/reorder`, body);
export const getOrderCommercial = (id: string, signal?: AbortSignal) => api.get<OrderCommercial>(`${o(id)}/commercial`, { signal });
export const getOrderProduction = (id: string, signal?: AbortSignal) => api.get<OrderProduction>(`${o(id)}/production`, { signal });
export const getOrderShipments = (id: string, signal?: AbortSignal) => api.get<PortalShipments>(`${o(id)}/shipments`, { signal });
export const getOrderActivity = (id: string, signal?: AbortSignal) => api.get<OrderActivityEvent[]>(`${o(id)}/activity`, { signal });

export type BrandBody = { name: string; instagram?: string | null; website?: string | null; description?: string | null; primaryColor?: string | null; secondaryColor?: string | null };
/** The owner always comes from the session; the customer is never sent. */
export const createBrand = (body: BrandBody) => api.post<CustomerBrand>("/customer/brands", body);
export const updateBrand = (id: string, body: BrandBody) => api.patch<CustomerBrand>(`/customer/brands/${enc(id)}`, body);
