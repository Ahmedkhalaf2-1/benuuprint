# Frontend Phase 7B — Customer Commercial + Sample Production + Approval

Extends the 7A portal (auth, shell, dashboard, My samples, request wizard, files, profile, session isolation are unchanged). No orders, shipment/order tracking, notifications centre or public website (7C).

## Screens changed
- `/account/samples/[id]`: tabs **Overview · Specification · Quotation · Payment · Production · Files · Activity**. Quotation / Payment / Production appear only when the backend says there is something to show (a quotation or accept/reject action; a payment state other than `NOT_REQUIRED_YET`; production started or an approval to make). Header: status, **What happens next** (`nextStep`) and **one primary CTA** from `allowedActions`.
- Overview: approval card (when approving is allowed) and a "Sample production" card with the six-step tracker and `nextStep` while in production.
- `/account`: new **Needs your action** list (quotation ready, payment required, sample ready for approval, changes requested); counters include the new statuses (`PAYMENT_UNDER_REVIEW`, `REVISION_REQUESTED`).
- `/account/samples` rows: contextual CTA — Review quotation · Upload payment proof · Track production · Review sample · Continue editing · View sample (list rows carry no `allowedActions`, so this follows the backend's customer status; the detail page's real actions come from `allowedActions`).

## allowedActions
`CustomerSampleDetailDto.allowedActions` (EDIT_REQUEST, UPLOAD_FILE, ACCEPT_TERMS, SUBMIT_REQUEST, ACCEPT_QUOTATION, REJECT_QUOTATION, UPLOAD_PAYMENT_PROOF, APPROVE_SAMPLE, REQUEST_CHANGES) is the only source for what is offered. `primaryAction()` (journey order: quotation → payment → approval → editing) picks the CTA; buttons exist only if their action is listed (and, for accept/reject, only on the version the backend marks actionable). The frontend has no status-based customer state machine.

## Contract used (all `/customer/*`; the customer is never sent, only resource ids)
`GET samples/:id/commercial` (quotation summary, payment summary, `nextAction`, `allowedActions`) · `GET samples/:id/quotation` (`quotations[].versions[]`, `actionableVersionId`, `requiresReview`, `notice`) · `POST quotation-versions/:id/accept` · `POST quotation-versions/:id/reject {reason?}` · `GET samples/:id/payments` (`summary`, `payments[]`) · `POST samples/:id/payments` (multipart `file, amount, method, transactionReference?, receivedAt?`) · `POST payments/:id/proof` (replace, multipart) · `GET payments/:id/proof/download-url` · `GET samples/:id/production` (six coarse steps) · `POST samples/:id/approve {note?}` · `POST samples/:id/request-changes {reason (3–2000), categories?}` · `GET samples/:id/files` (`source: YOU | BENUE_PRINT`).

