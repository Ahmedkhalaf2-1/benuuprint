# Frontend Phase 1 — Foundation + Admin Shell

## Stack
Next.js 16 (App Router) · React 19 · TypeScript 6 strict (`noUncheckedIndexedAccess`) · pnpm · Tailwind CSS 4 · Radix UI (`radix-ui`) ·
Lucide · TanStack Query 5 · TanStack Table **8** (v9 was the npm `latest` but is a different API; pinned to 8) · React Hook Form + Zod ·
cmdk · sonner · Geist (SIL OFL, `geist` package) · Vitest + Testing Library.
TypeScript is pinned to 6 because typescript-eslint does not support TS 7 yet.

## Commands
`pnpm dev` (0.0.0.0:3001) · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test`

## Configuration
`NEXT_PUBLIC_API_URL=http://127.0.1.1:3000/api/v1` in `.env.local` (template: `.env.example`). Read only in `src/lib/config/env.ts`.

## Directory structure
```
src/app/(auth)/login        staff login          src/app/(admin)/*   guarded pages + placeholders
src/app/api/auth/*          same-origin auth BFF (login / refresh / logout)
src/components/ui           primitives (Button, Input, Select, Dialog, Drawer, CommandMenu, ...)
src/components/data-display StatusBadge, PriorityBadge, SeverityBadge, MetricCard, DataTable, Pagination, TableToolbar/FilterBar
src/components/layout       AdminShell, Sidebar, Topbar, PageHeader, Breadcrumbs, Brand
src/components/feedback     EmptyState, ErrorState, AccessDeniedState, skeletons, ModulePlaceholder
src/features/{auth,dashboard,notifications,navigation}
src/lib/{api,auth,permissions,query,config,utils}   src/hooks   src/types   src/styles
```

## Design system
All colours are CSS variables in `src/styles/globals.css` (`:root`), exposed as Tailwind tokens via `@theme inline`. Feature code uses
tokens (`bg-brand`, `text-muted-foreground`, `bg-tone-warning-bg`) and never hex values.
Palette: background `#F6F7F8`, surface `#FFFFFF`, text `#111318`, secondary `#667085`, border `#E4E7EC`, brand `#0F8F6A` / hover `#0B7557`,
success `#16A34A`, warning `#F59E0B`, danger `#DC2626`, info `#2563EB`. Eight semantic status tones (`--tone-*`).
Typography: Geist Sans/Mono + Arabic-safe fallbacks (Noto Sans/Naskh Arabic, Tahoma, Arial). Title 28px, section 20px, card 16px, body 14px, meta 12px.
Radius 6px, compact 36px controls, reduced-motion respected. Logical properties (`ms-`, `ps-`, `start-`, `border-e`) are used so RTL can be added later;
chevrons flip with `rtl:rotate-180`.

## Status / priority / severity
One `StatusBadge` for every domain status (`components/data-display/status.ts` maps code → tone; unknown → neutral). Each tone has a different dot
shape (solid, ring, square, diamond) plus the text label so colour is never the only cue. `PriorityBadge`: NORMAL/LOW subtle text, HIGH amber with icon,
URGENT solid red. `SeverityBadge` (INFO/WARNING/CRITICAL): icon + label + `role="status"` + `aria-label`.

## Auth and session strategy
Backend returns `{accessToken, refreshToken, expiresIn, user}` in the JSON body and has no cookies, so the frontend adds a small same-origin BFF:
* `POST /api/auth/login|refresh|logout` (Next route handlers) call the backend; the **refresh token never reaches JavaScript** — it is stored in an
  **httpOnly, SameSite=Lax, Secure-in-production cookie `bp_rt`** and rotated on every refresh (backend rotation + reuse detection stays authoritative).
  Client IP / User-Agent are forwarded so backend sessions and per-IP rate limits see the real caller (backend needs `TRUST_PROXY` behind a proxy).
* The **access token is held in module memory only** (`lib/auth/token-store.ts`). No localStorage/sessionStorage; tokens are never logged.
* Reload: if the non-secret `bp_session` hint cookie exists, `AuthProvider` calls `/api/auth/refresh` (httpOnly cookie) → `GET /auth/me`. Without the hint there is nothing to restore, so the login page makes no pointless 401 request.
* `lib/api/client.ts`: on 401 a single shared refresh promise runs (no refresh storms), the original request is retried **once**; if refresh fails the
  session is cleared and the user is sent to `/login?reason=expired`. 403 never triggers refresh or logout.
