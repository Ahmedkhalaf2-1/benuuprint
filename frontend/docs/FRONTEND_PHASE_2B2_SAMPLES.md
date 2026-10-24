# Frontend Phase 2B.2 — Samples

Admin sample workflow on the live backend. Not built (by design): quotation/payment workflows, order creation, production board, QC screens (Phase 2C+).

## Routes
`/samples` · `/samples/new[?customerId=]` · `/samples/[id]?tab=overview|specification|decorations|artwork|notes|approvals|commercial|production` · `/samples/[id]/edit` (DRAFT only).

## Live contracts used (OpenAPI + live responses)
* **List** `GET /admin/samples`: `page, pageSize, search` (number, customer number/name/email/phone, brand), `status` (comma-separated or repeated), `customerId, brandId, assignedSalesUserId, unassigned, productTypeId, fabricId, paymentState, approvalState, createdFrom/To, submittedFrom/To, includeArchived, sort` (`newest|oldest|updated|submitted|sampleNumber`). **A `direction`/`sortOrder` parameter is a 400** — `useListParams` gained `directionParam: null` for this. Rows: number, status, paymentState, revisionNumber, customer, brand, productType|customProductName, fabric|customFabricName, assignedSales `{id,name}`, submittedAt/approvedAt/createdAt/updatedAt.
* **Detail** `GET /admin/samples/:id` adds every spec field, `decorations[] accessories[] components[] attachments[] termsAcceptances[]`, `holdPreviousStatus`, `revisionOfId` and **`allowedActions: string[]`** (computed by the backend from status + the caller's permissions: `submit, cancel` on a DRAFT; `start-review, request-changes, hold, reject, cancel` when SUBMITTED; `resume, reject, cancel` when ON_HOLD…).
* **Create/update** `POST/PATCH /admin/samples[/:id]` (PATCH rejects `status`; `null` clears; catalogue/custom pairs are exclusive and switched explicitly). **Lifecycle** `POST /admin/samples/:id/{submit,review,request-changes,hold,resume,reject,cancel,complete,revise,assign-sales}` (reason required for hold/reject/cancel/request-changes; note `start-review` → route `/review`).
* **Parts** `POST …/{decorations,accessories,components}`, `PATCH/DELETE /admin/sample-{decorations,accessories,components}/:id`; **files** `POST /admin/assets` (multipart `file`,`type`) then `POST/DELETE /admin/samples/:id/assets` (types REFERENCE, MOCKUP, SIZE_CHART, ARTWORK, OTHER; DRAFT only); **artwork** `GET/POST /admin/artworks`, `POST /admin/artworks/:id/versions`; **approvals** `GET/POST /admin/samples/:id/approvals`, `POST /admin/approvals/:id/{approve,reject,cancel}`; **notes** `GET/POST/DELETE …/notes`; **terms** `GET /admin/terms`, `POST …/terms-acceptances`; **history/commercial/specs** `GET …/status-history`, `…/commercial-summary`, `…/production-specs`; **jobs** `GET /admin/factory-jobs?search=&sourceType=SAMPLE_PRODUCTION`.
* Validation errors are `message: string[]` of `"<area>: <message>"` (e.g. `terms: the active sample terms (version 1) must be accepted before submitting`).

## Permissions (verified live)
| Capability | Permission |
|---|---|
| list / view | `samples.read` |
| create, edit draft, parts, notes | `samples.manage` |
| submit / review actions | decided by `allowedActions` (backend) |
| assign sales | `samples.assign` (SUPER_ADMIN/ADMIN only; SALES gets 403) |
| upload files / artwork | `assets.manage` (+ `samples.manage`) |
| record/request approvals | `approvals.manage` |
| commercial tab | `quotations.read` or `payments.read` (API: SALES 200, QC 403) |
| production job card | `jobs.read_all` |
| staff search for assignment | `users.read` (without it only "Assign to me") |
| terms text | `/admin/terms` (falls back to the configurator terms when forbidden) |
Actions are shown from `allowedActions`; the UI never runs its own state machine. Hidden controls are UX only.

## Samples list
`DataTable` (server paging) with columns number (· revision), customer, brand, product (custom marked), fabric, status, payment, sales, submitted, updated; search + status multi-select + sort inline, **More filters** drawer for customer, product, fabric, payment state, approval state, unassigned, "assigned to me", created/submitted ranges, include archived. Everything is in the URL. Distinct empty states; row menu View / Edit draft.

## Create / edit
Section form (`sample-form.tsx`) with a section navigation (anchors) and a fixed bottom action bar (Save draft / Submit / Cancel; content has bottom padding so nothing is covered on mobile). Sections: customer & brand → product → fabric & colour → size & fit → decoration → accessories & packaging → instructions → files & artwork → terms.
* **Draft behaviour:** only format validation on save (hex, gsm, lengths; customer + brand required). Completeness is the backend's submit check. Parts that are separate API objects (decorations, accessories, files, artwork, terms) are available once the draft exists: after the first *Save draft* the editor reopens with them; each part saves immediately, the form fields save with *Save draft*.
* **Customer/brand:** customer picker (2A) on create (fixed afterwards); brand select lists only that customer's brands and resets when the customer changes (no global brand list exists).
* **Product:** catalogue (configurator) OR custom name + description — never both; switching sends the other side as `null`.
* **Fabric:** catalogue (recommended fabrics first, "not advised" labelled, nothing blocked) OR custom name/description. Provider enum rendered as sentences. GSM shows the fabric's range as a hint; the server enforces it.
* **Colour:** catalogue colour (swatch chips with hex/Pantone; no-hex colours get the striped fallback) OR custom name/Pantone/hex. A custom fabric uses a custom colour (a catalogue colour must belong to a catalogue fabric).
* **Size & fit:** sizes from the configurator; fit BENUE_PATTERN requires choosing an **approved pattern version** (value = `patternVersionId`, from the 2B.1 adapter; cleared for other fits); COPY_CUSTOMER_PIECE points to notes + reference files; CUSTOM_SIZE_CHART warns that a SIZE_CHART file is required.
* **Decorations:** `DecorationsEditor` — print method, placement, side, size + unit, colour count, notes, artwork-required, linked artwork (sample's or brand's). "No print" = zero rows.
* **Accessories & labels/packaging:** catalogue option or free text (exactly one), quantity/notes.
* **Instructions:** six separate textareas (request, fit, print, fabric, special, factory-internal).
* **In-app unsaved-changes guard** (`useUnsavedGuard`): beforeunload + capture-phase interception of internal link clicks with a confirm dialog. The browser Back button is not intercepted (documented limitation).

## Submit
`POST …/submit` through the action dialog. Backend problems are shown as **"N items need attention"** with each message linked to its section (`sectionForProblem`); inside the form the links are anchors, from the detail page they open the editor at the section. Dirty fields are saved first.

## Detail
Header (number, product, status + payment badges, customer/brand links, sales), backend-driven action buttons, `StatusTimeline` (non-interactive; ON_HOLD keeps the held position and shows the reason from history; REJECTED/CANCELLED end it), tabs: Overview (facts + status history), Specification (read-only spec incl. custom values, notes in separate fields, factory instructions marked internal, accessories, terms), Decorations, Artwork & files, Notes (INTERNAL default; CUSTOMER_VISIBLE labelled "stored, not shown yet"), Approvals, Commercial, Production.
* **Review/hold/reject/cancel/resume/request-changes/complete/revise:** `ActionDialog` — reason required where the backend requires it; `revise` navigates to the new revision.
* **Assign sales:** dialog with remote staff search (needs `users.read`) or "Assign to me"; "Remove sales owner".
* **Artwork:** versions newest first, APPROVED visually distinct and never replaced (a new file is a new DRAFT version), rejection reasons, signed download, *Request approval* on drafts.
* **Approvals:** wording is "Record approval/rejection" — either *on behalf of the customer* (source/evidence required) or an internal decision; rejecting a physical sample requires a reason; quotation approvals are labelled "Handled in quotations".
* **Terms:** shows title, version, effective date and text; acceptance is "recorded by staff on the customer's behalf" with a required source note and an explicit version confirmation.
* **Production:** frozen specs labelled **Pre-production** (manufacture the physical sample) vs **Approved reference** (baseline for bulk), revision, frozen date, fingerprint, "Frozen — read only", snapshot viewer without edit controls; job card (number, status, dates, link to /production) from the sample-production job search. Revision link when `revisionOfId` is set.
* **Commercial:** summary (quotation number/status, totals in the quotation currency, verified/pending payments) and "View quotation" → the Phase 1 placeholder. A 403 shows a restricted message, never zeros.

## Query keys / invalidation
`samples.list/detail/notes/approvals/history/commercialSummary/productionSpecs/production`, `artwork.bySample/byBrand`, `terms.active`, `staff.search`. Draft save → detail + lists; part change → detail; action → detail + lists + history; artwork → artwork list; approval decision → approvals + artwork + detail/lists. Master data comes from the cached `useConfiguratorOptions` (one request).

## Live verification
Created through the real UI as SUPER_ADMIN: customer → brand → product → fabric → custom colour → size → fit → decoration (artwork required) → accessory + custom label → reference file → artwork → *Save draft* → edit → link artwork → **submit rejected** with "Terms: …must be accepted" → record terms (version 1) → request artwork approval → **submit** → SUBMITTED → artwork approval recorded on behalf (v2 added afterwards, approved v1 kept) → note → assign sales → start review → hold (reason) → resume → reject on a second sample. As SALES: catalogue fabric with swatch colours (no-hex fallback), recommended-first ordering and a **BENUE_PATTERN sample pinning an approved pattern version** (throw-away approved pattern created via the API). Terms, signed downloads and history verified.
| Role | Result |
|---|---|
| SUPER_ADMIN | everything incl. Assign sales |
| SALES | list/create/edit/submit-path actions, notes, approvals, commercial summary, production card, uploads; **no Assign sales** (403); decision/request buttons via `approvals.manage` |
| QC | no Samples navigation, `/samples` and `/samples/:id` show Access denied (API 403), session stays |
Test data (`ZZ…`) was cancelled/archived or removed; an uploaded test file remains in storage.

## Responsive
Real browser at 1440 / 1024 / 768 / 390: samples list, filters drawer, detail (+ Specification, Decorations, Artwork & files, Approvals, Production tabs) and the edit form (action bar, sections, upload area): no page-level horizontal overflow. Section nav scrolls horizontally on small screens; decoration/accessory fields stack; the action bar wraps and the form has bottom padding.

## Tests (`pnpm test`: 222 total, 78 new)
`samples-logic.test.ts` (payload builders for catalogue/custom product, fabric, colour, size, fit, pattern; draft validation; action mapping; problem→section) and `samples-ui.test.tsx` (list params/filters/pagination/empty/error; timeline; form conditional fields, BENUE_PATTERN, draft save, field errors, unsaved-changes guard; decorations; detail actions from `allowedActions`, hold/reject reasons, submit success/failure summary; spec/notes/approvals/terms/files/artwork/commercial/production incl. 403s and permission hiding; upload success/failure; role gating).

## Fixes made along the way
* `useCustomer('')` requested the customer **list** and cached it as a customer (it broke prefilled customer pickers); the hook is now `enabled` only with an id (also fixes the Brands page picker).
* Duplicate DOM ids (`sec-files`, `sec-accessories`) removed.

## Known limitations
* Production spec snapshot is shown as read-only JSON (its structure is backend-defined; no dedicated rendering yet). PRE_PRODUCTION/APPROVED_REFERENCE display was verified with fixtures only: a dev sample cannot reach production without quotation/payment (Phase 2C).
* Quotation/payment/production creation, order creation and tech pack screens are out of scope; "View quotation" links to the placeholder.
* Brand-owned (reusable) artwork can be linked to decorations but is created/managed only for the sample here.
* Staff search for assignment requires `users.read`; the backend rejects non-sales staff with its own message.
* No upload progress bar (fetch limitation): a busy indicator is shown; file limits (types, 20 MB default) are enforced by the server.
* Browser Back is not intercepted by the unsaved-changes guard.
* `request-changes` etc. depend on the backend's `allowedActions` names; unknown names are ignored.

## Phase 2C prerequisites
Sample `allowedActions` + `READY_FOR_PRODUCTION` flow, quotation list/versions/line items, accept/reject with evidence, payments with private proof upload and verification (finance permissions), and the commercial permissions already mapped here (`quotations.*`, `payments.*`). The commercial tab and summary types are ready to be replaced by real screens.
