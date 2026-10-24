# Frontend Phase 3 — Orders & Bulk Production (admin)

No Factory Operations, Delivery or packaging UI (later phases).

## Routes
`/orders` (list) and `/orders/[id]` (tabs `?tab=overview|variants|batches|production|commercial|history`). **There is no standalone create route:** the backend creates an order from an APPROVED sample (`POST /admin/samples/:id/create-order`), so the sample page shows **Create bulk order** (samples `APPROVED`/`COMPLETED`, `orders.manage`). Sidebar "Orders" needs `orders.read`; unauthorised visits show Access denied in the shell.

## Live contracts used (verified live + docs)
* List `GET /admin/orders`: `page,pageSize,search,status(csv),assignedSalesUserId,priority,customerId,brandId,sourceSampleId,productionStatus,delayed,createdFrom/To,targetBefore,readyForDelivery,delivered,shipmentStatus,paymentState,packagingComplete,sort(newest|oldest|target|priority|orderNumber)` — single `sort`, **no direction** (400 otherwise). Rows carry quantities, progress %, `isDelayed`, `paymentState`, `assignedSalesUserId` (an id only: shown as Assigned/Unassigned).
* Detail `GET /admin/orders/:id` (items+variants, batches, factoryJobs, productionSummary, fulfillment, recentActivities, `currentSpec`, `approvedReference`). **No `allowedActions`:** buttons are gated by permission + obvious state and the backend's refusal message is always shown.
* Lifecycle `POST …/{submit,request-changes,confirm,ready,hold,resume,cancel,revise,reorder}`, `PATCH …/priority`, `PATCH /admin/orders/:id` (sales owner, date, notes), `PUT …/items` (DRAFT only), `GET …/{production-summary,activities,revisions,commercial}`.
* Batches `POST /admin/orders/:id/batches`, `PUT /admin/order-batches/:id/allocations`, `POST …/{ready,hold,resume,cancel}`; jobs `POST /admin/orders/:id/create-factory-job` (whole order, no batches) and `POST /admin/order-batches/:id/create-factory-job` (READY batch).
* Commercial: `GET/POST /admin/orders/:id/{quotations,payments}`, versions via the shared `/admin/quotations/:id/versions` and `/admin/quotation-versions/:id[/send]`, customer decisions via **`/admin/order-quotation-versions/:id/{accept,reject}`**, payments via the shared `/admin/payments/:id/*`.
* **Contract differences found:** the order commercial summary is *flat* (`quotationNumber`, `quotationVersionId`, `quotationStatus`) and has no version number — normalised to the sample shape in `commercial/api.ts`; it also returns `overpaid`, `reapprovalRequired` and a `releaseGate`. A DRAFT order has to be **submitted** before it can be confirmed, and `PUT /items` is DRAFT-only (use *Request changes* to reopen).

## Order flow in the UI
DRAFT → **Variants** (editor) → *Submit for confirmation* → *Confirm order* (review dialog: product, quantity, variants, target date, approved reference; server re-validates) → CONFIRMED (spec frozen) → *Release for production* (backend commercial gate: accepted quotation + required payments; refusal reason shown) → batches/jobs → production. Hold/Resume (reason), Cancel (`orders.cancel`, reason), Priority, Sales owner (generic `StaffAssignDialog`, shared with samples), Reorder.

