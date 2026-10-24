# Frontend Phase 6.5 — Admin Command Center

`/dashboard` now starts with **what to do next** and the workflow queues; the Phase 6 management intelligence stays underneath. No new backend endpoints, no customer portal / public site.

## Dashboard flow
A. **What to do next** (top 6, ranked) → B. **Workflow queues** (cards, quick filters All / Urgent / Commercial / Production / Delivery) → C. **Needs attention** (Phase 6 list, anchored from the "Needs attention" card) → D. **Operational risk** strip → E. **Management intelligence** (KPIs, bottlenecks, workload, capacity, alerts, pipelines — unchanged, own date range).
Everything clean → "You're all caught up." and the sections below remain. Owner loop: dashboard → click the action → perform it on the exact entity → back to the dashboard (queries refetch on mount) → next item.

## Where each queue comes from (existing list endpoints and real statuses only)
| Queue | Source / rule | Next action → destination |
|---|---|---|
| **New requests** | samples `SUBMITTED` | Review request → `/samples/:id` |
| **Needs review** | samples `AWAITING_APPROVAL`; orders `PENDING_CONFIRMATION` | Record approval decision → `/samples/:id?tab=approvals`; Confirm order → `/orders/:id` |
| **Ready for quotation** | samples `UNDER_REVIEW`; `CONFIRMED` orders with no quotation / a DRAFT quotation / commercial re-approval required (from the order's commercial summary) | Prepare quotation / Send quotation / Re-approve commercial terms → `…?tab=commercial` |
| **Awaiting customer** | samples `QUOTED`; `CONFIRMED` orders whose quotation is `SENT` | Record customer decision → `…?tab=commercial` |
| **Awaiting payment** | samples `AWAITING_PAYMENT`; `CONFIRMED` orders with an ACCEPTED quotation and `releaseGate.satisfied = false` | Verify payment / Record payment → `…?tab=commercial` |
| **Ready for production** | samples `READY_FOR_PRODUCTION` (no job yet); orders `READY_FOR_PRODUCTION` with no live job; `PLANNED` jobs; `CONFIRMED` orders whose release gate is satisfied | Start production → `/samples/:id?tab=production` or `/orders/:id?tab=production`; Release job to factory → `/production/jobs/:id`; Release to production → `/orders/:id` |
| **In production** | factory jobs `READY / IN_PROGRESS / BLOCKED / ON_HOLD` | Resolve blocker (open blockers) · Review overdue stage · Resume job · Assign staff and start · Track progress → `/production/jobs/:id` |
| **Needs attention** | Phase 6 `needs-attention` (backend-ranked) | by category (Resolve blocker, Verify payment, Handle failed delivery…) → `attentionHref` |
| **Ready for shipment** | orders `READY_FOR_DELIVERY`; `PARTIALLY_SHIPPED` orders whose detail shows `shippableQuantity > 0`; shipments `READY` | Create shipment → `/orders/:id?tab=shipments`; Dispatch shipment → the shipment drawer |
| **Delivery issues** | shipments `FAILED`, `RETURNED` | Retry or return delivery / Plan a new shipment → `/orders/:id?tab=shipments&shipment=:id` (opens that shipment) |

Each card: count, what it means, "N urgent", item mix, the first three items with their action link, and **Open queue** (the filtered list: `/samples?status=…`, `/orders?status=…`, `/production…`, `/delivery?status=…`). Status labels are humanized (`Awaiting approval`, `Ready for production`).

## Next-action mapping
Pure functions in `features/command-center/logic.ts` (`classifySample / classifyOrder / classifyJob / classifyShipment / classifyAttention`): **backend status + the caller's permissions + the order's real commercial summary**; no frontend state machine. Permissions only change wording and destination (e.g. `quotations.create` → "Prepare quotation", otherwise "Continue review"; no commercial permission → the plain sample page, never a tab the user cannot open). An order's commercial state is never guessed: without `orders.commercial.read` its `CONFIRMED` orders simply aren't classified.

## Priority rules (deterministic, no scoring engine)
`score = urgency base (critical 300 > high 200 > normal 100) + queue weight + a ≤4.9 waiting-time tie-breaker`; queue weights: delivery issues 60, ready for production 55, awaiting payment 50, new requests 45, needs review 40, ready for quotation 35, ready for shipment 30, in production 20, awaiting customer 10; attention items 70. Urgency comes only from real data: attention severity (critical/warning→high), order priority HIGH/URGENT or delayed, job open blockers / overdue stages / URGENT, failed or returned shipments. "What to do next" shows one action per destination; queue counts are never reduced by that de-duplication (an order and its own planned job count once because they open the same page; shipments of one order stay separate).

## Permission behaviour (codes only)
- A queue appears only if the caller can **act** on it: production queues need `factory_jobs.manage`/`jobs.assign` (ready-for-production also `orders.manage` for "Release to production"), shipment queues need `shipments.manage|dispatch|complete`; commercial queues need the underlying list (`samples.read` / `orders.read`). Attention items in "What to do next" are filtered the same way by category. Read-only access (SALES has `jobs.read_all`, `shipments.read`) does not create factory/delivery tasks.
- Sources are requested only when readable (no `jobs.read_all` → no job call, orders then can't be matched to jobs and READY_FOR_PRODUCTION order tasks are suppressed).
- **ADMIN / SUPER_ADMIN**: every queue their permissions allow. **SALES** (verified live): new requests, needs review, ready for quotation, awaiting customer, awaiting payment, and "Release to production" for commercially cleared orders; no production or delivery queues. **QC / factory** users are not redirected here: they land on `/my-work` and have no Command Center (no source permission).
- Every section is its own query: a failing list marks only the cards that use it ("Some items could not be loaded · Retry"); 403/429 never sign anyone out. Lists refetch when the dashboard is opened; only jobs (30 s) and shipments (30 s) poll via their existing hooks.

## Added to make the "Start production" queue actionable
A sample with status `READY_FOR_PRODUCTION` and no live job had no way to create its production job in the UI. The sample **Production** tab now offers **Create production job** (`factory_jobs.manage`) using the existing job dialog (`POST /admin/samples/:id/create-factory-job`, optionally planned). The sample's job card now links to `/production/jobs/:id`. Shipment deep links (`?tab=shipments&shipment=<id>`) open the shipment drawer directly.

## Verified live (SUPER_ADMIN, SALES, QC)
Seeded real samples/orders/jobs/shipments in each state, then followed each queue's first action: New request → the sample; Ready for quotation → sample/order **Commercial** tab; Awaiting payment → sample **Commercial** tab; Ready for production → sample **Production** tab (created a planned job there; the queue then showed "Release job to factory" → the job); In production → `/production/jobs/:id` ("Resolve blocker"); Needs attention → the failed shipment; Ready for shipment / Delivery issue → the order's shipments tab with the shipment drawer open. SALES saw only commercial queues; QC at `/dashboard` is sent to `/my-work`. The "all caught up" state is covered by a test (the live database always had open work).

## Tests (`tests/command-center.test.tsx`, 18; 360 total)
Next-action mapping per status and permission, order commercial routing (incl. unknown state not guessed, READY_FOR_PRODUCTION job logic), job/shipment/attention mapping and links, actionability (read-only ≠ task), priority ordering/determinism/de-duplication, quick filters, queue membership + counts + exact hrefs, ranked "What to do next", permission-scoped requests (SALES makes no jobs/shipments calls), all-caught-up state, section failure isolation, dashboard order, create-production-job gating. Phase 6 tests were adjusted for the new shipment deep links.

## Limitations
- The sample statuses are mapped one-to-one; "requested changes" (sample returned to DRAFT) and terms acceptance are not separate queues (no distinct backend state to filter on). `IN_PRODUCTION` samples whose job is finished (needing "finish production") are not queued.
- Orders are classified from up to 100 `PENDING_CONFIRMATION…PARTIALLY_SHIPPED` rows; commercial summaries for the first 12 `CONFIRMED` orders and details for the first 8 `PARTIALLY_SHIPPED` orders. Counts above 100 show "+".
- "Awaiting payment" for orders needs the order's release gate; orders whose commercial summary is not readable are omitted.
- Overdue deliveries are in the Phase 6 risk strip (not a queue item): the shipments list has no "overdue" filter.
- Urgency is binary (high/critical vs normal) because that is all the data supports.

## Customer Portal readiness
Unchanged by this phase: customer-facing flows need new auth/endpoints. The queue vocabulary (new request → review → quotation → customer decision → payment → production → shipment → delivery) now maps 1:1 to the states a portal must show to customers.