## Quotation, versions, accept/reject
Current quotation and previous quotations are separate, labelled cards (newest version first): number, version, status, line items (description, qty, unit price, amount), subtotal, discount, tax %, total (in the quotation's currency), valid until, sent/accepted/declined/superseded dates and the printed customer note. Only fields of the customer DTO are rendered (costs, margins, internal notes never exist in the payload). Previous/superseded versions are read-only. **Re-review**: `requiresReview` shows the backend `notice` (fallback "A new quotation is ready for your review.") and states that an earlier acceptance no longer applies. **Accept** asks for confirmation ("You agree to EGP … Next, you will be asked to pay.") then `POST …/accept`; **Reject** has an optional reason. Both then refresh the sample (status/nextStep/allowedActions), commercial summary, quotations, payments, production, files and the timeline (one targeted invalidation). 409/other backend messages are shown verbatim.

## Payment
Summary: Required · Verified · Waiting for review · Still to pay, one currency (the quotation's; never combined), with customer wording: *No payment needed yet / Payment required / Payment under review / Payment verified*. History: number, amount, method, status (*Under review / Verified / Could not be verified / Cancelled*), submitted/verified dates, reference. A rejected payment shows only the backend's customer-facing `message`; internal reasons are not in the payload and never displayed. **Upload payment proof** exists only with `UPLOAD_PAYMENT_PROOF`: amount (defaults to what is still due; local check against the remaining amount, backend authoritative), method (INSTAPAY, VODAFONE_CASH, TELDA, BANK_TRANSFER, CASH, OTHER), optional reference/date, receipt file (PNG/JPEG/GIF/WebP/PDF) → multipart to the sample's payments route. **Replace proof** is shown only when that payment says `canReplaceProof`. Proofs open through a signed link requested **on click**, resolved against the API origin, never displayed. Customers cannot verify payments (staff boundary: finance verifies in the admin app).

## Files
`Files` shows **Provided by Benue Print** (customer-visible staff files, `source = BENUE_PRINT`) separately from **Uploaded by you**. Staff-only files are not in the payload. Downloads are signed, on click.

## Production tracker and approval
`GET …/production` returns six coarse steps (Preparing materials · Pattern & cutting · Decoration · Sewing · Quality check · Sample ready) with `PENDING / ACTIVE / DONE`; rendered in the backend's order with its labels. No stages, staff, QC checklists, blockers, rework or quantities exist in the payload or UI. When `APPROVE_SAMPLE` / `REQUEST_CHANGES` are allowed the **"Your sample is ready for review"** card shows the shared files and the actions. **Approve sample** (confirmation: "Approve this sample as the reference for future bulk production? This cannot be undone.", optional comment) → `POST …/approve`. **Request changes**: required reason (3+ chars), optional categories (FIT, FABRIC, COLOUR, ARTWORK, DECORATION, CONSTRUCTION, OTHER) → `POST …/request-changes`; afterwards the backend's status/nextStep (e.g. revision requested) are shown; no rework internals.

## Activity
The 7A customer-safe timeline (and messages) is refreshed after every action; it is the customer's history of quotation sent/accepted/rejected, payment, production, ready, approved, changes requested — as the backend emits it.

## Security
No admin API is called; every journey request is `/customer/*` with resource ids only (tested: no `customerId`, no non-`/customer/` path). Unknown or foreign sample ids keep the plain "Sample not found". Session isolation from 7A is untouched.

## Staff integration (no frontend sync)
Accept → staff see the sample awaiting payment; proof upload → finance queue; payment verified (staff) → ready for production; request changes → staff review; approval → approved reference (all backend-driven; the customer UI only reflects `status`, `nextStep`, `allowedActions`).

## Tests (`tests/portal-journey.test.tsx`, 17; 403 total)
allowedActions → CTA and tab visibility; current vs previous quotation; only the actionable version has buttons and none without the action; re-review notice; no internal fields; accept (confirm → POST → refresh) and reject (reason, 409 shown); payment states and single currency; proof upload gating/validation/multipart body; rejected proof shows only `message`, replace only when allowed, signed proof on click; tracker order/states without internal data; production card on Overview; staff vs own files; approve (confirmation, optional note) and request changes (reason rule, categories, 409); all requests `/customer/*` without `customerId`.

## Live verification status
**Not completed in this session:** the existing dev customer `portaltest@benue-print.local` was named but no password was available (the backend exposes no invite/reset tokens), so I could not sign in as the customer. The backend itself was reachable (health 200) and the full customer commercial/approval contract was read from the live OpenAPI (including the accept/reject/approve/request-changes routes and the `allowedActions` vocabulary). To finish the requested flow run it with that account's password: login → open a sample with a quotation → accept → upload proof → verify as staff → (staff) run production → customer sees the tracker → approve → admin sees the approved reference; and open a foreign sample id for the 404 check.

## Known backend limitations (respected)
Customer quotation rejection has no dedicated staff notification yet; quotation documents are not asset-backed (the page renders the quotation data, no PDF); customer replies are out of scope; the production projection is coarse by design. List rows have no `allowedActions` (so their CTA label follows the customer status).

## Phase 7C readiness
`customerApi`, `queryKeys.customer.*`, the journey invalidation helper, private upload/download patterns and the detail-tab structure are in place. 7C can add customer Orders (bulk order from an approved sample, quantity matrix, order tracking, shipments, reorder) as new `/account/orders` screens that reuse the money/status/file components; an approved sample is now the visible starting point for it.
