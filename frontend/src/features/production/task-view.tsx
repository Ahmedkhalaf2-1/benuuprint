"use client";

import { ColorSwatch } from "@/components/data-display/color-swatch";
import { humanizeCode } from "@/lib/utils/format";
import type { TaskView } from "./types";
import { useI18n } from "@/i18n/provider";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const empty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (isObj(v) && Object.values(v).every(empty));
const label = (k: string) => humanizeCode(k.replace(/([a-z])([A-Z])/g, "$1_$2"));

function Value({ v }: { v: unknown }): React.ReactNode {
  const { t } = useI18n();
  if (isObj(v) && ("hex" in v || "pantone" in v) && typeof v.name === "string") return <ColorSwatch name={v.name} hex={(v.hex as string) ?? null} pantone={(v.pantone as string) ?? null} size="sm" />;
  if (isObj(v) && typeof v.name === "string" && typeof v.code === "string") return <>{v.name} <span className="font-mono text-xs text-muted-foreground">{v.code}</span></>;
  if (Array.isArray(v)) return <ul className="space-y-1">{v.filter((x) => !empty(x)).map((x, i) => <li key={i}><Value v={x} /></li>)}</ul>;
  if (isObj(v)) return <Rows data={v} nested />;
  if (typeof v === "boolean") return <>{v ? t("production.yes") : t("production.no")}</>;
  return <span className="whitespace-pre-wrap">{String(v)}</span>;
}

function Rows({ data, nested }: { data: Record<string, unknown>; nested?: boolean }) {
  const entries = Object.entries(data).filter(([, v]) => !empty(v));
  return (
    <dl className={nested ? "space-y-1 border-s ps-3" : "space-y-2"}>
      {entries.map(([k, v]) => (
        <div key={k} className="text-sm"><dt className="text-xs text-muted-foreground">{label(k)}</dt><dd className="mt-0.5"><Value v={v} /></dd></div>
      ))}
    </dl>
  );
}

/**
 * The department-specific task view built by the backend from the FROZEN specification. Its keys differ per department
 * (fabric: fabric/colour/GSM/provider; pattern: fit/pattern; printing: artwork/placement…), so it is rendered generically and
 * read-only. Empty fields are skipped. It never contains prices or customer contact data (the backend omits them).
 */
export function TaskViewPanel({ view }: { view: TaskView }) {
  const { t } = useI18n();
  return (
    <section aria-label={t("production.taskSpecification")} data-testid="task-view" className="rounded-md border bg-surface-muted/50 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("production.specificationFrozenReadOnly")}</p>
      <Rows data={view} />
    </section>
  );
}
