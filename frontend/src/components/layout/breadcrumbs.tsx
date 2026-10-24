"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("common.breadcrumb")}>
      <ol className="flex flex-wrap items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {c.href && !last ? <Link href={c.href} className="hover:text-foreground">{t.text(c.label)}</Link> : <span aria-current={last ? "page" : undefined} className={last ? "text-foreground" : undefined}>{t.text(c.label)}</span>}
              {!last ? <ChevronRight aria-hidden className="size-3 rtl:rotate-180" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
