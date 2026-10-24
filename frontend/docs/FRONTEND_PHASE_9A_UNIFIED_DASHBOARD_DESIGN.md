# Frontend Phase 9A — Unified dashboard design

Scope: visual/UX only. No change to routes, API contracts, permissions, `allowedActions`, auth, sessions, queries or workflows. The public site is not redesigned.

**Verification status:** the staff and customer *sign-in* screens, and the build, lint, typecheck and 493 tests, were checked. Signed-in staff and customer screens were **not** visually verified (no login was provided, by choice); they inherit the new look through shared tokens and components and should get a visual review.

## Shared design tokens (`styles/globals.css`)
One brand foundation, `--benue-*` (bg, surface, surface-raised, surface-sunken, text, text-muted, border, border-strong, emerald / -deep / -deeper / -soft, success, warning, danger). Both layers read from it:
- application tokens (`--background`, `--surface`, `--foreground`, `--border`, `--brand`, …) now map to the dark Benue values, so every existing component re-themes through the same names;
- public tokens (`--pub-*`) alias the same values (identical output, so the public site is unchanged).
`--brand` is the bright emerald for text/borders/rings/progress; `--brand-fill` (+hover) is the deep emerald with white text for solid fills, the same CTA colour as the public site. Status tones were re-tuned for dark (tinted surface / light text / vivid dot). Radii tightened (4 / 2 / 6 px). `html` is `color-scheme: dark`. The few hardcoded greys were replaced by tokens.

## Visual system
Dark near-black base, charcoal surfaces, warm-white text, emerald as the only accent, amber/red only for warning/danger. Thin rules, small mono uppercase labels (`Eyebrow`, breadcrumbs, table headers, field captions), tabular numerals for KPIs; page titles are `text-3xl` (not marketing-sized) so screens stay dense.

## Shared components (evolved, not wrapped)
- **Button:** primary = emerald fill/white text; secondary = outlined; ghost = minimal; danger = restrained red outline. Press state `translateY(1px)`.
- **Card / panel:** `variant` default | raised | sunken | **attention** (amber rail) | **action** (emerald rail). `Eyebrow` added.
- **MetricCard (KPI):** mono label, large tabular value; warning/danger tones use the attention panel.
- **StatusBadge / Badge:** dark tinted surface, light text, inset ring, plus the existing non-colour shape cue.
- **DataTable:** sunken mono header, thin separators, subtle hover, `aria-selected` row tint; toolbar/pagination unchanged in behaviour.
- **Inputs:** sunken surface, strong emerald focus ring. **Dialog/Drawer:** raised dark surface, deep shadow, 70 % scrim. **Tabs:** emerald underline.
- **PageHeader:** eyebrow (derived from the nav group, or given) / title / description / actions; `DetailHeader` uses the same pattern.
- **ProgressRail (new):** vertical technical rail (done / active with soft ping / pending) used for customer production trackers; keeps the `data-state`, `data-code`, `data-testid`, `data-phase` and spoken-state contract.
- Empty / loading / error states: sunken square icon tile, quiet skeleton shimmer, new `app/error.tsx` (retry only, never signs out).

## Staff shell
Sunken dark sidebar with mono group labels, emerald active rule + icon, restrained hover; sunken top bar with mono `⌘K` hint; wordmark matches the public site (uppercase tracking). Navigation structure, permission filtering, collapse and mobile drawer are untouched. Main content enters with a 350 ms fade/rise (motion-allowed only).

## Screens
- **Command Center:** "What to do next" is an *action* panel; queue cards with urgent items and the needs-attention card use the *attention* panel; larger counts; mono rank numbers. Logic untouched.
- **Production job detail:** new stage strip (one segment per live stage coloured by status) above the tabs; Administrative Operator areas unchanged.
- **Samples / orders / management / commercial:** inherit tokens, headers, panels, tables, badges and forms.
- **Staff sign-in:** technical panel (grid, stitch line) instead of the old inverted block.

## Customer portal
- **Shell:** calmer variant of the same brand. One `nav`: top tab bar from `sm`, **fixed bottom tab bar on phones** (icons + labels, 64 px targets, safe-area aware). Sign-out stays in the header.
- **Dashboard:** eyebrow + greeting, mono-labelled stat cards, "Needs your action" as the action panel.
- **Sample / order detail:** reference as eyebrow, status, a "What happens next" action panel and the unchanged primary action, then the same tabs.
- **Production tracker:** `ProgressRail`. **Shipments:** each shipment gets a 3-step Preparing / On the way / Delivered line (delivery-attempt-failed shown in amber; returned has no line).
- **Customer sign-in:** dark card in the same style.

## Motion
Subtle only: page entrance, press states, rail ping, tab/nav colour transitions, drawer/dialog (existing). All inside `prefers-reduced-motion: no-preference` or neutralised by the global reduce rule.

## Unchanged
Routes, permissions, RBAC, `allowedActions`, auth/session handling, data fetching, workflows, API contracts, the public site.

## Known remaining visual inconsistencies / follow-ups
- Signed-in screens need a visual pass (spacing/contrast of long-tail screens: master data, settings, team, fulfilment drawers, commercial panels, management charts).
- Management chart containers use the shared panel but their bar/segment colours still come from the tone tokens individually.
- Select/dropdown/popover content inherits tokens but was not individually restyled; toast styling is token-based only.
- Order and sample **admin** lifecycles (spec §20–21) rely on the existing timeline components, restyled through tokens only; no new lifecycle visual.
- Mobile admin: drawer and horizontal-scroll tables only (no card-style tables).

## Sign-in unification (follow-up)
Staff `/login` and customer `/account/login` (plus forgot / reset / activate) share `components/layout/auth-split.tsx` and `auth-visual.tsx`: form column ~40 % (`2fr`) and brand video ~60 % (`3fr`) from lg, form capped at 26 rem; on phones/tablets the form comes first and the visual is a short band beneath it (poster only, no video). Both play the same `/media/benue-login.mp4` (audio track stripped; poster `benue-login-poster.webp`, a frame from the video) through `LoopVideo` + `useVideoAllowed` (wide screen, motion allowed, no Save-Data / slow network; `object-position: 55% center`). Any failure keeps the poster, or the grid + stitch fallback if there is no poster. Wording stays distinct: customer "Customer account / Welcome back", staff "Staff access / Sign in" with the "Staff access only · Activity is audited" footer. Auth logic, routes, redirects and session handling are untouched.
