import { describe, expect, it } from "vitest";
import { filterNav, navSections } from "@/features/navigation/nav-config";
import { createPermissionChecker, satisfies } from "@/lib/permissions";

describe("permission helpers", () => {
  const c = createPermissionChecker(["a.read", "b.read"]);
  it("can", () => { expect(c.can("a.read")).toBe(true); expect(c.can("x")).toBe(false); });
  it("canAny", () => { expect(c.canAny("x", "b.read")).toBe(true); expect(c.canAny("x", "y")).toBe(false); expect(c.canAny()).toBe(false); });
  it("canAll", () => { expect(c.canAll("a.read", "b.read")).toBe(true); expect(c.canAll("a.read", "x")).toBe(false); });
  it("handles missing grants", () => { expect(createPermissionChecker(null).can("a")).toBe(false); });
  it("satisfies: no requirement = any authenticated; all-mode", () => {
    expect(satisfies(c, {})).toBe(true);
    expect(satisfies(c, { requiredPermissions: ["a.read", "x"], match: "all" })).toBe(false);
    expect(satisfies(c, { requiredPermissions: ["a.read", "x"] })).toBe(true);
  });
});

describe("navigation filtering", () => {
  const labels = (perms: string[]) => filterNav(createPermissionChecker(perms)).flatMap((s) => s.items.map((i) => i.label));
  it("shows only notifications to a user with no permissions", () => { expect(labels([])).toEqual(["Notifications"]); });
  it("shows items by permission code and drops empty sections", () => {
    const sections = filterNav(createPermissionChecker(["customers.read", "payments.read"]));
    expect(sections.map((s) => s.title)).toEqual(["Customers", "Commercial", "Management"]);
    expect(labels(["customers.read"])).toEqual(["Customers", "Brands", "Notifications"]);
  });
  it("nav permission: floor staff see My work (not the board); board readers see Production", () => {
    expect(labels(["jobs.read_assigned"])).toContain("My work");
    expect(labels(["jobs.read_assigned"])).not.toContain("Production");
    expect(labels(["production_board.read"])).toContain("Production");
    expect(labels(["production_board.read"])).not.toContain("My work");
    expect(labels(["jobs.read_all"])).toContain("Production");
    expect(labels(["qc.read"])).not.toContain("Production");
  });
  it("every section is reachable with all permissions", () => {
    const all = navSections.flatMap((s) => s.items.flatMap((i) => i.requiredPermissions ?? []));
    expect(filterNav(createPermissionChecker(all))).toHaveLength(navSections.length);
  });
});

import { landingPath } from "@/features/navigation/nav-config";
describe("landing page", () => {
  it("dashboard when allowed, otherwise the first allowed page (QC has no dashboard.read)", () => {
    expect(landingPath(createPermissionChecker(["dashboard.read", "samples.read"]))).toBe("/dashboard");
    expect(landingPath(createPermissionChecker(["jobs.read_assigned", "qc.read", "quality_kpis.read"]))).toBe("/my-work");
    expect(landingPath(createPermissionChecker([]))).toBe("/notifications");
  });
});

describe("master data navigation", () => {
  const labels = (perms: string[]) => filterNav(createPermissionChecker(perms)).flatMap((s) => s.items.map((i) => i.label));
  it("Master Data needs master_data.read (verified live: SALES and QC have it)", () => {
    expect(labels(["master_data.read"])).toContain("Master Data");
    expect(labels(["master_data.manage"])).not.toContain("Master Data");
    expect(labels(["patterns.manage", "assets.read"])).not.toContain("Master Data");
  });
});
