"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/i18n/provider";

export const MASTER_SECTIONS = [
  { label: "Overview", href: "/master-data", exact: true },
  { label: "Product Types", href: "/master-data/products" },
  { label: "Fabrics", href: "/master-data/fabrics" },
  { label: "Sizes", href: "/master-data/sizes" },
  { label: "Print Methods", href: "/master-data/print-methods" },
  { label: "Accessories", href: "/master-data/accessories" },
  { label: "Labels & Packaging", href: "/master-data/components" },
  { label: "Patterns", href: "/master-data/patterns" },
  { label: "Configurator", href: "/master-data/configurator" },
] as const;

/** Section tabs. Real links (keyboard + middle-click friendly) with aria-current on the active one. */
export function MasterNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav aria-label={t("masterData.masterDataSections")} className="-mt-1 mb-5 overflow-x-auto border-b">
      <ul className="flex min-w-max gap-5">
        {MASTER_SECTIONS.map((s) => {
          const active = "exact" in s ? pathname === s.href : pathname === s.href || pathname.startsWith(`${s.href}/`);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn("-mb-px inline-flex h-10 items-center whitespace-nowrap border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-foreground", active && "border-brand text-foreground")}
              >
                {t.text(s.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
