"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import type { PageMeta } from "@/types/api";

import { useI18n } from "@/i18n/provider";

export const PAGE_SIZES = [10, 20, 50, 100];

export function Pagination({ meta, onPageChange, onPageSizeChange }: { meta: PageMeta; onPageChange: (page: number) => void; onPageSizeChange?: (size: number) => void }) {
  const { t, fmt } = useI18n();
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 text-xs text-muted-foreground">
      <span aria-live="polite">{t("common.fromToOfTotal", { from: fmt.number(from), to: fmt.number(to), total: fmt.number(meta.total) })}</span>
      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <Select aria-label={t("common.rowsPerPage")} className="h-8 w-20" value={String(meta.pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))} options={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))} />
        ) : null}
        <IconButton size="sm" variant="secondary" label={t("common.previousPage")} icon={<ChevronLeft className="rtl:rotate-180" />} disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} />
        <span className="min-w-16 text-center tabular-nums">{t("common.pagePagePages", { page: meta.page, pages })}</span>
        <IconButton size="sm" variant="secondary" label={t("common.nextPage")} icon={<ChevronRight className="rtl:rotate-180" />} disabled={meta.page >= pages} onClick={() => onPageChange(meta.page + 1)} />
      </div>
    </div>
  );
}
