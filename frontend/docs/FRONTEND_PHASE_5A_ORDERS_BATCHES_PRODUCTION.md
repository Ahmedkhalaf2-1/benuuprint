# Frontend Phase 5A — Orders, Batches & Production Linkage

Builds on Phase 3 (orders/batches/commercial) and Phase 4 (factory operations). No shipments, dispatch, delivery proof or public tracking (Phase 5B).

## Routes
| Route | |
|---|---|
| `/orders` | server-driven list (+ **New order** link, `orders.manage`) |
| `/orders/new` | **new**: approved-sample selector → creates a DRAFT |
| `/orders/[id]` | tabs `overview, variants, spec, batches, production, commercial, history` (`?tab=`) |
| `/production/jobs/[id]` | Phase 4 job screen; every order/batch job links here |

## Live API contract (OpenAPI + live)
- There is **no free-form `POST /admin/orders`**. Creation is `POST /admin/samples/:id/create-order`; the order is pinned to that sample's newest `APPROVED_REFERENCE`. `PRE_PRODUCTION` specs are never usable (the selector enforces it; the backend also refuses). Inactive customer/brand → 409 "The customer/brand is not active" (shown verbatim).
- Lifecycle: `submit → confirm` (spec frozen) `→ ready` (commercial release gate) `→ create-factory-job` / batches; `request-changes`, `hold/resume`, `cancel`, `revise`, `reorder`, `force-complete` (orders.override, only from production-complete on), `PUT /items` (DRAFT only).
- Frozen spec: `GET /admin/orders/:id/production-specs` → one row per confirmed revision `{revision, totalQuantity, specHash, snapshot{order, reference, items[variants]}}`.
- Revision: `commercialImpact` + `commercialChanges[]` come from the backend (live: a date-only revise → `false`; a quantity change → `true`, spec revision 3, `reapprovalRequired=true`, previous quotation ended). The frontend never classifies changes.
- Batches/jobs: `POST /admin/orders/:id/batches`, `PUT …/allocations`, `…/ready`, `POST /admin/order-batches/:id/create-factory-job` (`ORDER_BATCH`), `POST /admin/orders/:id/create-factory-job` (`BULK_ORDER`, only for READY_FOR_PRODUCTION without batches). Over-allocation → 409 "variant has 30 units, 12 already in other batches, 18 left, 30 requested".
- Staff stage detail now maps `orderView {orderNumber, plannedQuantity, batch, items[].variants[{variantId,size,color,quantity}]}`.

## What was added
- **New order page**: customer/brand filter → samples `status=APPROVED,COMPLETED` → shows the reference that will be pinned (revision, frozen date, fingerprint) or a refusal when none exists; Create is disabled without one.
- **Colour × size grid** (`matrix.ts`, `quantity-matrix.tsx`) in the draft editor (toggle with the List view). Size/colour ids come from the configurator; custom colours can be added; zero removes the variant; existing variant ids are kept on edit; variants the grid can't show (no/custom size) are counted as "outside" and flagged, never hidden. The grid never changes the item quantity — order quantity, variant total and difference stay visible and the backend remains authoritative at confirm.
- **Production spec tab**: frozen specs newest first, current vs superseded, read only (no edit controls).
- **Readiness card** (pure `readinessItems`): approved reference, quantities add up, spec frozen, commercial terms approved, payment gate (reasons from the backend). **Re-approval banner** "Commercial terms require re-approval." appears only when the backend flags it.
- **Override**: *Force complete (override)* (needs `orders.override`, reason mandatory, labelled ADMINISTRATIVE OVERRIDE).
- **Job linkage**: job creation invalidates order + production board/jobs and offers an *Open job* toast action; order/batch job links point to `/production/jobs/:id`.
- **Phase 4 bulk quantity integration**: floor staff see the order's variants on a bulk stage and can attach a report to a variant; the variant selection resets after each report (it previously carried over silently).
- Fixes: `/orders/new` no longer requests `…/samples/none/production-specs` before a sample is picked.

## Verified live (real data, SUPER_ADMIN/SALES/floor)
- Real bulk order (ORD-000011 → whole-order job JOB-000005): FABRIC stage via My Work: variant reports, per-variant and per-stage **over-report refusals shown verbatim**, complete refused until every unit is accounted for, then completed; the order production summary advanced (next stage requires 98 after 2 rejected).
- Second order via the UI (`/orders/new` → grid → save), then submit/confirm/quote/accept → **revise (quantity)** → spec revision 3, banner + readiness show re-approval → new quotation accepted → payment verified → ready → two batches (over-allocation refused with the exact message) → batch ready → **ORDER_BATCH job** JOB-000006.
- SALES vs ADMIN: the same order screen shows every SALES action to ADMIN (ADMIN additionally: Cancel). Live permission check: SALES permissions ⊆ ADMIN permissions (incl. `packaging.manage`).

## Permissions (codes only, no role names)
`orders.read/manage/confirm/cancel/reorder/override`, `orders.commercial.read/manage`, `order_batches.read/manage`, `factory_jobs.manage`, `jobs.read_assigned` (My Work), `production_board.read`/`jobs.read_all` (Production). SUPER_ADMIN has them all and is not special-cased. Floor/QC roles never see commercial data (orderView carries no prices or contact data) and have no order screens.

## Tests
`tests/orders-5a.test.tsx` (13): matrix math (totals, zero-removal, id retention, custom colours, outside units), approved-reference selection, create gating/POST/redirect, orders.manage gating, readiness from backend flags, re-approval banner + read-only spec revisions, SALES⊆ADMIN action exposure, override gating/reason/payload, job link; plus bulk variant reporting in `production.test.tsx`. 302 tests total.

## Known limitations
- Order lists have no per-row quick actions; the sales owner shows as Assigned/Unassigned (API returns an id).
- The grid edits one size scale (the configurator's first scale); other scales/custom sizes use the List view.
- Reorder UI is the Phase 3 dialog (clone items + date/priority/notes); quantities are edited on the new draft.
- No packaging/shipments/tracking (5B). Test data: ORD-000011/012, JOB-000005/006 remain as dev data.

## Phase 5B readiness
Order `fulfillment`, `shipments` and `packaging` summaries are returned by the detail endpoint but unused; `force-complete`/`complete` exist already. Next: packaging, shipments, delivery proof, tracking token.
