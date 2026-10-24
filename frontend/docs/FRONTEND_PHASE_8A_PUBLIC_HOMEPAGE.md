# Frontend Phase 8A — Cinematic public homepage

Scope: the public homepage at `/` only. No backend work, no change to Customer Portal business logic, no secondary public pages.

## Creative direction — Industrial Luxury
Near-black environment (`--pub-bg`), warm-white text, deep emerald accent (`--pub-brand*`). Geist only (already bundled): very large uppercase display type with tight tracking carries the identity; Geist Mono for small section markers. Hard 1px rules and a strong grid instead of rounded cards. No glassmorphism, glow blobs or stock imagery. All public tokens are `--pub-*` in `styles/globals.css` and only apply inside the `.pub` wrapper, so Admin and Portal are untouched.

## Route architecture
- `/` → `src/app/(public)/page.tsx` (route group `(public)`, layout adds the `.pub` wrapper). The old `src/app/page.tsx` (redirect to `/dashboard` or `/login`) was removed. Staff reach admin via `/login` and the existing `(admin)` routes, unchanged.
- `/account/*` unchanged. `PortalLayout` now wraps `PortalGuard` around `PortalShell` and no longer does a server-side `redirect("/account/login")`, because that dropped the destination. The guard already redirects to `/account/login?next=<path>`.
- Code: `src/features/public-site/` (public-only; nothing public lives in `components/ui` or admin components).

## Homepage sections (in order)
Header · Hero · Trust strip · Brand statement (`#about`) · What we make (`#capabilities`) · How it works scroll story (`#process`) · Sample builder preview (`#builder`) · Fabrics (`#fabrics`) · Decoration · Quality · Customer portal showcase · Process transparency · Manufacturing capabilities · Selected work (`#work`) · Final CTA · Footer.
Components: `PublicHeader`, `PublicFooter`, `SectionIntro`, `EditorialHeading`, `MediaFrame`, `Texture`, `VideoHero`, `Hero`, `ProcessStory`/`JourneyStage`, `BuilderPreview`, `PortalShowcase`, `StartSampleLink`/`CustomerLoginLink`.

## Customer conversion flow
All "Start a Sample" CTAs → `/account/samples/new`. Unauthenticated: portal guard → `/account/login?next=%2Faccount%2Fsamples%2Fnew` → after login `safePortalNext` returns to the sample request. All "Customer Login" CTAs → `/account/login` (never the staff `/login`). No registration or sample logic was duplicated.

## Video architecture
`hero-media.ts` checks (server, at build/render) for `public/media/benue-hero.mp4` and `public/media/benue-hero-poster.webp`; missing files are never requested. `VideoHero` order: video → poster (`next/image`, priority) → designed CSS fallback (woven cloth + running stitch). The `<video>` is rendered only when `shouldPlayHeroVideo` allows it: no reduced-motion, viewport ≥768px, no Save-Data, not 2G/3G. Attributes: `autoPlay muted loop playsInline preload="metadata"`, no controls, `aria-hidden`; a load error drops back to the still. Re-evaluates when the user changes the reduced-motion setting. After adding files, rebuild (asset presence is resolved at build time).

## Motion principles
Every motion carries meaning: headline line reveal (arrival), hero drift/fade on scroll (depth, leaving the hero), section rise (new section), stitch line (sewing), journey stage layers (the garment progressing), header solid-on-scroll (navigation state). Implemented in CSS (scroll-driven animations behind `@supports`, so unsupported browsers simply show content) plus one IntersectionObserver for the journey. No animation library. All keyframe usage sits inside `prefers-reduced-motion: no-preference`, with the global reduce rule as a backstop.

## Data sources
No public, unauthenticated customer-safe catalogue endpoint exists: `/customer/configurator/sample-options` requires a customer session. The homepage therefore calls **no** API. Product types, fabric families, decoration methods and the builder preview options are a curated marketing list in `content.ts`, labelled as a preview. The portal showcase uses only real portal status vocabulary (tested against `CUSTOMER_STATUSES`). When a public catalogue endpoint is added, swap `WHAT_WE_MAKE`, `FABRIC_FAMILIES`, `DECORATIONS` and `BuilderPreview` options for it.

## Performance
Static prerender; only the header, video hero, process story and builder preview are client components, and the latter two are `next/dynamic` chunks. No new dependencies. No images shipped (CSS textures/inline SVG). Video is opt-in, `preload="metadata"`, and skipped on constrained devices.

## SEO
Absolute title, description, Open Graph, Twitter card, `robots: index` (root layout is noindex), generated `opengraph-image`. Canonical/`metadataBase`/OG url are emitted only when `NEXT_PUBLIC_SITE_URL` is set. Organization JSON-LD contains name, description and (if set) url only.

## Future content required
Real hero footage + poster; real photography for categories/materials/decoration; approved case studies (`SELECTED_WORK`); the public site origin (`NEXT_PUBLIC_SITE_URL`); contact details; Privacy and Terms pages; a logo; approved testimonials (none shown).

## Known gaps
Contact, Privacy, Terms render as inert "soon" text. "About" is the brand-statement anchor. Fabric/decoration/product lists are curated, not live.

## Phase 8B readiness
Header/footer/section primitives are reusable for `/services`, `/products`, `/fabrics`, `/work`, `/about`, `/contact` pages; swap anchors for routes in `NAV_LINKS`. The data seam is `content.ts`.
