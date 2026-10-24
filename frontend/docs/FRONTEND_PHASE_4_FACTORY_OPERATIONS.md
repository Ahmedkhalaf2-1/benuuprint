# Frontend Phase 4 — Factory Operations

Scope: production board, factory jobs, job detail, **My Work**, stage actions, assignments, blockers, notes/files, bulk quantity reporting, QC execution, rework and the JobActivity timeline. Not built: shipments/delivery, public tracking, management KPIs, capacity/ETA, notifications, QR cards, tech packs.

## Routes

| Route | Screen | Needs |
|---|---|---|
| `/production` | Board (default) and Table (`?view=table`) | `production_board.read` or `jobs.read_all` |
| `/production/jobs/[id]` | Job detail, tabs `?tab=stages\|qc\|rework\|timeline`, stage drawer `?stage=<id>` | same |
| `/my-work` | My stages / My jobs (`?tab=jobs`), drawer `?stage=<id>` | `jobs.read_assigned` |

The QC placeholder route was removed; QC staff work from My Work. Unauthorised visits show *Access denied* in the shell; a 403 never signs the user out and never renders zeros.

## Backend contract (verified live)

- Board: `GET /admin/production/board` — columns come from the backend. Params sent by the board: `status` (CSV), `priority`, `delayed`, `blocked`, `assignedUserId`, `unassigned`, `productTypeId`.
- Table: `GET /admin/factory-jobs` — `sort` ∈ `newest|oldest|priority|target`, **no direction param** (400 otherwise).
- Job: `/admin/factory-jobs/:id` + `/blockers`, `/notes`, `/timeline` (JobActivity, oldest first — the UI shows newest first), `/qc-inspections`, `/rework`.
- Job actions: `release`, `hold`, `resume`, `cancel` (reason), `force-complete` (reason), `PATCH priority`, `notes`, `blockers`.
- Stage admin: `/admin/job-stages/:id/{assignments,hold,resume,override,rework,blockers}`, `/admin/blockers/:id/resolve`.
- Staff: `/staff/my-stages`, `/staff/my-jobs`, `/staff/job-stages/:id` (+ `start`, `complete`, `blockers`, `notes`, `assets`, `production-reports`, `files/:assetId/download-url`, `qc/start`), `/staff/blockers/:id/resolve`, `/staff/qc-inspections/:id/{results,photos,complete}`.
- Assignment eligibility (backend-enforced): active, holds `stages.start`, role in the stage definition's `eligibleRoleCodes`. The dialog filters the staff search the same way. SUPER_ADMIN is not eligible, so admins assign staff rather than operate stages.

## Design rules

- **The backend state machine is not re-implemented.** The stage drawer shows exactly the staff `allowedActions` (`START`, `COMPLETE`, `RAISE_BLOCKER`, `START_QC`, `ADD_NOTE`, `ATTACH_FILE`). A READY QC stage offers *Start stage* first; *Open inspection* appears once it is in progress.
- The staff work view (`/staff/job-stages/:id`) is rendered generically (`TaskViewPanel`): task-view keys differ per department and come from the frozen specification; empty fields are skipped.
- Manager actions (assign/unassign, hold/resume stage, override complete/skip, manual rework, blockers) are shown by permission and need no assignment. Overrides and job-level hold/cancel/force-complete require a reason (min 3 chars) and are styled as overrides; they appear in the timeline as `ADMIN_OVERRIDE`.
- SALES (`jobs.read_all`, `production_board.read`) is read only: no operational mutation controls.
- Floor roles see only their stages (`/staff/*`); they never call the board or `/admin/factory-jobs`.

## Quantities, blockers, files

- Bulk jobs only (`quantity != null`): required / produced / rejected / rework-flagged / remaining, an append-only report form (partial reports allowed), and the report history. Over-reporting is refused by the backend and its message is shown verbatim with the entered values kept.
- Blockers: raise (type + description) from the stage (staff or admin) or the job; resolve with a note. A blocked stage only offers notes/files (backend `allowedActions`).
- Files: private; the signed URL is requested **on click**, resolved against the API origin and opened once; storage keys are never shown. Staff upload through `/staff/job-stages/:id/assets` (the admin asset route is not used).

## QC

- The checklist is built from the inspection's `results[]` (`PASS_FAIL`, `NUMBER`, `MEASUREMENT`, `TEXT`, `PHOTO_REQUIRED`); required items gate the *Complete* button; results are saved (PUT) before completing.
- Completion: overall PASS / CONDITIONAL_PASS / FAIL, notes (required for non-PASS), bulk inspected/passed/failed (passed + failed must equal inspected), optional rework target (only when the stage definitions are readable). Backend refusals (e.g. a plain PASS with failed items) are shown verbatim.
- A FAIL creates rework; the job's stage list keeps the superseded attempts (greyed, "history") next to the new attempt; the Rework tab lists records with reason, target stage and affected units.

## Timeline

*Timeline* is **JobActivity** (`/timeline`), the operational history of the job. The security **AuditLog** is a separate feature and is never shown here.

## Refresh

Light polling (30 s) on the board, jobs lists and job detail; no websockets. Mutations invalidate only the stage, the caller's work lists, the job (blockers/notes/timeline/QC/rework), the board/jobs lists and the linked order's production summary.

## Tests

`tests/production.test.tsx` (19) + updated `permissions.test.ts` / `orders.test.tsx`: nav permission, board params, assigned-work-only, start payload/error, complete payload/validation, assignment eligibility and permission, quantity report payload and over-reporting error, blocker create/resolve, QC checklist types, required-result gating, pass/fail workflow, failed-quantity rules and rework rendering, rework history, private download, JobActivity vs AuditLog, read-only roles, 403 without sign-out.

## Known limitations

- Bulk quantity reporting was verified by tests and the live contract only; no bulk job was run through the UI end to end.
- Per-variant reporting (`orderVariantId`) is supported by the form but variants are not offered yet (the staff view's `orderView` shape was not mapped).
- The job-level internal-notes field is shown but not editable; notes are added as job/stage notes.
- Rework target choices for floor QC use the workflow default (stage definitions are an admin read).
- Admin blocker resolve from the stage drawer uses a fixed note; resolve from the Overview tab asks for one.
