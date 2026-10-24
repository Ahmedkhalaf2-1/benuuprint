/**
 * Copy and curated data for the secondary public pages. Same rules as content.ts: no invented numbers, clients, locations,
 * turnaround times, certifications or legal facts. Anything that needs a business/legal decision is marked `pending`.
 *
 * Catalogue-like data here (products, fabric families, decoration methods) is a curated marketing list: the anonymous site cannot call
 * the customer-authenticated configurator. Replace it with a public-safe catalogue endpoint when one exists.
 */
import type { GarmentKind } from "./garment/types";

export const CAPABILITY_DETAILS = [
  { name: "Sample development", position: "Your idea, made into something you can hold.", happens: "We turn your brief, references and artwork into a physical sample built to the specification you approved.", matters: "A sample settles what drawings cannot: fit, finish and feel, before you commit to a run.", receive: "A finished sample, with its progress visible in your account." },
  { name: "Pattern & fit", position: "The shape of the garment, decided on purpose.", happens: "Patterns are developed or adjusted to the fit you describe, and worked through your size set.", matters: "Fit is what people notice first, and it is hard to change once production starts.", receive: "A sample cut from the pattern you approved, with fit notes you can respond to." },
  { name: "Fabric sourcing", position: "Fabric chosen for the garment, not the other way round.", happens: "We help you choose a fabric that suits the garment, the decoration and your budget, then source it for the sample and the order.", matters: "Fabric decides how a garment drapes, wears and takes decoration.", receive: "Your fabric and colour choices recorded on the request, alongside any reference you supplied." },
  { name: "Printing & embroidery", position: "Decoration matched to the artwork.", happens: "Screen print, DTF, embroidery, puff and sublimation, applied to the placement you specify.", matters: "The method changes how artwork looks, feels and wears.", receive: "Method and placement confirmed on your sample request before work starts." },
  { name: "Cut & sew", position: "Construction that follows the approved sample.", happens: "Panels are cut and sewn to the sample you approved.", matters: "Production should match what you signed off, not an interpretation of it.", receive: "Production that follows your approved sample, tracked in your account." },
  { name: "Quality control", position: "Checks along the way, not only at the end.", happens: "Garments are checked at several points during production, including a final inspection before packing.", matters: "Problems caught early reach fewer garments and cost less to fix.", receive: "Garments that have passed inspection before they are packed." },
  { name: "Packaging", position: "Packed the way you asked.", happens: "Garments are folded, packed and prepared for delivery to the packaging specification on your order.", matters: "Packaging is the first thing your customer handles.", receive: "Packing recorded against your order." },
  { name: "Fulfillment", position: "Delivery you can follow.", happens: "An order can ship in one or several shipments, and each shipment has its own status.", matters: "You can plan around what has left, what is on the way and what has arrived.", receive: "A tracking link for your order showing where each shipment stands." },
] as const;

export const PRODUCT_DETAILS: ReadonlyArray<{ name: string; kind: GarmentKind; useCase: string; customise: string }> = [
  { name: "T-Shirts", kind: "tshirt", useCase: "Everyday basics and heavyweight cuts for labels, teams and events.", customise: "Choose fabric, colour and decoration, then add size notes and references." },
  { name: "Hoodies", kind: "hoodie", useCase: "Cold-weather staples with room for large artwork.", customise: "Decoration on the front or back; hood, pocket and trim details go in your brief." },
  { name: "Sweatshirts", kind: "sweatshirt", useCase: "Crew necks for core collections.", customise: "Built around the fabric you choose, with decoration placed where you specify." },
  { name: "Polo Shirts", kind: "polo", useCase: "Collared pieces for uniforms and hospitality.", customise: "Small chest marks suit embroidery; collar and placket details go in your brief." },
  { name: "Jackets", kind: "jacket", useCase: "Outer layers for collections that need structure.", customise: "Describe components and trims in your brief; what can be made is confirmed in your quotation." },
  { name: "Bottoms", kind: "bottoms", useCase: "Shorts, joggers and trousers made to match a top.", customise: "Match the fabric and colour of your tops, with decoration where you need it." },
  { name: "Sportswear", kind: "sportswear", useCase: "Performance cuts for teams and clubs.", customise: "All-over colour is possible with sublimation; other methods are confirmed per request." },
  { name: "Custom Pieces", kind: "custom", useCase: "A garment that is not on this list.", customise: "Describe it and attach references; feasibility is confirmed in your quotation." },
];

