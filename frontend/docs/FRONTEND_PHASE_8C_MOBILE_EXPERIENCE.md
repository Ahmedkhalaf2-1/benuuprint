# Frontend Phase 8C — Mobile-first public website pass

Scope: phones (target 320–480 px; checked at 390). **Desktop (>= 1024 px) is locked.** Technique: every existing desktop class is kept at `sm:` / `lg:`; mobile-only layouts are added with `lg:hidden` and the desktop versions with `hidden lg:block|grid`, so the approved desktop markup renders as before. Tablets (640–1023) inherit the mobile layouts.

## Hero
- Phone layout (`hero.tsx`): `100svh`, headline first, one short line of copy, two full-width actions (Start a Sample, See the Process), then the cinematic visual visible beneath the text (gradient is dark at the top for contrast, clear at the bottom). Desktop composition is the original, class for class.
- **Poster:** `public/media/benue-hero-poster.webp` (52 KB), a frame taken from the existing hero video (no new large asset). On phones it is a still with a slow Ken Burns drift (`.pub-kenburns`, motion-allowed only) and mobile-tuned `object-position` (58%). On desktop the poster is **not** shown: the designed CSS fallback stays as before.
- **Video:** `useVideoAllowed(…, { minWidth: 1024, allowMobile: true })`. Desktop policy unchanged. Phones may play the one hero video unless reduced motion, Save-Data, a reported 2G/3G connection, or a reported weak device (< 4 GB / < 4 cores); browsers that cannot report (iOS Safari) get it too. It starts only after the page has loaded plus ~0.9 s so it never competes with first paint, and fades in over the poster only once frames play.
- Process video (updated): also plays on phones, in the How It Works panel in place of the drawing (drawing stays as base and fallback), under the same phone policy; its 5 MB is fetched only when the panel is within ~600 px of the viewport. Every LoopVideo pauses when scrolled off-screen, so only the visible video ever plays.

## Navigation
Compact bar: wordmark, always-visible **Start a Sample**, 44 px menu button, thin scroll-progress line. Full-height dark panel eases in with staggered links (always mounted, `inert`/`aria-hidden` when closed, page scroll locked while open, Esc closes). Panel has Track an order and big Start a Sample / Customer Login buttons.
**Sticky bottom CTA** (`sticky-cta.tsx`): phones only; appears after the first screen; hides when any `[data-cta-end]` (final CTA, builder CTA, footer) is on screen and on `/contact`, `/privacy`, `/terms`, `/track*`; safe-area padded; not in Admin/Portal (public layout only).

## Section-by-section (phones)
- Trust strip: single swipeable line. Brand statement / sections: tighter vertical rhythm (`py-16` base).
- **What We Make:** `GarmentCarousel` — tappable chips + native scroll-snap cards with the next card peeking; each card uses `GarmentPreview` and ends in Start a Sample. Desktop hover list unchanged.
- **How it works:** `MobileProcess` — one shared garment visual that transforms with the step, a tappable 6-segment progress bar, swipeable step cards ("02 / 06"), Back / Next buttons. No sticky layout, no video.
- **Builder:** garment preview first and **sticky** under the header (≤ 34 svh), chip rows scroll horizontally (44 px), a compact spec line and full-width **Build yours** after the controls. State and 3D opt-in unchanged; still no network or storage.
- **Fabrics / Decoration:** native snap rows of large touch cards with position dots (decoration specimens dominate).
- **Quality:** vertical journey; each checkpoint lights as its own stage scrolls in (desktop sequence unchanged).
- **Portal showcase:** three phone-sized screens (My samples, Quotation, Order progress) in a snap row with real portal vocabulary; browser mock stays desktop-only. "Illustrative preview" kept.
- **Capabilities:** accordion (native `<details>`) with a link to the full capability.
- **Transparency:** stacked fragmented → connected with an "Instead" divider. **Final CTA:** full-width 56 px buttons.

## Secondary pages
Products: carousel instead of eight stacked rows (rows remain on desktop). Process: sticky Sample/Production/Delivery tracker and collapsible steps (`ProcessStep`; always expanded on desktop); the video band is hidden on phones. Capabilities: compact. Fabrics: shorter full-bleed bands, 2-up attribute grid. About/Contact: tighter spacing; Contact inputs are 16 px with correct `inputMode`s and a full-width button. Track: large input (16 px, `inputMode=url`), full-width button, vertical progress timeline, 2-up quantities. Legal: 16 px / 1.7 body and a collapsible "On this page".

## Motion system
CSS first; IntersectionObserver where needed. Added: hero poster drift, menu panel and link stagger, scroll-progress line, snap indicators, pressed states (`active:`) instead of hover, selected-state transitions, process visual transitions, vertical checkpoint reveal. **Reveal fallback** (`reveal-observer.tsx`): browsers without CSS scroll-driven animations (iOS Safari < 26) get the same rise-in via IntersectionObserver; nothing happens where timelines exist or motion is reduced. No scroll-jacking, no counters (there are no real numbers to count).

## Reduced motion / Save-Data
Reduced motion: no drift, no video, snap rows jump instead of smooth-scroll, reveals are skipped, content fully visible. Save-Data / slow network: no video; the poster carries the hero.

## Accessibility
44 px+ targets on mobile controls; swipe areas are focusable lists with chips/dots/buttons so nothing is gesture-only; `aria-current`/`aria-selected`/`aria-expanded` on selectors; inert closed menu and sticky CTA; decorative video `aria-hidden`.

## Performance
No new dependencies; the hero poster is 52 KB; one autoplay video on phones, started after load; process video desktop-only; 3D viewer still lazy and opt-in on phones; no horizontal overflow on any public route at 390 px (grid children given `min-w-0` where scrollers sit in grids).

## Video audio
Both videos contained an AAC audio track. It was stripped losslessly (movie header rewrite; originals backed up outside the repo) so they are silent files; `LoopVideo` also forces `muted` as property and attribute and calls `play()` explicitly.

## Desktop regression status
Desktop home, builder (incl. 3D) and hero verified visually unchanged at 1440. Known small DOM additions on desktop: Snap rows are focusable lists; process steps render a button only below lg.
