import type { DecorationVisualKey, FabricVisualKey, GarmentKind } from "./garment/types";

/**
 * All homepage copy and curated catalogue content lives here, so real content can replace it without touching layout code.
 * Rule for this file: no invented numbers, clients, locations, turnaround times, certifications or testimonials.
 *
 * Product types / fabrics / print methods are a curated *marketing* list. The customer-safe configurator endpoint
 * (the customer configurator endpoint) requires a customer session, so the anonymous homepage cannot call it.
 * When a public catalogue endpoint exists, replace `WHAT_WE_MAKE`, `FABRIC_FAMILIES` and `DECORATIONS` with it.
 */

/** Every "Start a Sample" CTA goes into the real customer flow; the portal guard adds ?next= when there is no session. */
export const START_SAMPLE_HREF = "/account/samples/new";
/** Customer login only, never the staff login. */
export const CUSTOMER_LOGIN_HREF = "/account/login";

export const CONTACT_HREF = "/contact";

export const NAV_LINKS = [
  { label: "Capabilities", href: "/capabilities" },
  { label: "Products", href: "/products" },
  { label: "Fabrics", href: "/fabrics" },
  { label: "Process", href: "/process" },
  { label: "About", href: "/about" },
] as const;

export const TRUST_ITEMS = ["Sample development", "Bulk production", "Quality control", "Packaging", "Delivery"] as const;

/**
 * `kind` is a presentation-only identifier (see garment/types). It is NOT a backend enum: it exists so a future 3D viewer can
 * map each public category to a model, and it is local to the public site.
 */
export const WHAT_WE_MAKE: ReadonlyArray<{ name: string; note: string; kind: GarmentKind }> = [
  { name: "T-Shirts", note: "Light jersey to heavyweight boxy cuts.", kind: "tshirt" },
  { name: "Hoodies", note: "Hoodies with clean seams and room for artwork.", kind: "hoodie" },
  { name: "Sweatshirts", note: "Crew necks in the fabric you choose.", kind: "sweatshirt" },
  { name: "Polo Shirts", note: "Collars and plackets that sit right.", kind: "polo" },
  { name: "Jackets", note: "Outer layers with proper structure.", kind: "jacket" },
  { name: "Bottoms", note: "Shorts, joggers and trousers to match your tops.", kind: "bottoms" },
  { name: "Sportswear", note: "Team kits and activewear.", kind: "sportswear" },
  { name: "Custom Pieces", note: "Not on the list? Describe it and we'll confirm what can be made.", kind: "custom" },
];

export const JOURNEY = [
  { title: "Tell us what you want to make", body: "Choose a garment or describe a custom one. Add references, artwork and size notes.", stage: "Request" },
  { title: "Set the sample details", body: "Pick fabric, colour and decoration. It all stays in one request.", stage: "Details" },
  { title: "Review the quotation and pay", body: "We send the quotation to your account. Accept it or ask for changes, then upload your payment proof.", stage: "Quotation" },
  { title: "We make your sample", body: "Pattern, cutting, decoration and sewing. You can follow the status in your account.", stage: "Sample" },
  { title: "Approve it, then order", body: "Approve the sample or ask for changes. Once you're happy, place the production order.", stage: "Approval" },
  { title: "Production, checks and delivery", body: "We produce in stages with quality checks along the way, then pack and ship. Every step shows in your account.", stage: "Production" },
] as const;

/** `visualKey` is a decorative-texture token only (no material data); a future 3D viewer can map it to a garment material. */
export const FABRIC_FAMILIES: ReadonlyArray<{ name: string; visualKey: FabricVisualKey; use: string }> = [
  { name: "Jersey", visualKey: "jersey", use: "T-shirts, polos, lightweight layers" },
  { name: "Rib & trim", visualKey: "rib", use: "Cuffs, collars, hems" },
  { name: "Fleece & terry", visualKey: "fleece", use: "Hoodies, sweatshirts, joggers" },
  { name: "Brushed surfaces", visualKey: "brushed", use: "Soft-touch sweats and linings" },
  { name: "Twill & woven", visualKey: "twill", use: "Jackets, workwear, bottoms" },
];

