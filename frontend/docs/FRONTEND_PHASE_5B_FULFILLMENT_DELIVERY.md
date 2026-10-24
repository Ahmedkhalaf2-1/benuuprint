# Frontend Phase 5B — Packaging, Shipments & Delivery

No public tracking website, management dashboards or customer portal (later phases).

## Routes / placement
- `/orders/[id]` gains tabs **Packaging** (`packaging.manage`), **Shipments** (`shipments.read`), **Customer tracking** (`public_tracking.manage`) and a **Fulfillment** card on Overview (confirmed orders). Tabs appear by permission only.
- `/delivery` (was a placeholder): *All shipments* table (`shipments.read`, filters status/open/search, links to the order) and *My deliveries* (`deliveries.read_assigned`, `?delivery=<id>` drawer, `?finished=1`). Users with neither permission get Access denied.
- Landing: staff with `deliveries.read_assigned` but no `shipments.read` / `dashboard.read` land on `/delivery`.
- Phase 4 stage drawer: the PACKAGING stage now reports through the **packaging report** (packed / damaged / cartons) instead of the production report.

## Live contract (OpenAPI + live)
- Packaging: `GET|PUT /admin/orders/:id/packaging` (spec + reconciliation + reports); execution `POST /staff/job-stages/:stageId/packaging-reports {packedQuantity, damagedQuantity?, cartonCount?, orderVariantId?, notes?}`. **The spec must exist before packaging starts** (reports are refused: "Define the order packaging specification before packaging starts"), and the spec is locked once packaging has started. Admin (`production_quantity.report`) may report on any PACKAGING stage without assignment (verified live).
- Fulfillment (order detail): `deliveredQuantity, inFlightQuantity, shippableQuantity, remainingDeliveryQuantity, packagingDefined, packedQuantity, packagingComplete, trackingEnabled` + `shipments[]` summaries. Shippable = produced (final stage) ∧ packed ∧ not on a live shipment.
- Shipments: `GET|POST /admin/orders/:id/shipments`, `GET /admin/shipments` (page, pageSize, status, orderId, assignedDeliveryUserId, search, open), `GET|PATCH /admin/shipments/:id` (lines only while DRAFT; destination never changes), verbs `ready, dispatch, in-transit, deliver, fail, return, cancel`, proof `POST …/proof` (multipart) + `GET …/proof-url`.
- Statuses (backend enum): `DRAFT, READY, DISPATCHED, IN_TRANSIT, DELIVERED, FAILED, RETURNED, CANCELLED`.
- Delivery user: `GET /staff/deliveries[/:id]`, `POST …/{dispatch,in-transit,delivered,failed,returned,proof}`, `GET …/proof-url`; the payload has no prices, order internals or customer account data.
- Tracking: `GET /admin/orders/:id/tracking` (never returns the token), `POST …/tracking-token`, `POST …/tracking-token/regenerate`, `DELETE …/tracking-token`; public `GET /track/orders/:token`.
- Phone numbers are validated by the backend ("recipientPhone is not a valid phone number").

