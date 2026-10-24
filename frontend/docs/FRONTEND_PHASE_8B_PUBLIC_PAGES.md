# Frontend Phase 8B — Public site secondary pages, SEO, public tracking

Scope: public pages only. No 3D, no Admin/Portal logic changes, no backend changes.

## Routes (`src/app/(public)/`)
`/` · `/capabilities` · `/products` · `/fabrics` · `/process` · `/about` · `/contact` · `/track` · `/track/[token]` · `/privacy` · `/terms`.
`(public)/layout.tsx` now owns `PublicHeader`, `PublicFooter` and Organization JSON-LD for every public page (the homepage no longer renders them itself). No `/work` and no `/products/[slug]` (no real content / data model yet); `SELECTED_WORK` and the product list keep the architecture ready.

## Content architecture
`content.ts` (homepage + shared), `content-pages.ts` (capability detail, product families, fabric book, 11-step process, about principles, contact project types, legal sections), `routes.ts` (public route list + private path list). Page bodies are in `features/public-site/pages/*`, built from the existing primitives (`PageHero`, `PublicCta`, `Section`, `Texture`, `GarmentPreview`, `ProcessGarmentVisual`, `LoopVideo`). Products and Process use the garment boundary, so 3D can replace the visuals without touching the pages. The process page reuses the process video once (a wide band, allowed-playback only); the hero video is not reused.

## Data sources
No anonymous catalogue exists (the customer configurator endpoint needs a customer session), so products, fabric families and decoration methods are a curated list in `content-pages.ts` / `content.ts`. **Future:** replace with a public-safe catalogue endpoint. Nothing on public pages calls a private API; the only backend call is the tracking token endpoint.

## Public tracking contract (from the live OpenAPI)
`GET {NEXT_PUBLIC_API_URL}/track/orders/{token}` — no auth; raw token is the credential; unknown/revoked/expired → 404; rate limited → 429. Response `PublicTrackingDto`: `orderNumber, status (ORDER_RECEIVED|CONFIRMED|IN_PRODUCTION|PACKING|READY_FOR_DELIVERY|PARTIALLY_SHIPPED|OUT_FOR_DELIVERY|DELIVERED|COMPLETED|ON_HOLD|CANCELLED), currentStage, progressPercent, totalQuantity, deliveredQuantity, remainingDeliveryQuantity, targetDeliveryDate, shipments[{shipmentNumber, status (PREPARING|ON_THE_WAY|DELIVERED|DELIVERY_ATTEMPT_FAILED|RETURNED), quantity, courierName, trackingUrl, dispatchedAt, deliveredAt}], updatedAt`. There is **no order-number lookup**, so `/track` accepts only a tracking link or token (bare token, pasted link, or `?token=`, which redirects to `/track/<token>`).
- Server-rendered (`cache: "no-store"`, 8 s timeout) from `/track/[token]`; `loadTracking` never throws and maps failures to `not_found | rate_limited | unavailable`. Malformed tokens never trigger a request.
- **Safe projection:** a whitelist (`toTrackingView`) — unknown fields are dropped, progress clamped, courier URLs rendered only if `http(s)`. The DTO itself contains no customer private data, staff, notes, phone or addresses, and none is rendered. There is no destination summary in the DTO, so none is shown.
- Token pages are `noindex, nofollow`, `referrer: no-referrer`, and disallowed in robots.txt (`/track/`).
- Customer language: Preparing / On the way / Delivered / Delivery attempt failed / Returned; order status labels; Cancelled and On hold show a notice instead of the progress line.

## SEO
Per-page `title`, `description`, Open Graph and Twitter via `pageMetadata()`. Canonical and OG `url` only when `NEXT_PUBLIC_SITE_URL` is set; `metadataBase` is set in the `(public)` group only then. The existing `opengraph-image` in `(public)` is inherited by all pages. Organization JSON-LD: name, description, url (if configured) only.

## Sitemap / robots
`app/sitemap.ts` → the ten public routes (home + nine pages); with no `NEXT_PUBLIC_SITE_URL` it is empty because absolute URLs can't be produced (no localhost fallback). `app/robots.ts`: allow `/`, disallow the admin areas, `/account`, `/login`, `/api`, `/track/`; sitemap line only with a site URL. The root layout stays `noindex`; only the `(public)` group exports `robots: index`, so Admin, Portal and auth stay non-indexable.

## Legal placeholders
`/privacy` and `/terms` are structured shells built from how the product works (account data, sample/order data, files, payment proof, sessions, tracking links; accounts, samples, quotations, payments, approvals, orders, production, shipments, responsibilities, content). Every business/legal decision is shown as a dashed **To be confirmed** item, under a "not legal advice" notice. Still required: legal entity, retention periods, rights/contact, sharing providers, quotation validity, payment methods/refunds, lead times, delivery risk, change/cancellation rules, warranties/liability, governing law, contact.

## Contact integration gap
`ContactForm` is reusable and accepts an `onSubmit(values)`. With no handler (today) the button is disabled, the page says "Contact submission is coming soon", nothing is sent and no success is shown. **Backend needed:** a public enquiry endpoint (e.g. `POST /public/enquiries` with `name, company, email, phone?, projectType, message`), spam protection and rate limiting. No third-party form service is used. Contact details (email/phone/address) are not published because none were provided.

## 3D readiness / performance / accessibility
Products → `GarmentPreview`, Process → `ProcessGarmentVisual` (+ `LoopVideo` band), unchanged boundaries. Pages are static server components; client code is limited to the header, the process band, the contact form and the track entry. No new dependencies; no 3D packages. Semantic headings (one `h1` per page), labelled forms, `aria-current` on nav and tracking steps, decorative video `aria-hidden`, reduced-motion respected.

## Real content still needed
Contact details; legal decisions above; real product/fabric catalogue data (and confirmation that the listed families, products and decoration methods match the factory); approved case studies; logo; `NEXT_PUBLIC_SITE_URL`; `PUBLIC_APP_URL` on the backend so created tracking links carry the website URL (the frontend accepts `/track/<token>`, `/track?token=` and the API path).