* **Transient refresh failures** (429 / 5xx / network) never sign the user out: the request fails with that error, the cookie is kept, and the startup restore retries (using `Retry-After*`). Only a definitive 401/403 from refresh ends the session. Because the access token is memory-only, every full page reload costs one refresh and the backend rate-limits login+refresh per IP (~10/min).
* Logout: `POST /api/auth/logout[?all=1]` → backend `/auth/logout` or `/auth/logout-all`, cookie cleared, query cache cleared.
* Server layout gate: no cookie → `/login`; root `/` → `/dashboard` or `/login`. Real validation happens on the first API call.

## API layer
`lib/api/client.ts` (`api.get/post/put/patch/delete`): base URL, Bearer auth, JSON + `FormData`, `AbortSignal`, query serialisation, typed results.
`lib/api/errors.ts` normalises `{statusCode,error,message,path,timestamp,requestId}` into `ApiError` (`kind`: validation, unauthorized, forbidden,
not_found, conflict, rate_limited, server, network, aborted; `retryAfter` from `Retry-After`). 5xx messages are replaced by a generic text;
`requestId` is shown in `ErrorState` and the login error for support.

## TanStack Query
`lib/query/client.ts`: `staleTime` 30 s, `gcTime` 5 min, no refetch on focus, mutations never retried, queries retry only network/5xx (max 2) — **never
401/403/404/409/422/429**. Keys: `[domain, scope, ...params]` in `lib/query/keys.ts`; invalidate by domain prefix after mutations.

## Permissions
`createPermissionChecker(perms)` → `can`, `canAny`, `canAll`; exposed through `useAuth()`. Permissions are exactly what `/auth/me` returns (never derived
from role names). `features/navigation/nav-config.ts` items carry `{label, href, icon, requiredPermissions, match}`; `filterNav` drops items and empty
sections; `AdminGuard` applies the same rule to the route → **Access denied** page (never a redirect to login). UX only; backend is authoritative.

## Verified backend contracts (live backend, 2026-10-21)
* `POST /auth/login` → `{accessToken, refreshToken, tokenType:"Bearer", expiresIn, user}`; `POST /auth/refresh {refreshToken}` → same without `user`
  (the refresh token **rotates**; replaying the old one → 401 and the session is revoked); `POST /auth/logout` → 204; afterwards `/auth/me` → 401
  "Session is no longer valid" and refresh → 401.
* `GET /auth/me` (= `login.user`) → `{id, name, email, roles: string[], permissions: string[]}` (SUPER_ADMIN 86 permissions, SALES 33, QC 11).
* `GET /admin/dashboard` (`dashboard.read`) → `{generatedAt, timezone, needsAttention:{generatedAt, summary:{total, bySeverity, byType}, items[], note},
  pipeline:{samples:{draft, review, commercial, production, awaitingApproval, approved, completed, onHold, closed}, orders:{draft, confirmed, ready,
  production, packaging, delivery, delivered, completed, onHold, cancelled}}, production:{range, activeJobs, plannedJobs, blockedJobs, delayedJobs,
  completedToday, completedThisWeek, onTimeCompletionRatePercent|null}, orders:{inProduction … delayed, onTimeDeliveryRatePercent|null,
  averageCycleTimeMinutes|null}, delivery:{draft, ready, dispatched, inTransit, failed, deliveredInRange, returnedInRange}, quality:{passRatePercent|null,
  failRatePercent|null, openRework, rejectedUnits}, workload:[{department, ready, inProgress, blocked, overdue, unassignedReady}],
  commercial:{byCurrency[], orders:{unpaid, partiallyPaid, paid, withoutAcceptedQuotation, commercialReapprovalRequired}}}`.
  KPI metrics are flat (no `current` nesting). Metrics that cannot be computed are `null` and are not shown.
* **Permission behavior:** SALES receives `needsAttention, pipeline, production, orders, delivery` (+ `generatedAt`, `timezone`); `quality`, `workload` and
  `commercial` are **absent**. QC gets 403 on `/admin/dashboard`. Restricted endpoints (commercial/quality KPIs, workload departments, `/admin/users`,
  `/staff/my-workload`) return `403 {"message":"Insufficient permissions"}` when the permission is missing.