export const FABRIC_BOOK = [
  { name: "Jersey", visualKey: "jersey", character: "Smooth, flexible and light on the body.", use: "T-shirts, polos and base layers." },
  { name: "Rib", visualKey: "rib", character: "Stretchy and structured, with a fine vertical ridge.", use: "Cuffs, collars, hems and fitted pieces." },
  { name: "Fleece", visualKey: "fleece", character: "Soft, warm and dense.", use: "Hoodies, sweatshirts and joggers." },
  { name: "Brushed", visualKey: "brushed", character: "A raised, soft-touch surface.", use: "Sweats and linings." },
  { name: "Twill", visualKey: "twill", character: "A firm diagonal weave that holds its shape.", use: "Jackets, workwear and bottoms." },
] as const;

export const FULL_PROCESS = [
  { phase: "Sample", title: "Tell us what you're making", body: "Choose a garment or describe a custom one. Add references, artwork and size notes.", you: "Describe your idea", see: "A request in your account" },
  { phase: "Sample", title: "Build your sample", body: "Pick fabric, colour and decoration. Every choice is saved to one request.", you: "Make your choices", see: "A complete specification" },
  { phase: "Sample", title: "Review your quotation", body: "Your quotation appears in your account. Accept it, or ask for changes.", you: "Accept or ask for changes", see: "A clear quotation" },
  { phase: "Sample", title: "Sample production", body: "Pattern, cutting, decoration and sewing for your sample, with progress you can follow.", you: "Follow progress", see: "Status updates in your account" },
  { phase: "Sample", title: "Approve or request changes", body: "Approve the sample, or tell us what to change. Nothing scales until you are happy.", you: "Approve or request changes", see: "Your decision recorded" },
  { phase: "Production", title: "Create a bulk order", body: "Place the production order from your approved sample, with quantities and delivery details.", you: "Place your order", see: "An order with its own quotation" },
  { phase: "Production", title: "Production", body: "Your order moves through production. Where it is shows in your account.", you: "Follow production", see: "Production progress" },
  { phase: "Production", title: "Packaging", body: "Garments are packed to your order's packaging specification.", you: "Nothing to do", see: "Packing progress" },
  { phase: "Delivery", title: "Shipment", body: "Your order ships in one or more shipments. Each has its own status.", you: "Follow each shipment", see: "A tracking link" },
  { phase: "Delivery", title: "Delivery", body: "Delivered, delayed or returned: each shipment's state is visible.", you: "Receive your order", see: "Delivered status" },
  { phase: "Delivery", title: "Reorder", body: "Your history stays in your account, so a repeat order starts from what you already approved.", you: "Reorder from your account", see: "Your past orders" },
] as const;

export const ABOUT_PRINCIPLES = [
  { title: "Sample first", body: "Every project starts with a sample. You see and approve the real thing before anything scales." },
  { title: "Customer visibility", body: "Your requests, quotations, payments, production and shipments live in one account, not across messages." },
  { title: "Clear approvals", body: "Decisions are made at defined points, and each one is recorded." },
  { title: "Structured production", body: "Production moves through defined stages, so progress is something you can read, not guess." },
  { title: "Quality checks", body: "Garments are checked at several points, including a final inspection before packing." },
  { title: "Delivery tracking", body: "Each shipment has a status, and an order can be followed with a tracking link." },
] as const;

export const CONTACT_PROJECT_TYPES = ["New collection", "Single sample", "Bulk order", "Reorder", "Something else"] as const;

/* ---------------- legal shells ---------------- */
export interface LegalSection { id: string; title: string; body: string[]; pending?: string[] }
export const LEGAL_NOTICE = "This page is a working draft built from how the Benuu Print service operates. It is not legal advice and has not been reviewed by a lawyer. Items marked “To be confirmed” are business or legal decisions that must be completed before this page is relied on.";

