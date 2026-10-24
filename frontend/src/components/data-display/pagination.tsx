import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import type { PageMeta } from "@/types/api";
import { formatNumber } from "@/lib/utils/format";

export const PAGE_SIZES = [10, 20, 50, 100];

export function Pagination({ meta, onPageChange, onPageSizeChange }: { meta: PageMeta; onPageChange: (page: number) => void; onPageSizeChange?: (size: number) => void }) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 text-xs text-muted-foreground">
      <span aria-live="polite">{formatNumber(from)}–{formatNumber(to)} of {formatNumber(meta.total)}</span>
      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <Select aria-label="Rows per page" className="h-8 w-20" value={String(meta.pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))} options={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))} />
        ) : null}
        <IconButton size="sm" variant="secondary" label="Previous page" icon={<ChevronLeft className="rtl:rotate-180" />} disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} />
        <span className="min-w-16 text-center tabular-nums">Page {meta.page} / {pages}</span>
        <IconButton size="sm" variant="secondary" label="Next page" icon={<ChevronRight className="rtl:rotate-180" />} disabled={meta.page >= pages} onClick={() => onPageChange(meta.page + 1)} />
      </div>
    </div>
  );
}
