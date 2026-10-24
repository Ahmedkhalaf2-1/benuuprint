import type { AuthRole, AuthUser } from "@/types/auth";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/**
 * Contract (live OpenAPI AuthProfileDto): { id, name, email, roles: string[], permissions: string[] }.
 * Permissions are used exactly as sent: never derived from role names.
 */
export function normalizeUser(raw: unknown): AuthUser | null {
  if (!isRecord(raw)) return null;
  const src = isRecord(raw.user) ? raw.user : raw;
  const id = str(src.id);
  if (!id) return null;

  const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const roles: AuthRole[] = strings(src.roles).map((code) => ({ code }));
  const permissions = strings(src.permissions);

  return {
    id,
    name: str(src.name) ?? str(src.email) ?? "Staff",
    email: str(src.email) ?? "",
    phone: str(src.phone) ?? null,
    roles,
    permissions,
  };
}