export const PRIVACY_SECTIONS: LegalSection[] = [
  { id: "who", title: "Who this applies to", body: ["This page describes how information is handled when you use the Benuu Print website and customer account."], pending: ["Legal name and registered details of the company responsible for your information"] },
  { id: "account", title: "Account information", body: ["When your account is created we hold the details needed to run it: your name, email address and sign-in credentials, and optional profile details such as phone, WhatsApp, country, city, Instagram handle and preferred language."] },
  { id: "projects", title: "Sample and order information", body: ["We hold what you submit about a project: product choices, fabric and colour, decoration details, size information, notes, delivery addresses and the quotations, approvals and orders that follow."] },
  { id: "files", title: "Uploaded files", body: ["Reference images, artwork, size charts and similar files you upload are stored so we can produce your sample or order. Only upload files you have the right to use."] },
  { id: "payments", title: "Payment proof", body: ["If you submit proof of payment, we hold that file and the payment details you enter so the payment can be reviewed."] },
  { id: "sessions", title: "Sessions and cookies", body: ["We use cookies that keep you signed in to your account and let your session be renewed securely. They are used to operate the account, not for advertising."], pending: ["Confirmation of any analytics or other cookies, if they are added"] },
  { id: "comms", title: "Service messages", body: ["We send messages needed to run the service, such as account activation and password reset."] },
  { id: "tracking", title: "Tracking links", body: ["An order tracking link shows a limited, customer-safe view of an order and its shipments. Only a hash of the link's token is stored, and a link can be replaced or revoked."] },
  { id: "use", title: "How information is used", body: ["Information is used to provide the service: producing samples and orders, quoting, taking payment, delivering and supporting you."] },
  { id: "sharing", title: "Sharing", body: ["Information is shared only as needed to deliver the service."], pending: ["Named categories of service providers and couriers that receive information"] },
  { id: "security", title: "Security", body: ["Access to accounts is controlled by authentication, and customer and staff sessions are kept separate. No system is perfectly secure."] },
  { id: "retention", title: "Retention", body: [], pending: ["How long account, project, file and payment information is kept"] },
  { id: "rights", title: "Your choices", body: [], pending: ["Your rights over your information and how to exercise them, as required where the company operates"] },
  { id: "contact", title: "Contact", body: [], pending: ["Contact details for privacy questions"] },
];

export const TERMS_SECTIONS: LegalSection[] = [
  { id: "accounts", title: "Customer accounts", body: ["Samples and orders are managed from a customer account. You are responsible for keeping your sign-in details secure and for activity under your account."] },
  { id: "samples", title: "Sample requests", body: ["A sample request describes what you want made. Submitting it asks Benuu Print to review and quote it; it is not a guarantee that a garment can be made as described."] },
  { id: "quotations", title: "Quotations", body: ["Benuu Print issues a quotation for you to accept or reject. Work proceeds on the terms of the quotation you accept."], pending: ["How long a quotation stays valid", "Whether prices can change after acceptance"] },
  { id: "payments", title: "Payments", body: ["Payment is submitted and reviewed through your account, with proof of payment where required."], pending: ["Accepted payment methods, currencies and payment timing", "Refunds"] },
  { id: "approvals", title: "Approvals", body: ["You approve a sample, or request changes, before a bulk order is placed. An approval confirms the sample as the reference for production."] },
  { id: "orders", title: "Bulk orders", body: ["A bulk order is placed from an approved sample, with its own quotation, quantities and delivery details."], pending: ["Minimum order quantities, if any"] },
  { id: "production", title: "Production", body: ["Production follows the approved sample and the order specification. Progress is shown in your account."], pending: ["Lead times and how delays are handled"] },
  { id: "shipments", title: "Shipments and tracking", body: ["An order can ship in one or more shipments, each with its own status. A tracking link shows a customer-safe view of an order."], pending: ["Risk, delivery responsibility and handling of failed or returned deliveries"] },
  { id: "responsibilities", title: "Your responsibilities", body: ["Provide accurate information, accurate delivery details and files you have the right to use, and review quotations and samples carefully before approving them."] },
  { id: "content", title: "Uploaded content", body: ["You keep your rights in your artwork and files. You allow Benuu Print to use them to produce and deliver your samples and orders."], pending: ["Any wider license, and how third-party rights are handled"] },
  { id: "changes", title: "Changes and cancellation", body: ["Changes and cancellation may be limited once work has started."], pending: ["Exactly when and how an order can be changed or cancelled"] },
  { id: "liability", title: "Warranties and liability", body: [], pending: ["Any warranties and the limits of liability"] },
  { id: "law", title: "Governing law", body: [], pending: ["Governing law and jurisdiction"] },
  { id: "contact", title: "Contact", body: [], pending: ["Contact details for questions about these terms"] },
];