## UI behaviour
- **Fulfillment card**: ordered / produced / packed / ready to ship / on their way / delivered / remaining, headline from backend numbers (`Ready for shipment — N packed units can ship now`, `Partially delivered — N units remaining`, `Fully delivered`), packaging + tracking state, shipment summaries. No invented percentages.
- **Packaging tab**: reconciliation, spec (view / define / edit with `packaging.manage`), a warning when the spec is missing, execution forms for IN_PROGRESS packaging stages (with `production_quantity.report`; optional variant), report history. Backend refusals (over-report, missing spec, locked spec) are shown verbatim.
- **Shipments tab**: list (number, status, units, method, recipient/city, dates) → drawer with quantities, **"Delivery address at shipment creation"** (immutable snapshot, no edit control), notes, failure/return/cancel reasons, timeline, proof. Create dialog: per-variant allocation (ordered / on live shipments / left / ship now; cancelled and returned shipments don't count; guard against per-variant over-allocation and more than the packed-shippable total), method, recipient, saved address (copied by the backend) or one-off address, courier fields, schedule, delivery person (filtered to DELIVERY-eligible staff, needs `users.read`), notes. Partial shipments are normal; the order stays *partially shipped* until everything deliverable is delivered (backend state).
- **Actions** (permission + backend status; the backend decides and its message is shown): Mark ready / Edit quantities (DRAFT) / Cancel with reason (DRAFT, READY) need `shipments.manage`; Dispatch / retry / in-transit need `shipments.dispatch`; Deliver (receiver note + proof) / Fail / Return need `shipments.complete`. Cancel is not delete: history is kept.
- **Proof**: private; upload before delivery; signed URL requested on click only and opened on the API origin; storage keys never shown.
- **Delivery staff drawer**: recipient (tap-to-call), frozen address, packages, delivery notes, actions by status (pick up, on my way, delivered with proof, could not deliver, goods came back, retry).
- **Tracking tab**: status (enabled, created, expiry, last opened), create / regenerate / revoke (confirmed). The raw token/link exists only in the create/regenerate response: it is shown **once** in a dialog (copy button, state only — never stored); afterwards the panel states it cannot be shown again. The dialog offers a **Public tracking preview** (calls the public endpoint with that token) to verify what customers can see. When `PUBLIC_APP_URL` is not configured the backend returns `url: null` and only the API path is shown.
- **Activity**: fulfillment events (packaging started, shipment ready/dispatched/in transit/delivered, tracking updated) come from the order activity feed, not the audit log.

## Query keys / invalidation
`fulfillment.{packaging(orderId), shipments(orderId), shipment(id), shipmentList(params), packagingStages(jobId), deliveryWork(params), delivery(id), tracking(orderId)}`. Packaging report → packaging + order + activity + production summary + my-work; shipment change → shipments + shipment + lists + packaging + order + activity; delivery user action → delivery work/detail + shipment lists; tracking → tracking + order + activity. Stage mutations in Phase 4 now also refresh `["fulfillment"]` and the order detail.

## Permissions (codes only)
`packaging.manage` · `shipments.read / manage / dispatch / complete` · `deliveries.read_assigned` · `public_tracking.manage` · `production_quantity.report` (packaging reports) · `users.read` (delivery-person picker). Live: SALES = `packaging.manage, shipments.read, public_tracking.manage` (+assets); ADMIN = all of those plus `shipments.manage/dispatch/complete`, `deliveries.read_assigned`; SUPER_ADMIN everything. SALES sees the Packaging (define/edit spec), Shipments (read only) and Tracking tabs; ADMIN sees every one of them and more. DELIVERY: `deliveries.read_assigned, shipments.dispatch, shipments.complete, jobs.read_assigned` — `/orders`, `/production`, `/payments` are Access denied.

## Public-data boundary
The admin preview shows only what `PublicTrackingDto` returns (order number, coarse status, progress, quantities, shipments with courier/tracking URL). No payment, internal notes, QC, staff names or storage data are exposed or requested.

## Bugs found and fixed (Phase 4 carry-over, found while driving real stages)
- QC **MEASUREMENT** items require a PASS/FAIL result (plus the optional measured value) and **PHOTO_REQUIRED** items require a result after the photo is uploaded; the QC form only offered a number / nothing, so such inspections could not be completed from the UI.
- A bulk packaging stage must use the packaging report, not the production report (the latter silently marks packaging as started and locks the spec).

## Verified live
Real order ORD-000016 (30 units): packaging spec → packaging reported in the UI (over-report refused, 17 packed + 2 cartons; one damaged unit scrapped) → shippable 29 → shipment SHP-000001 (partial: 10 + 5) created in the UI (guard blocked 15 > 10; saved address copied) → ready → dispatched → (delivery user) in transit → proof uploaded → delivered with a note → order **PARTIALLY_SHIPPED**, 15 delivered, 14 still shippable (headline "Ready for shipment — 14…") → backend refusals confirmed ("Over-shipping: variant has 10 deliverable unit(s), 10 already on shipments, 9 requested"; "16 unit(s) requested but only 14 are produced, packed and not yet on a shipment") → tracking link created/regenerated, one-time token + public preview → activity feed shows the events. SALES: read-only shipments, packaging spec editable, no execution. DELIVERY: only /delivery.

## Tests (`tests/fulfillment.test.tsx`, 18; 327 total)
Allocation math, packaging body, headline/partial state, packaging report + refusal, spec gating, shipment create (guard, payload, refusal), live-shipment subtraction, snapshot read-only, action gating by permission/status, dispatch / deliver / cancel payloads, signed proof, DELIVERY privacy + landing + actions, admin vs no-access, tracking one-time token + revoke + gating, SALES ⊆ ADMIN tabs, no tabs for plain readers.

## Known limitations
- The ADMIN account itself was not available for a live session (permission parity was verified from live permission lists and tests; the live UI runs used SUPER_ADMIN, SALES and DELIVERY).
- No courier-specific tracking page, no shipment label printing, no bulk shipment actions, no edit of destination (by design: create a new shipment).
- Editing a DRAFT shipment changes quantities/notes only. Master-data packaging components cannot be picked yet (custom names only; existing master components are kept).
- Packaging execution needs an in-progress PACKAGING stage; creating shipments needs `shipments.manage`.
- The tracking `path` returned by the backend is an API path; the customer-facing URL needs `PUBLIC_APP_URL` on the server.

## Phase 6 readiness
Delivery KPIs (`/admin/management/kpis/delivery`), delay/ETA endpoints and a global fulfillment overview can build on the shipment list/keys above.
