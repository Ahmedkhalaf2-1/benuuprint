/** The real public marketing routes. The sitemap, header, footer and tests all derive from this one list. */
export const PUBLIC_ROUTES = [
  { path: "/", label: "Home", changeFrequency: "monthly", priority: 1 },
  { path: "/capabilities", label: "Capabilities", changeFrequency: "monthly", priority: 0.8 },
  { path: "/products", label: "Products", changeFrequency: "monthly", priority: 0.8 },
  { path: "/fabrics", label: "Fabrics", changeFrequency: "monthly", priority: 0.7 },
  { path: "/process", label: "Process", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", label: "About", changeFrequency: "yearly", priority: 0.6 },
  { path: "/contact", label: "Contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/track", label: "Track an order", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", label: "Privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", label: "Terms", changeFrequency: "yearly", priority: 0.2 },
] as const;

/**
 * Areas that must never be crawled or indexed: the staff app, the customer portal, auth and the BFF routes.
 * (The root layout is noindex; only the `(public)` group opts back in.)
 */
export const PRIVATE_PATHS = [
  "/account", "/login", "/api", "/dashboard", "/brands", "/customers", "/delivery", "/management", "/master-data", "/my-work",
  "/notifications", "/orders", "/payments", "/production", "/quotations", "/samples", "/settings", "/team", "/track/",
] as const;
