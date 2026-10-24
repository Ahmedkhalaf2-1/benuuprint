"use client";

import type { ReactNode } from "react";
import { AccessDeniedState } from "@/components/feedback/states";
import { useAuth } from "./auth-provider";

/** UX gate for pages that only make sense with a permission (the backend still enforces it). */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <AccessDeniedState />;
}