## Variants and quantities
`VariantsEditor` (DRAFT): item quantity + rows of size (catalogue or custom) × colour (catalogue colour of the **sample's fabric**, or custom name/Pantone/hex) × quantity; rows keep their ids so history stays valid; an order without items starts a **new** item (no id). Always shown: *Order quantity / Variant total / Difference* (editing aid only). Totals are never auto-corrected; a mismatch is flagged in the confirm review and the server's exact message is shown on refusal (e.g. "Item 1: the variants add up to 90 but the item quantity is 100"). After confirmation the editor is replaced by a read-only table (ordered / allocated / completed / rejected) and a "frozen" note.

## Approved reference
Overview shows an **Approved production reference** card (kind, revision, fingerprint, source job) marked "Frozen — read only", states that bulk production never uses the pre-production spec, and shows the frozen **order specification** revision. No edit controls.

## Revisions
*Revise* (`orders.manage`, confirmed orders): mandatory reason, target date, notes, and optionally quantities/variants (the backend refuses while batches/jobs exist or once production started; message shown). History tab: revisions newest first with reason and — from the backend — **commercial impact** and `commercialChanges`, plus the operational activity timeline. The commercial tab then shows **Commercial reapproval required**, the ended quotation as "Ended by revision N" (never current) with its old terms, verified payments still credited and the backend's remaining balance.

## Commercial reuse
`features/commercial` is now parameterised by `CommercialTarget {kind: "sample"|"order", id}` (routes, decision endpoint, summary, query keys and invalidation); `CommercialSection` serves both and adds the order **release gate**. Order quotation versioning, decisions, payments, private proof upload/download and finance verification are the Phase 2C components unchanged.

## Batches and jobs
`BatchesPanel`: batch list with allocations, dates, job link; **allocation editor** (ordered / in other batches / this batch / remaining, from backend counters) with ISO dates; edit allocations only while PLANNED; Mark ready, Hold/Cancel (reason), Resume; job creation only with `factory_jobs.manage` for a READY batch without a job. Whole-order job from the Production tab only when READY_FOR_PRODUCTION with no batches/jobs. Job numbers link to `/production` (placeholder — no job screen is built). Over-allocation and other backend errors are shown verbatim and nothing is auto-corrected.

## Production tab
Read-only `GET …/production-summary`: planned / completed / remaining / open rework / rejected, **backend** `progressPercent` (units through the final stage ÷ deliverable units), jobs with current stage (`accounted/required`), active/blocked/delayed stages, target-date flag.

## Permissions (verified live)
`orders.read` list/detail · `orders.manage` create-from-sample, items, submit/request-changes/ready/hold/resume/revise, priority, owner · `orders.confirm` confirm · `orders.cancel` cancel · `orders.reorder` reorder · `order_batches.read` batches tab · `order_batches.manage` batches · `factory_jobs.manage` jobs · `orders.commercial.read` commercial tab · quotations/payments/approvals as in Phase 2C (`payments.verify` verify).
SALES: list/detail, create, edit, confirm, release, reorder, quotation workflow, payments (no verify); no batches/jobs/cancel (403/hidden). 403 sections show restricted states, never zeros, and never sign out.

## Tests (`pnpm test`: 270 total; 26 new in `tests/orders.test.tsx` + shared Phase 2C suite re-run)
List access/params; create-from-sample (button gating, POST, unapproved-sample refusal shown); variant payload, new-item payload, validation; quantity summary and mismatch (review warning + backend 409, no auto-fix PUT); confirm flow and gating; frozen state; revision refusal and history/commercial impact; reapproval after revision; order quotation/payment routes and flat summary; finance vs SALES verification; 403 commercial; batch payload and allocation table; over-allocation; batch/whole-order job creation and gating; production summary values; reorder (new order, original untouched, refusals shown); hold/cancel gating.

## Live verification (real UI, SUPER_ADMIN + SALES)
Approved sample → *Create bulk order* → variants (90 vs 100 shown) → submit → confirm **refused by the backend with the exact mismatch** → request changes → fix → submit → confirm (spec revision 1) → order quotation created/sent/accepted → release refused by the commercial gate (reason shown) → **SALES** recorded a payment with proof (no verify buttons) → SUPER_ADMIN verified → gate met → release → batch with allocations (over-allocation refused with the backend message) → ready → batch factory job → Production tab matches backend → date revision (history) → quantity revision refused → reorder created a new draft, original unchanged. Layout sanity: orders list at 1440, list/detail/variants at 390: no overflow.

## Bugs found and fixed
* The order commercial summary's flat quotation fields were not understood (accepted quotation looked absent, payments disabled): normalised.
* An order with no items had no way to add the first variant: editor starts a new item.

## Known limitations
* Sales owner is shown as Assigned/Unassigned (the API returns only an id); names resolve only in the assign dialog (`users.read`).
* No packaging/shipments/delivery, no multi-item UI beyond what the API writes (one product per order) — the editor loops over items.
* Order list has no per-row quick actions; no bulk actions.
* Jobs link to the `/production` placeholder.
* Test records: ZZ orders were cancelled; their approved samples are completed (not archivable while referenced).
