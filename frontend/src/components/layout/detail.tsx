import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { cn } from "@/lib/utils/cn";

/** Generic detail-page header: reference, title, status and actions. Reusable by samples / orders / jobs. */
export function DetailHeader({
  title,
  reference,
  status,
  breadcrumbs,
  actions,
  meta,
}: {
  title: string;
  reference?: string;
  status?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6 border-b border-border/70 pb-5">
      {breadcrumbs ? <div className="mb-1.5"><Breadcrumbs items={breadcrumbs} /></div> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {reference ? <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-brand">{reference}</p> : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 break-words text-[1.875rem] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
            {status}
          </div>
          {meta ? <div className="mt-1 text-sm text-muted-foreground">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function InfoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</dl>;
}

/** Empty values render an em dash so layout never shifts. */
export function InfoItem({ label, children, className }: { label: string; children?: ReactNode; className?: string }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{empty ? <span className="text-muted-foreground">—</span> : children}</dd>
    </div>
  );
}

