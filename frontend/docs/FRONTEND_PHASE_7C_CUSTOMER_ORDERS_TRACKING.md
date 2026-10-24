# Frontend Phase 7C — Customer Orders, Production Tracking, Shipments, Reorder

Customer portal (`/account/*`). Every request uses the customer client (`customerApi`) and stays under `/customer/*`. The customer is always taken from the session; `customerId` is never sent. Staff and customer sessions stay isolated (7A/7B auth fix unchanged).

## Routes
| Route | Purpose |
| --- | --- |
| `/account/orders` | My Orders (server filters/sort/paging in the URL) |
| `/account/orders/new?sample=<id>` | Start a bulk order from an approved sample |
| `/account/orders/[id]` | Order detail (Overview, Quotation, Payment, Production, Shipments, Activity) |
| `/account/orders/[id]/edit` | Edit a draft (only because the backend supports draft editing) |

"My orders" is in the portal navigation. The dashboard shows Active orders / In production / Awaiting my action / In delivery (status filters over `GET /customer/orders`), recent orders, and draft/quotation/payment orders under "Needs your action".

## Create, edit, submit
- Approved sample detail shows **Start bulk order** (`status === "APPROVED"`); the backend has no order action in the sample `allowedActions`, so eligibility is not recreated, and `create-order` refuses anything ineligible (its message is shown).
- `POST /customer/samples/:id/create-order` creates a DRAFT. The page says: "This order will use your approved sample as the production reference." and shows sample number, product, brand. (The backend returns no approved date, so none is shown.) No internal ids are rendered.
- Save Draft = create/`PATCH /customer/orders/:id` + `PUT …/items`; Submit = `POST …/submit`. A status PATCH is never used. After submit: "Order submitted — Order ORD-… Our team will review your order."
- Sections: Quantity, Size & colour matrix, Requested delivery date (a request, not a guarantee), Delivery address (customer-owned addresses; link to Profile), Notes, Review & Submit.

## Quantity model
Matrix of real size ids (customer configurator) × the approved fabric's colour ids. If the fabric has no catalogue colours the rows are size-only (the approved colour is kept, `fabricColorId` omitted). No custom sizes or colours; if there are no sizes a clear message is shown. The total and the variant sum are compared live; a mismatch is shown and blocks saving the breakdown/submit but is **never auto-adjusted**. Pure logic in `order-builders.ts`.

## Detail, status, actions
Status label and `nextStep` come from the backend. Every action (edit, review quotation, upload proof, reorder) is driven by `allowedActions`. Tabs appear only when there is data.

## Commercial
The 7B quotation/payment components are generalised with a `kind` ("sample" | "order") that only switches the endpoint family (`/customer/order-quotation-versions/:id/accept|reject`, `/customer/orders/:id/quotation|payments`) and cache keys. Accept needs confirmation; reject takes an optional reason. If `requiresReview`/`endedByChange`: "Your order changed and a new quotation requires your review."; a previous acceptance is never implied to apply. After actions the order, commercial, quotation, payments, production, shipments, activity and lists are invalidated. Payment states: Payment required, Payment under review, Payment verified, Could not be verified (backend message). Proof upload is private multipart; proof is opened by signed URL on click.

## Production tracker
Renders the backend's seven coarse steps from `GET /customer/orders/:id/production`; batches/jobs/stages/staff do not exist in the payload and are never shown. `progressPercent` is the backend's value (never computed). ETA wording: "Estimated completion" vs "Approximate completion" with the backend note, no data-quality internals. Packaging: Not started / Packaging / Ready for shipment.

## Shipments
`GET /customer/orders/:id/shipments`: number, status, units, destination (city/country), dispatched/delivered dates, tracking when provided. Summary reads "15 of 30 units shipped, 15 remaining" or "All N units delivered". No delivery staff, proof or failure internals.

## Delivered and reorder
Delivered/Completed shows a completion card. **Reorder** appears only if `allowedActions` has `REORDER`; it confirms ("Create a new order using this approved production reference?"), calls `POST /customer/orders/:id/reorder` (`cloneItems`) and opens the new draft's edit screen. No quotation, payment, production or shipment state is copied (verified live).

## Security
Customer routes only call `/customer/*`; foreign/unknown order ids give the same "Order not found" and no detail; the UI renders only fields in the customer payloads (tested with injected internal fields).

## Live verification (portaltest customer, SMP-000024, local backend)
1. Login → approved sample → Start bulk order ✔. 2. 20-unit order, saved as draft, reloaded, submitted (ORD-000021); visible to staff ✔. 3. Staff confirmed and quoted; customer accepted in the UI; customer uploaded proof in the UI; staff verified ✔. 4. Staff released production; the customer saw "In production" and the seven steps ✔. 5. A second order (ORD-000022) went through minimal production (admin override for non-quantity stages, real sewing/ready/packaging reports) → customer saw Packaging "Ready for shipment" ✔. 6. Partial shipment: "10 of 20 units shipped, 10 remaining" ✔; second shipment delivered → "Delivered", "All 20 units delivered" ✔. 7. Reorder created ORD-000023, a Draft with the cloned quantity and no commercial/payment/production tabs ✔. 8. Another customer's order returns 404 for every `/customer/orders/:id*` route and the UI shows "Order not found" ✔.
Not exercised live: a mid-flow order revision (re-review banner) — covered by unit tests only. Temporary delivery user disabled afterwards; scratch scripts and credentials removed.

## Known limitations (backend)
No customer modification after submission; no customer cancellation; one production line per order; no custom sizes/colours; delivery proof and failure internals hidden; "awaiting my action" is derived on the client from status (no endpoint); the reference has no approved date.

## Readiness for the Public Website
The authenticated customer portal is complete end to end (samples → orders → tracking → reorder). Nothing in the public website is built or required by this phase; it can start from the existing design tokens and layout, with no dependency on portal code beyond linking to `/account/login`.