export const FABRIC_ATTRIBUTES = [
  { label: "Composition", note: "What it is made of." },
  { label: "Weight (GSM)", note: "How heavy it hangs." },
  { label: "Texture", note: "How it looks and feels up close." },
  { label: "Colour", note: "Matched to your reference." },
  { label: "Application", note: "Which garments it suits." },
] as const;

/** `visualKey` maps to a 2D specimen today and could map to a 3D decal/texture/geometry later. */
export const DECORATIONS: ReadonlyArray<{ name: string; visualKey: DecorationVisualKey; note: string }> = [
  { name: "Screen Print", visualKey: "screen-print", note: "Solid ink and halftone for repeat artwork." },
  { name: "DTF", visualKey: "dtf", note: "Fine, multi-colour detail in a single layer." },
  { name: "Embroidery", visualKey: "embroidery", note: "Stitched marks with real thread texture." },
  { name: "Puff", visualKey: "puff", note: "A raised, dimensional layer." },
  { name: "Sublimation", visualKey: "sublimation", note: "A continuous field of colour across the fabric." },
];

export const QUALITY_STAGES = [
  { stage: "Cutting", check: "Panels and sizes checked before they move on." },
  { stage: "Decoration", check: "Placement and finish checked against your artwork." },
  { stage: "Construction", check: "Seams and fit checked as the garment comes together." },
  { stage: "Final inspection", check: "Every piece inspected before packing." },
] as const;

export const CAPABILITIES = [
  { name: "Sample development", body: "From a brief to a finished sample." },
  { name: "Pattern & fit", body: "Patterns developed and adjusted to your fit." },
  { name: "Fabric sourcing", body: "Fabric matched to the garment and the budget." },
  { name: "Printing & embroidery", body: "Several decoration methods, chosen to suit the artwork." },
  { name: "Cut & sew", body: "Construction to the approved sample." },
  { name: "Quality control", body: "Checks at several points, not only at the end." },
  { name: "Packaging", body: "Folded, labelled and packed for delivery." },
  { name: "Fulfillment", body: "Shipments tracked through to your door." },
] as const;

export const PORTAL_BENEFITS = ["Track sample requests", "Review quotations", "Send payment proof", "Follow production", "Track shipments", "Reorder"] as const;

/**
 * Illustrative portal state for the showcase. Every status below is a real customer-portal status label
 * (see features/portal/types + status), so the mock never promises a feature the portal does not have.
 */
export const PORTAL_SAMPLES = [
  { number: "SMP-000123", product: "Heavyweight hoodie", status: "IN_SAMPLE_PRODUCTION", label: "In sample production", next: "We are producing your sample." },
  { number: "SMP-000124", product: "Boxy T-shirt", status: "QUOTATION_READY", label: "Quotation ready", next: "Review quotation" },
] as const;
/** The portal's own left-hand navigation (features/portal/shell). */
export const PORTAL_NAV = ["Dashboard", "My samples", "My orders", "Profile"] as const;
export const PORTAL_ORDER_STEPS = [
  { status: "READY_FOR_PRODUCTION", label: "Ready for production" },
  { status: "IN_PRODUCTION", label: "In production" },
  { status: "PACKAGING", label: "Packaging" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
] as const;
export const PORTAL_ORDER_ACTIVE = 1;

export const TRADITIONAL = ["Updates scattered across messages", "Hard to tell which stage the order is at", "Different people handling different parts", "Problems found too late", "You keep having to ask what's next"] as const;
export const BENUE = ["One organized production flow", "Clear stages from sample to delivery", "Approvals at defined points", "Quality checks along the way", "Progress and next steps visible in your account"] as const;

/** Real case studies go here. Until approved work exists the section renders honest placeholders. */
export interface WorkItem { title: string; category: string; techniques: string[]; material: string; quantity?: string; imageSrc?: string; imageAlt?: string }
export const SELECTED_WORK: readonly WorkItem[] = [];
