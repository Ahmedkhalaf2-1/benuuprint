"use client";

import { Check, ChevronDown, FileText, ImageIcon, Pencil } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Eyebrow } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { GarmentKind } from "@/features/public-site/garment";
import { formatBytes } from "./format";
import { STEPS, STEP_COPY, type StepKey } from "./wizard-config";
import { useI18n } from "@/i18n/provider";

/* ---------------------------------- step header ---------------------------------- */
/** STEP n OF 9 / title / what we ask / why we ask it. The same pattern at the top of every step. */
export function StepHeader({ stepKey, title, help }: { stepKey: StepKey; title?: string; help?: string }) {
  const { t } = useI18n();
  const i = STEPS.findIndex((s) => s.key === stepKey);
  const step = STEPS[i]!;
  const copy = STEP_COPY[stepKey];
  return (
    <header className="space-y-2" data-testid="step-header">
      <Eyebrow>{t("customer.stepV1OfLength", { v1: i + 1, length: STEPS.length })}</Eyebrow>
      <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">{title ?? t.text(step.title)}</h2>
      <p className="max-w-2xl text-muted-foreground">{help ?? copy.help}</p>
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground/80">{t("customer.whyWeAsk")}{" "}<span className="normal-case tracking-normal">{t.text(copy.why)}</span></p>
    </header>
  );
}

