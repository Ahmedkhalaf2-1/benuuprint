import {
  BarChart3, Bell, BellRing, Building2, ClipboardCheck, Coins, CreditCard, Database, Factory, FileText, Gauge, LayoutDashboard,
  Package, PackageCheck, Route, Settings, ShieldCheck, Shirt, Tag, Truck, Users, type LucideIcon,
} from "lucide-react";
import { satisfies, type PermissionChecker, type PermissionRequirement } from "@/lib/permissions";

export interface NavItem extends PermissionRequirement {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Visibility is driven by permission codes (never role names). Codes come from
 * ROLES_AND_PERMISSIONS.md; the backend remains authoritative for every request.
 */
export const navSections: NavSection[] = [
  { title: "Dashboard", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiredPermissions: ["dashboard.read"] }] },
  {
    title: "Operations",
    items: [
      { label: "Samples", href: "/samples", icon: Shirt, requiredPermissions: ["samples.read"] },
      { label: "Orders", href: "/orders", icon: Package, requiredPermissions: ["orders.read"] },
      { label: "Production", href: "/production", icon: Factory, requiredPermissions: ["production_board.read", "jobs.read_all"] },
      { label: "Responsibilities", href: "/responsibilities", icon: Route, requiredPermissions: ["responsibilities.read"] },
      { label: "My work", href: "/my-work", icon: ClipboardCheck, requiredPermissions: ["jobs.read_assigned"] },
      { label: "Delivery", href: "/delivery", icon: Truck, requiredPermissions: ["shipments.read", "deliveries.read_assigned"] },
    ],
  },
  {
    title: "Customers",
    items: [
      { label: "Customers", href: "/customers", icon: Users, requiredPermissions: ["customers.read"] },
      { label: "Brands", href: "/brands", icon: Tag, requiredPermissions: ["customers.read"] },
    ],
  },
  {
    title: "Commercial",
    items: [
      { label: "Quotations", href: "/quotations", icon: FileText, requiredPermissions: ["quotations.read"] },
      { label: "Payments", href: "/payments", icon: CreditCard, requiredPermissions: ["payments.read"] },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Production overview", href: "/management/production", icon: BarChart3, requiredPermissions: ["management_kpis.read"] },
      { label: "Quality", href: "/management/quality", icon: ShieldCheck, requiredPermissions: ["quality_kpis.read"] },
      { label: "Commercial", href: "/management/commercial", icon: Coins, requiredPermissions: ["commercial_kpis.read"] },
      { label: "Delivery KPIs", href: "/management/delivery", icon: PackageCheck, requiredPermissions: ["management_kpis.read"] },
      { label: "Workload & capacity", href: "/management/workload", icon: Gauge, requiredPermissions: ["workload.read", "capacity.read"] },
      { label: "Alerts", href: "/management/alerts", icon: BellRing, requiredPermissions: ["automation.read"] },
      { label: "Team", href: "/team", icon: Building2, requiredPermissions: ["users.read"] },
      // Staff notifications need authentication only (own data).
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Master Data", href: "/master-data", icon: Database, requiredPermissions: ["master_data.read"] },
      { label: "Settings", href: "/settings", icon: Settings, requiredPermissions: ["settings.manage"] },
    ],
  },
];

export const allNavItems: NavItem[] = navSections.flatMap((s) => s.items);

/** Drops items the user cannot see, then sections left empty. */
export function filterNav(checker: PermissionChecker, sections: NavSection[] = navSections): NavSection[] {
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => satisfies(checker, i)) }))
    .filter((s) => s.items.length > 0);
}

export function findNavItem(pathname: string): NavItem | undefined {
  return allNavItems.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}


/** First page the user may open: the landing target for people without `dashboard.read` (e.g. QC). */
export function landingPath(checker: PermissionChecker): string {
  // Delivery staff (assigned deliveries but no shipment oversight) work from /delivery, not an empty "My work".
  if (!checker.can("dashboard.read") && checker.can("deliveries.read_assigned") && !checker.can("shipments.read")) return "/delivery";
  const first = filterNav(checker).flatMap((s) => s.items)[0];
  return first?.href ?? "/notifications";
}
