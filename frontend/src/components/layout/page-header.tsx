"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/card";
import { navSections } from "@/features/navigation/nav-config";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/** The nav group a path belongs to (e.g. /production/jobs/1 -> "Operations"), used as the page eyebrow. Presentation only. */
export function sectionFor(pathname: string): string | undefined {
  for (const s of navSections) if (s.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))) return s.title;
  return undefined;
}

/**
 * Standard dashboard page header: eyebrow / title / description, actions at the right.
 * Dense and functional (not marketing-sized): the eyebrow is derived from the navigation group unless given.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  eyebrow?: string;
}) {
  const pathname = usePathname();
  const label = eyebrow ?? sectionFor(pathname);
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-border/70 pb-5">
      <div className="min-w-0">
        {breadcrumbs ? <div className="mb-2"><Breadcrumbs items={breadcrumbs} /></div> : label ? <Eyebrow className="mb-2">{label}</Eyebrow> : null}
        <h1 className="truncate text-[1.875rem] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold leading-tight tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