/** A labelled group inside a step (e.g. "Who supplies the fabric?"). */
export function GroupCard({ icon, title, help, children, className }: { icon?: ReactNode; title: string; help?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("space-y-4 rounded-lg border bg-surface-muted/40 p-4 sm:p-5", className)}>
      <div className="flex items-start gap-3">
        {icon ? <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm border bg-surface-sunken text-brand [&_svg]:size-4">{icon}</span> : null}
        <div><h3 className="text-base font-semibold tracking-tight">{title}</h3>{help ? <p className="mt-0.5 text-sm text-muted-foreground">{help}</p> : null}</div>
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------ small atoms ----------------------------------- */
export function Chip({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "warning"; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-sm border px-2 text-xs font-medium", tone === "brand" && "border-brand/40 bg-brand-soft/60 text-brand-hover", tone === "warning" && "border-tone-warning-dot/40 bg-tone-warning-bg text-tone-warning-fg", tone === "neutral" && "bg-surface-sunken text-muted-foreground", className)}>{children}</span>;
}

/** Colour dot/swatch. No hex means a hatched placeholder, never an invented colour. */
export function Swatch({ hex, size = "md", className }: { hex?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const valid = !!hex && /^#[0-9a-fA-F]{3,8}$/.test(hex);
  return <span aria-hidden className={cn("inline-block shrink-0 rounded-full border border-white/20", size === "sm" && "size-4", size === "md" && "size-6", size === "lg" && "size-10", !valid && "bg-[repeating-linear-gradient(135deg,var(--border)_0_3px,transparent_3px_6px)]", className)} style={valid ? { background: hex! } : undefined} />;
}

/** key → value, hidden when empty so cards only show real data. */
export function Fact({ label, children, className }: { label: string; children?: ReactNode; className?: string }) {
  if (children === null || children === undefined || children === "" || children === false) return null;
  return <div className={cn("min-w-0", className)}><dt className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt><dd className="mt-0.5 break-words text-sm">{children}</dd></div>;
}

/** A catalogue product name → the presentation-only garment identifier used by the public site visuals. */
export function garmentKindFor(name: string): GarmentKind {
  const n = name.toLowerCase();
  if (/hood/.test(n)) return "hoodie";
  if (/sweat|crew|pullover/.test(n)) return "sweatshirt";
  if (/polo/.test(n)) return "polo";
  if (/jacket|coat|bomber|windbreaker/.test(n)) return "jacket";
  if (/pant|trouser|short|jogger|legging|bottom/.test(n)) return "bottoms";
  if (/sport|jersey|track|athletic/.test(n)) return "sportswear";
  if (/t-?shirt|tee/.test(n)) return "tshirt";
  return "custom";
}

/* ----------------------------------------- files ------------------------------------- */
export function FileTile({ name, mime, sizeBytes, typeLabel, status, actions, className }: { name: string; mime?: string; sizeBytes?: number; typeLabel?: string; status?: string; actions?: ReactNode; className?: string }) {
  const image = mime?.startsWith("image/");
  return (
    <li className={cn("bp-enter-item flex items-center gap-3 rounded-md border bg-surface p-3", className)} data-testid="file-tile">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-sm border bg-surface-sunken text-muted-foreground">{image ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">{typeLabel ? <span>{typeLabel}</span> : null}{sizeBytes != null ? <span>{formatBytes(sizeBytes)}</span> : null}{status ? <Chip tone="brand" className="h-5">{status}</Chip> : null}</span>
      </span>
      {actions ? <span className="flex shrink-0 flex-wrap items-center gap-1">{actions}</span> : null}
    </li>
  );
}

/* ------------------------------------ step navigation ------------------------------- */
type NavState = "completed" | "current" | "upcoming";
const navState = (i: number, current: number): NavState => (i < current ? "completed" : i === current ? "current" : "upcoming");

/**
 * The nine steps. From lg: one stepper row (completed = emerald check, current = emphasised, upcoming = restrained).
 * Below lg: a compact "Step 3 of 9 · Fabric & colour" header with a segmented progress bar that opens the full list.
 */
export function StepNav({ current, onGo }: { current: number; onGo: (i: number) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const step = STEPS[current]!;
  return (
    <nav aria-label={t("customer.requestSteps")}>
      <ol className="hidden gap-1.5 lg:flex" data-testid="steps">
        {STEPS.map((s, i) => {
          const st = navState(i, current);
          return (
            <li key={s.key} className="min-w-0 flex-1" data-state={st}>
              <button type="button" aria-current={i === current ? "step" : undefined} onClick={() => onGo(i)} className="group w-full text-start">
                <span className={cn("block h-0.5 transition-colors duration-300", st === "upcoming" ? "bg-border" : "bg-brand")} />
                <span className="mt-2.5 flex items-center gap-2">
                  <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums transition-colors", st === "completed" && "border-brand bg-brand-fill text-white", st === "current" && "border-brand text-brand", st === "upcoming" && "text-muted-foreground")}>{st === "completed" ? <Check className="size-3.5" /> : i + 1}</span>
                  <span className={cn("text-[0.75rem] leading-tight xl:text-[0.8125rem]", st === "current" ? "font-semibold text-foreground" : st === "completed" ? "text-foreground/80" : "text-muted-foreground group-hover:text-foreground")}>{t.text(s.title)}</span>
                </span>
                <span className="sr-only">{st === "completed" ? t("common.completed") : st === "current" ? t("customer.currentStep") : t("common.notStarted")}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="lg:hidden" data-testid="steps-mobile">
        <button type="button" aria-expanded={open} aria-controls="steps-list" onClick={() => setOpen((o) => !o)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md border bg-surface px-4 text-start active:bg-white/5">
          <span><span className="block font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-brand">{t("customer.stepV1OfLength", { v1: current + 1, length: STEPS.length })}</span><span className="block text-base font-semibold">{step.title}</span></span>
          <ChevronDown aria-hidden className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <div aria-hidden className="mt-2 flex gap-1">{STEPS.map((s, i) => <span key={s.key} className={cn("h-1 flex-1 transition-colors duration-300", i <= current ? "bg-brand" : "bg-border")} />)}</div>
        {open ? (
          <ol id="steps-list" className="mt-2 overflow-hidden rounded-md border bg-surface" data-testid="steps-mobile-list">
            {STEPS.map((s, i) => {
              const st = navState(i, current);
              return (
                <li key={s.key} className="border-b last:border-0">
                  <button type="button" aria-current={i === current ? "step" : undefined} onClick={() => { setOpen(false); onGo(i); }} className={cn("flex min-h-12 w-full items-center gap-3 px-4 text-start text-sm active:bg-white/5", i === current && "bg-brand-soft/40")}>
                    <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums", st === "completed" && "border-brand bg-brand-fill text-white", st === "current" && "border-brand text-brand", st === "upcoming" && "text-muted-foreground")}>{st === "completed" ? <Check className="size-3.5" /> : i + 1}</span>
                    <span className={cn(st === "current" ? "font-semibold" : st === "upcoming" ? "text-muted-foreground" : "")}>{t.text(s.title)}</span>
                    <span className="sr-only">{st === "completed" ? t("common.completed") : st === "current" ? t("customer.currentStep") : t("common.notStarted")}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </nav>
  );
}

/* ----------------------------------------- review ------------------------------------ */
/** One summary card on the review page: title, icon, real values, and an Edit action back to its step. */
export function SummaryCard({ stepKey, icon, title, onEdit, highlight, children, className }: { stepKey: StepKey; icon: ReactNode; title: string; onEdit?: (k: StepKey) => void; highlight?: boolean; children: ReactNode; className?: string }) {
  const { t } = useI18n();
  return (
    <section aria-label={title} data-testid={`summary-${stepKey}`} data-highlight={highlight ? "true" : undefined} className={cn("rounded-lg border bg-surface transition-[box-shadow,border-color] duration-700", highlight && "border-brand shadow-[0_0_0_1px_var(--brand)]", className)}>
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"><span aria-hidden className="flex size-7 items-center justify-center rounded-sm border bg-surface-sunken text-brand [&_svg]:size-4">{icon}</span>{title}</h3>
        {onEdit ? <button type="button" onClick={() => onEdit(stepKey)} aria-label={t("customer.editTitle", { title })} className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium text-brand hover:bg-white/5 active:bg-white/10"><Pencil aria-hidden className="size-3.5" />{t("common.edit")}</button> : null}
      </header>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}
