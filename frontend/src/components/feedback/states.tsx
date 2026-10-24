import { AlertCircle, Inbox, ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";

function StateShell({ icon, title, description, children, className, role }: { icon: ReactNode; title: string; description?: ReactNode; children?: ReactNode; className?: string; role?: "alert" | "status" }) {
  return (
    <div role={role} className={cn("flex flex-col items-center justify-center gap-2 px-4 py-10 text-center", className)}>
      <div aria-hidden className="flex size-11 items-center justify-center rounded-sm border bg-surface-sunken text-muted-foreground [&_svg]:size-5">{icon}</div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description, icon, action, className }: { title?: string; description?: string; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <StateShell role="status" icon={icon ?? <Inbox />} title={title} description={description} className={className}>
      {action}
    </StateShell>
  );
}

export function ErrorState({ error, title = "Something went wrong", onRetry, className }: { error?: unknown; title?: string; onRetry?: () => void; className?: string }) {
  const api = error instanceof ApiError ? error : null;
  const description = api ? api.messages.join(" ") : "Please try again.";
  return (
    <StateShell role="alert" icon={<AlertCircle className="text-danger" />} title={title} description={description} className={className}>
      {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button> : null}
      {api?.requestId ? <p className="w-full text-xs text-muted-foreground">Reference: <code className="font-mono">{api.requestId}</code></p> : null}
    </StateShell>
  );
}

export function AccessDeniedState({ title = "Access denied", description = "Your account does not have permission to view this. Ask an administrator if you need access.", className }: { title?: string; description?: string; className?: string }) {
  return <StateShell role="alert" icon={<ShieldX />} title={title} description={description} className={className} />;
}

/* ---- skeletons ---- */
export function MetricSkeleton() {
  return (
    <div className="rounded-lg border bg-surface p-3.5" aria-hidden>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-6 w-14" />
    </div>
  );
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading table" className="divide-y">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-5">
      <div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-80" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <MetricSkeleton key={i} />)}</div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading details" className="space-y-5">
      <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-72" /></div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