* `GET /staff/notifications` → `{data[], meta:{page,pageSize,total}, unreadCount}`; `GET /staff/notifications/unread-count` → `{unreadCount}`.
* Rate limit: the 9th failed login in a burst → `429 {"statusCode":429,"error":"TOO_MANY_REQUESTS","message":"ThrottlerException: Too Many Requests"}` with
  headers `X-RateLimit-*` and **`Retry-After-auth: <seconds>`** (named throttler, not `Retry-After`). The client accepts either and shows its own wording.
* CORS allow-list contains `http://localhost:3001` only (`127.0.0.1:3001` and `127.0.1.1:3001` get no `Access-Control-Allow-Origin`).
* **Not confirmable on the dev database (it holds no data):** the fields of individual Needs-Attention items (taken from PHASE_6A §5), the entries of
  `commercial.byCurrency` (rendered generically: `currency` + decimal-string fields, never summed), and the fields of a notification item (PHASE_6B §4).
  Re-check these as soon as real data exists.

## Dashboard
`features/dashboard`: `parse.ts` guards absent sections only; `dashboard-view.tsx` renders KPI row, Needs Attention (severity, reference, title, reason,
priority, responsible, age, due), Sample/Order pipelines (backend key order, camelCase keys labelled), Production/Orders/Delivery/Quality/Commercial summary
cards, and the department workload table. Absent sections and null metrics are not rendered (no fake zeros). Ages and delays are backend minutes; the
frontend contains no ETA/SLA/delay logic. Pipeline bars are width ratios of backend counts only.

## Landing page and permissions behavior
Users without `dashboard.read` (e.g. QC) are redirected from `/dashboard` to their first allowed page (`landingPath`: QC → Production). There is no
QC-specific landing page in Phase 1 (the QC page is a placeholder); `quality_kpis.read` currently only makes **Analytics** visible. 403 responses never
log the user out or trigger a refresh; forbidden routes show **Access denied**.

## Notifications
Bell: `GET /staff/notifications`, `GET /staff/notifications/unread-count`, `POST /staff/notifications/:id/read`, `POST /staff/notifications/read-all`.
Unread count polls every 60 s.

## Tables
`DataTable` takes the backend envelope `{data, meta:{page,pageSize,total}}`; pagination, sorting and filtering are server-side (`manual*`).
`useListParams` keeps `page, pageSize, search, sort, direction` and any filter in the URL (shareable); changing anything except `page` resets to page 1.
Columns opt into sorting with `meta.sortKey`.

## Files, QR, Tech Pack, public tracking
`FileDropzoneShell` only hands `File` objects to a callback; assets are private and future access must use backend signed routes. No QR, Tech Pack or
public tracking UI (architecture-compatible: add routes outside the `(admin)` group for public tracking).

## Tests (`pnpm test`, 67 tests)
API client (refresh coordination, single retry, 401/403/429, network, multipart), error normalisation, auth (login success/error/429/validation, session
restore, logout, protected route, access denied, user normalisation), permissions and nav filtering, status/priority/severity badges, loading/empty/error/
access-denied states, dashboard (backend shape, severity, commercial hidden/shown, no fake zeros), notification bell (unread, mark read, mark all).

## Known limitations
1. Unverified against real data (empty dev database): Needs-Attention item fields, `commercial.byCurrency` entries, notification item fields.
2. CORS: use `http://localhost:3001`. To use `127.0.1.1:3001` (the Ubuntu VM) add it to the backend `CORS_ORIGINS`.
3. Backend login throttling is per IP (~8 failed attempts per minute); repeated automated logins will hit 429.
4. Dates are shown in the browser locale; the dashboard shows the backend `timezone` (Africa/Cairo) next to "Updated".
5. QC has no dedicated landing page; Production/QC/Master Data/Notifications are placeholders in Phase 1.
6. Command palette lists navigation only (no backend global search).
7. TanStack Table 8 is pinned (v9 is `latest` on npm); TypeScript 6 is pinned for typescript-eslint.

## Phase 2 recommendations
Verify contracts against live Swagger and generate/refine types; Customers + Brands (first real `DataTable` + forms); Samples list/detail with action routes;
notifications page; "my workload" landing for floor roles without `dashboard.read`; Playwright smoke tests; RTL/Arabic switch.
