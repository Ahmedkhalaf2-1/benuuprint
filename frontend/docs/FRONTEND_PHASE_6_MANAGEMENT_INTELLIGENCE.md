# Frontend Phase 6 — Management & Intelligence

Management layer only. No simplified "what should I do next" inbox, no new-request/quotation/payment queues (Phase 6.5), no customer portal or public website.

## Routes
| Route | Content | Needs |
|---|---|---|
| `/dashboard` | Management Dashboard (sections below) | `dashboard.read`; each section by its own permission |
| `/management/production` | Management production board (live jobs, delays, risk, ETA), bottlenecks, WIP | `management_kpis.read` (WIP: `workload.read`) |
| `/management/quality` | Quality KPIs, failures by stage / product, repeat failures | `quality_kpis.read` |
| `/management/commercial` | Commercial KPIs per currency, verified payments in range | `commercial_kpis.read` |
| `/management/delivery` | Delivery KPIs, commitments, order KPIs | `management_kpis.read` |
| `/management/workload` | Department workload, staff workload, capacity vs demand | `workload.read` / `capacity.read` |
| `/management/alerts` | Operational alerts + scheduler state (read-only) | `automation.read` |

The `/analytics` placeholder was removed. Sidebar (Management group): Production overview, Quality, Commercial, Delivery KPIs, Workload & capacity, Alerts — each only with its permission. Quality-only users (QC) keep `/my-work` as home and gain "Quality".

## Live endpoints (all verified; OpenAPI types the bodies as plain `object`, so shapes were read from real responses — see `features/management/types.ts`)
`GET /admin/dashboard` (pipelines only), `/admin/management/{needs-attention, kpis/production, kpis/orders, kpis/quality, kpis/commercial, kpis/delivery, bottlenecks, wip, workload/departments, workload/staff, capacity/utilization, production-board}`, `GET /admin/automation/{alerts, scheduler}`. KPI endpoints take `from`/`to` (YYYY-MM-DD or ISO; the backend turns them into business-timezone day bounds; invalid → 400); needs-attention takes `limit, type, minSeverity`; board takes `stageCode, department, priority, blocked, delayed, kind(SAMPLE|BULK), page, pageSize`; alerts `status(OPEN|RESOLVED), type, severity`.

Permission map (verified by probing SALES and QC): `management_kpis.read` → needs-attention, production/orders/delivery KPIs, bottlenecks, board; `quality_kpis.read` → quality; `commercial_kpis.read` → commercial; `workload.read` → WIP, workload; `capacity.read` → capacity; `automation.read` → alerts, scheduler; `eta.read` → ETA on the board (`etaIncluded`).

## Architecture
- Every dashboard card is its **own query** (`QuerySection`): loading → skeleton; **403 → a quiet "Not available for your role"** (no logout); 429 → "try again shortly"; 5xx → inline retry. One failing endpoint never takes down the page (verified live by forcing the quality endpoint to 500).
- Sections are requested only if the permission is held (a SALES-style user never calls quality/commercial/workload/capacity/alerts). Nothing is joined client-side from other modules.
- Query keys: `queryKeys.management.*` (dashboard, needsAttention, production, orders, quality, commercial, delivery, bottlenecks, wip, workloadDepartments, workloadStaff, capacity, board, alerts, health).
- Refresh: current-state data `staleTime 30 s`, `refetchInterval 60 s`; capacity/staff workload 30–60 s stale, no polling; a Refresh button invalidates `management.*`. TanStack defaults are untouched.
- Date range: `?from=&to=` in the URL with 7d/30d/90d presets (empty = backend default last 30 days). It applies to KPI endpoints and bottlenecks only; current-state data (queues, blocked now, workload, WIP, capacity) is never faked as historical. The business timezone returned by the backend is displayed; no SLA/ETA/date maths is done in the browser.
- Charts: only CSS bars from backend aggregates (inspection result bar, shipment distribution, WIP per stage, bottleneck ranking, utilization heat strip). No time-series endpoint exists, so there are no trend charts.

## Dashboard order (most actionable first)
1. **Needs attention** (backend-ranked; severity and category filters sent to the backend; positive empty state). 2. **Risk strip** (blocked jobs, delayed jobs, delayed orders, orders past target, shipments past schedule, failed deliveries — each a drill-down). 3. Production + Bottlenecks (top 5). 4. Quality, Commercial. 5. Delivery, Orders. 6. Workload, Capacity (7 days). 7. Open alerts, Pipelines.

