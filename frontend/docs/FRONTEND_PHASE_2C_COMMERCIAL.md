# Frontend Phase 2C — Quotations, Payments & Commercial workflow (Samples)

## Screens
Sample detail → **Commercial** tab (`/samples/[id]?tab=commercial`, visible with `quotations.read` or `payments.read`) with three sub-tabs: **Summary**, **Quotation**, **Payments**. The Phase 2B.2 read-only panel was replaced (`features/commercial/*`). No new routes; Orders/Production/QC untouched.

## API contracts (verified live)
| Purpose | Route |
|---|---|
| Summary | `GET /admin/samples/:id/commercial-summary` → quotation `{number, versionId, versionNumber, status, total}`, `quotedTotal, acceptedTotal, verifiedPaid, pendingPayments, remaining, paymentState, counts` (orders also return `overpaid`, `reapprovalRequired`; a sample summary may not, so they render only when present) |
| Quotations | `GET/POST /admin/samples/:id/quotations` (create only while the sample is UNDER_REVIEW), `POST /admin/quotations/:id/versions`, `PATCH /admin/quotation-versions/:id` (DRAFT only), `POST …/send`, `POST …/accept|reject {sourceNote (3–500, required), responseNote?}` |
| Payments | `GET/POST /admin/samples/:id/payments {amount, method, currency?, transactionReference?, proofAssetId?, receivedAt?}`, `POST /admin/payments/:id/{review,verify,cancel}`, `POST …/reject {reason (3–500)}` |
| Proof | `POST /admin/assets` (multipart, type `PAYMENT_PROOF`) → `proofAssetId`; download via `GET /admin/assets/:id/download-url` on click |
* Statuses are the backend's: quotation DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED/SUPERSEDED; payment SUBMITTED/UNDER_REVIEW/VERIFIED/REJECTED/CANCELLED; payment state UNPAID/PARTIALLY_PAID/PAID; methods INSTAPAY, VODAFONE_CASH, TELDA, BANK_TRANSFER, CASH, OTHER; line types SAMPLE_FEE … OTHER. The API has **no allowedActions** for these objects, so buttons are gated by permission + the obvious state (draft → edit/send, sent → record decision); the backend still validates and its message is shown.
* Money is a decimal **string** end to end. Requests carry numbers ≤ 2 decimals (the contract) built from validated strings; `lib/utils/money.ts` does integer (BigInt, half-up) arithmetic and is used only for the editor's **preview** — displayed totals always come from the server.

## Permissions (verified live)
`quotations.read` view · `quotations.create` create/edit draft/new version/send (SALES, ADMIN) · `approvals.manage` record acceptance/rejection (SALES, ADMIN) · `payments.read` view · `payments.manage` add/cancel payment (SALES, ADMIN, finance) · `payments.verify` review/verify/reject (SUPER_ADMIN, finance; **SALES gets 403**) · `assets.manage/read` proof upload/download. Also: the person who recorded a payment cannot verify it. 403 on any call shows a restricted state; the user stays signed in; unauthorised data is never shown as zero.

## Quotation flow
No quotation → **New quotation** (line rows: type, description, quantity, unit price; discount amount, tax %, valid-until, currency optional) → DRAFT (**Edit draft**, **Send quotation** with confirmation; sample → QUOTED) → SENT: **Record customer acceptance / rejection** (staff-recorded; evidence mandatory; wording states the customer does not confirm in the app) or **New version** (supersedes the sent one immediately). History lists every version newest first with status, dates, subtotal/discount/tax/total, validity and line items; only the live one is marked **Current**; SUPERSEDED/ended versions stay visible. A version ended by a revision (`invalidatedAt`) shows "Ended by revision N", is never current, and if no accepted version remains a **Commercial reapproval required** banner shows the previously accepted terms and the reason.

## Payment flow
**Add payment** (needs an accepted quotation; amount, method, reference, received date, proof upload as `PAYMENT_PROOF`) → SUBMITTED. Finance: Start review / **Verify** / **Reject** (reason required). Recorder/SALES: Cancel while open. Summary cards (all backend values): Accepted/Quoted total, **Verified paid**, **Remaining**, Pending (unverified, never counted as paid), Overpaid (when returned), payment-state badge.

## Private proof
Upload goes through the backend asset API (never to storage); the proof appears as metadata only; the signed URL is requested on click and opened on the API origin (`lib/api/assets`); no storage key or path is read or rendered.

## Bugs found and fixed
* `StatusTimeline`'s scroller let its hidden screen-reader span widen the page (11 px overflow at 390 px once the sample was past SUBMITTED); the scroller is now `relative` (same fix applied to the quotation line-item table).

## Tests (`pnpm test`: 244 total, 22 new in `tests/commercial.test.tsx`)
Decimal safety (no float drift, half-up, discount lines, line validation); commercial summary with access / 403 / overpaid / reapproval; version history and "only the live version is current"; ended-by-revision not current + reapproval banner; server totals displayed; create payload correctness and client validation; send; staff-recorded accept wording, mandatory evidence and backend 409 shown; payment add with private proof flow and real method list; backend business errors shown verbatim; add disabled without an accepted quotation; signed proof download only on click; SALES cannot verify; finance verify/reject (reason) with no actions on verified; verification refusal handled; payments 403.

## Live verification
Real UI as SUPER_ADMIN: created a quotation (preview 1 597.14 = server), sent it, created v2 (v1 → SUPERSEDED), sent, recorded acceptance (summary: accepted EGP 1 401.00). As SALES: payment over the balance refused with the backend message, payment of 400 with proof recorded, no verify/reject buttons, proof downloaded via signed URL, summary shows 400 as pending (not paid). As SUPER_ADMIN: verified it → Partially paid, verified 400, remaining 1 001. **No FINANCE account was available**; finance behaviour is covered by tests and by the SUPER_ADMIN's `payments.verify`. Sanity layout at desktop and 390 px: no overflow after the fix. Test data was cancelled/archived.

## Known limitations
* No FINANCE login to exercise live; `payments.verify` holders other than SUPER_ADMIN untested live.
* Sample commercial summary has no `overpaid` / `reapprovalRequired` (order summaries do); the UI shows them only when returned and derives the reapproval banner from ended versions.
* PATCH of payments (amount/method/proof edits) and order-quotation screens are not built.
* Totals preview uses the same rules as the server (half-up, 2 dp) but the server's result is authoritative.
* Quotation `metadata` on lines and quotation PDFs are not exposed.
