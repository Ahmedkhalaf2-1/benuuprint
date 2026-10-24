"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { useI18n } from "@/i18n/provider";

export function TableToolbar({ search, onSearchChange, searchPlaceholder, filters, actions }: { search: string; onSearchChange: (v: string) => void; searchPlaceholder?: string; filters?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-surface-sunken/60 p-3">
      <SearchInput value={search} onValueChange={onSearchChange} placeholder={searchPlaceholder} className="w-full sm:w-64" />
      {filters}
      {actions ? <div className="ms-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Row of filter controls with a single reset action; the values themselves live in the URL. */
export function FilterBar({ children, activeCount, onReset }: { children: ReactNode; activeCount: number; onReset: () => void }) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("common.filters")} className="flex flex-wrap items-center gap-2">
      {children}
      {activeCount > 0 ? <Button variant="ghost" size="sm" onClick={onReset}>{t("common.clearFiltersActivecount", { activeCount })}</Button> : null}
    </div>
  );
}
