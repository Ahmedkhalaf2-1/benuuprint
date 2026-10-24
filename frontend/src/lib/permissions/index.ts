/**
 * Permission checks are UX only. The backend re-resolves roles -> permissions on every
 * request and stays authoritative; never rely on these for security.
 */
export interface PermissionChecker {
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
  canAll: (...permissions: string[]) => boolean;
}

export function createPermissionChecker(granted: readonly string[] | null | undefined): PermissionChecker {
  const set = new Set(granted ?? []);
  return {
    can: (p) => set.has(p),
    canAny: (...ps) => ps.some((p) => set.has(p)),
    canAll: (...ps) => ps.every((p) => set.has(p)),
  };
}

export interface PermissionRequirement {
  /** Empty / undefined means any authenticated staff member. */
  requiredPermissions?: readonly string[];
  /** "any" (default): one of them is enough. "all": every one is needed. */
  match?: "any" | "all";
}

export function satisfies(checker: PermissionChecker, req: PermissionRequirement): boolean {
  const perms = req.requiredPermissions ?? [];
  if (perms.length === 0) return true;
  return req.match === "all" ? checker.canAll(...perms) : checker.canAny(...perms);
}