## Needs attention
Fields used: type, severity, reference, title, reason, priority, responsible (department + users), ageMinutes, dueAt, context. `attentionHref` (pure, tested) opens the entity to act on: stage → `/production/jobs/:id?stage=`, shipment → `/orders/:id?tab=shipments`, payment/commercial → `…?tab=commercial`, packaging → `…?tab=packaging`, sample → `/samples/:id`, else a reference search (`JOB-` / `ORD-` / `SMP-` / `SHP-`). Categories shown are whatever the backend returns (verified live: `UNASSIGNED_READY_STAGE`; the other types are documented in the code but were not triggerable on the dev data).

## KPI handling
- `null` = not computable: shown as "—" with the reason (e.g. "No inspections in range"), **never 0%**; a real 0 shows 0. Applies to pass/fail/repeat rates, on-time rates, lead/cycle/dispatch times, ETA, utilization and staff capacity.
- Commercial: one block per currency (`byCurrency`, `verifiedInRange`), decimal strings formatted per currency, **never summed across currencies**.
- Delay/SLA: uses the backend's `delayed`, `delayReasons`, `delayMinutes`, `projectedLate`; the board shows them per job; `/admin/management/{jobs,orders}/:id/{delay,eta}` exist but are not surfaced as separate screens (Phase 6.5 may link them).
- ETA: `etaView` — HIGH = plain estimate; MEDIUM/LOW carry "Medium/Low confidence — …"; missing = "Not estimable". Callers without `eta.read` get no ETA column.
- Bottlenecks: backend order (accumulated waiting time), table + ranked bars, caution text from the backend; WIP: queued/active/blocked per stage; capacity: demand vs configured capacity per day, `overloaded` from the backend, null utilization "—", departments without capacity listed, assumptions expandable.
- Alerts: severity, open/resolved, escalation level, first/last seen, resolved time; **read-only** (the API has no acknowledge/resolve; dedup/escalation are backend truth). Scheduler card: enabled, intervals, running tasks. Outbox health is not exposed by the API, so it is not shown.

## Role behaviour (permission codes only)
- ADMIN / SUPER_ADMIN: all sections their permissions grant (SUPER_ADMIN: everything).
- SALES (live): `management_kpis.read`, `dashboard.read`, `eta.read` → dashboard with needs-attention, risk, production, bottlenecks, delivery, orders, pipelines; Production overview + Delivery KPIs pages; quality / commercial / workload / capacity / alerts pages are Access denied.
- QC: `quality_kpis.read` only → lands on `/my-work`, sees Quality; everything else denied.

## Tests (`tests/management.test.tsx`, 25; 343 total)
null-vs-zero, ETA wording, attention routing, range parsing, nav permissions, Needs-Attention rendering + backend filters + positive empty, quality null/real values, per-currency separation (no cross-currency sum), permission-scoped requests, section-level failure isolation (500 / 403), risk drill-downs, range forwarding, dashboard access, bottleneck order/positive state, WIP, capacity (overloaded/unknown), management board ETA/links/filters, alerts (severity/state/read-only/filters), workload null handling. The old Phase 1 dashboard tests/components were replaced by these.

## Known limitations
- Needs-attention categories other than unassigned-ready-stage, and OVERDUE/escalated alerts, could not be produced on the (nearly idle) dev data; their rendering is generic and covered by tests.
- No ETA/delay drill-down panel per job/order beyond the board columns; no trend charts (no time-series API); no capacity/SLA configuration screens (the endpoints exist; this phase is read-only).
- The dashboard issues ~10 requests per refresh (one per card) by design for failure isolation.
- Capacity series covers the backend default (next 7 days); the 31-day window is not exposed in the UI.

## Phase 6.5 readiness
Data foundation is in place: `useNeedsAttention`, KPI hooks, `attentionHref`, `QuerySection`/`Metric` primitives and the management query keys. Phase 6.5 can add the workflow inbox (new requests, ready for quotation, awaiting payment, ready for production) on top of these without new infrastructure; those queues will need list endpoints/filters (`/admin/samples`, `/admin/orders`) rather than management KPIs.
