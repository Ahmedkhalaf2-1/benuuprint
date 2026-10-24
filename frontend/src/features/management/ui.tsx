"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { etaView, presetRange, rangeFromParams, rangeLabel } from "./logic";
import type { EtaQuality, Range } from "./types";
import { useI18n } from "@/i18n/provider";

/** The selected KPI range lives in the URL (`?from=&to=`, business-day dates). Empty = backend default (last 30 days). */
export function useRange(): { range: Range; set: (r: Range) => void } {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const range = rangeFromParams(sp);
  const set = (r: Range) => {
    const p = new URLSearchParams(sp.toString());
    for (const k of ["from", "to"] as const) { const v = r[k]; if (v) p.set(k, v); else p.delete(k); }
    router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false });
  };
  return { range, set };
}

export function RangeControl({ range, onChange, timezone }: { range: Range; onChange: (r: Range) => void; timezone?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-end gap-2" data-testid="range-control">
      <div className="flex gap-1" role="group" aria-label={t("management.rangePresets")}>
        {([["7d", 7], ["30d", 30], ["90d", 90]] as const).map(([l, d]) => <Button key={l} size="sm" variant="secondary" onClick={() => onChange(presetRange(d))}>{l}</Button>)}
        <Button size="sm" variant="ghost" onClick={() => onChange({})}>{t("management.default")}</Button>
      </div>
      <label className="text-xs text-muted-foreground">{t("common.from")}<DatePicker aria-label={t("common.from")} className="h-8 w-36" value={range.from ?? ""} onChange={(e) => onChange({ ...range, from: e.target.value || undefined })} /></label>
      <label className="text-xs text-muted-foreground">{t("common.to")}<DatePicker aria-label={t("common.to")} className="h-8 w-36" value={range.to ?? ""} onChange={(e) => onChange({ ...range, to: e.target.value || undefined })} /></label>
      <p className="pb-1 text-xs text-muted-foreground">{rangeLabel(range)}{timezone ? t("management.businessTimeTimezone", { timezone }) : ""}</p>
    </div>
  );
}

/**
 * One independent management section. Its own loading / 403 / error states, so a failing endpoint never takes the page down:
 * 403 = a quiet "not available" note (never a sign-out), other errors = inline retry.
 */
export function QuerySection<T>({ title, query, children, action, testId, description, className }: {
  title: string; query: UseQueryResult<T>; children: (data: T) => ReactNode; action?: ReactNode; testId?: string; description?: string; className?: string;
}) {
  const { t } = useI18n();
  const forbidden = query.error && isApiError(query.error) && query.error.kind === "forbidden";
  const limited = query.error && isApiError(query.error) && query.error.kind === "rate_limited";
  return (
    <Card className={className} data-testid={testId} aria-busy={query.isLoading}>
      <CardHeader><CardTitle>{title}</CardTitle>{action ? <div className="flex items-center gap-2">{action}</div> : null}</CardHeader>
      <CardContent>
        {description ? <p className="mb-3 text-xs text-muted-foreground">{description}</p> : null}
        {query.isLoading ? <Skeleton className="h-24" /> : forbidden ? <p role="status" className="text-sm text-muted-foreground" data-testid="section-forbidden">{t("management.notAvailableForYourRole")}</p>
          : query.error ? <ErrorState className="py-4" title={limited ? t("management.tooManyRequestsTryAgainShortly") : t("management.couldNotLoadV1", { v1: title.toLowerCase() })} error={query.error} onRetry={() => query.refetch()} />
          : query.data !== undefined ? children(query.data) : null}
      </CardContent>
    </Card>
  );
}

export function RefreshButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  const { t } = useI18n();
  return <Button variant="secondary" size="sm" loading={busy} onClick={onClick}><RefreshCw />{" "}{t("management.refresh")}</Button>;
}

/** A figure. `null`/`undefined` = unknown ("—" plus the reason), never a zero. `href` makes it a drill-down. */
export function Metric({ label, value, hint, tone, href, testId }: { label: string; value: ReactNode; hint?: string; tone?: "danger" | "warning" | "good"; href?: string; testId?: string }) {
  const { t } = useI18n();
  const body = (
    <div className={cn("rounded-md border bg-surface p-3", href && "hover:border-brand hover:bg-surface-muted")} data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums leading-none", tone === "danger" && "text-danger", tone === "warning" && "text-tone-warning-fg", tone === "good" && "text-tone-success-fg")}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href} aria-label={t("management.labelOpen", { label })} className="block">{body}</Link> : body;
}

/** Part-of-whole bar from backend counts (no recomputation beyond the proportions). */
export function SegmentBar({ segments, label }: { segments: Array<{ label: string; value: number; className: string }>; label: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <div>
      <div role="img" aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`} className="flex h-2.5 overflow-hidden rounded-full bg-border">
        {total > 0 ? segments.filter((s) => s.value > 0).map((s) => <span key={s.label} style={{ width: `${(s.value / total) * 100}%` }} className={cn("h-full", s.className)} />) : null}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">{segments.map((s) => <li key={s.label} className="flex items-center gap-1"><span aria-hidden className={cn("inline-block size-2 rounded-full", s.className)} />{s.label} <span className="font-medium tabular-nums text-foreground">{s.value}</span></li>)}</ul>
    </div>
  );
}

/** Horizontal ranked bars (e.g. waiting time by stage). */
export function RankedBars({ rows, label, unit }: { rows: Array<{ key: string; label: ReactNode; value: number; text: string; href?: string; sub?: string }>; label: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol aria-label={label} className="space-y-1.5" data-testid="ranked-bars">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate">{r.href ? <Link href={r.href} className="hover:text-brand hover:underline">{r.label}</Link> : r.label}{r.sub ? <span className="block truncate text-xs text-muted-foreground">{r.sub}</span> : null}</span>
          <span className="h-2 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-brand" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="w-20 text-end text-xs tabular-nums text-muted-foreground">{r.text}{unit ?? ""}</span>
        </li>
      ))}
    </ol>
  );
}

/** ETA with its confidence: a low-confidence estimate always carries the caveat; no estimate is "Not estimable". */
export function EtaText({ at, quality, compact }: { at: string | null | undefined; quality: EtaQuality | undefined; compact?: boolean }) {
  const { t, fmt } = useI18n();
  const v = etaView(at, quality, formatDate);
  return (
    <span data-testid="eta" data-tone={v.tone} data-quality={quality ?? ""}>
      <span className={cn(v.tone === "unknown" && "text-muted-foreground")}>{compact && at ? fmt.date(at) : v.label}</span>
      {v.caveat ? <span className="block text-xs text-tone-warning-fg">{compact ? quality === "LOW" ? t("management.lowConfidence") : quality === "MEDIUM" ? t("management.mediumConfidence") : v.caveat : v.caveat}</span> : null}
    </span>
  );
}

export const PositiveEmpty = ({ children }: { children: ReactNode }) => <p role="status" className="rounded-md bg-tone-success-bg px-3 py-2 text-sm text-tone-success-fg" data-testid="positive-empty">{children}</p>;
