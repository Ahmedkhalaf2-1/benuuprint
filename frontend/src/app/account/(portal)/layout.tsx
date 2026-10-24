import type { ReactNode } from "react";
import { PortalGuard, PortalShell } from "@/features/portal/shell";

/**
 * The guard wraps the shell and redirects an unauthenticated visitor to `/account/login?next=<path>`, so public CTAs
 * (e.g. Start a Sample -> /account/samples/new) come back to where they were headed after login. A server-side redirect
 * here would drop that destination, so the check lives in the client guard (it reads the customer hint cookie, never staff cookies).
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalGuard>
      <PortalShell>{children}</PortalShell>
    </PortalGuard>
  );
}
