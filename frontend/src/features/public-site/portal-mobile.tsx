"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { PORTAL_ORDER_ACTIVE, PORTAL_ORDER_STEPS, PORTAL_SAMPLES } from "./content";

const TABS = ["Samples", "Quotation", "Order progress"] as const;
type Tab = (typeof TABS)[number];

/**
 * Phones: one account frame with a segmented control instead of another horizontal carousel. Local state only; the content is the
 * same illustrative portal vocabulary the desktop browser frame shows.
 */
export function PortalPhone() {
  const [tab, setTab] = useState<Tab>("Samples");
  return (
    <div className="min-w-0 lg:hidden" data-testid="portal-phone">
      <div className="mx-auto w-full max-w-sm border border-pub-line bg-pub-surface shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]">
        <div className="flex items-center justify-between border-b border-pub-line bg-pub-raise px-4 py-2.5"><span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-pub-muted">Benuu Print · My account</span><span aria-hidden className="h-1 w-8 rounded-full bg-pub-line" /></div>
        <div role="tablist" aria-label="Customer account preview" className="grid grid-cols-3 border-b border-pub-line">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" id={`portal-tab-${t}`} aria-selected={t === tab} aria-controls="portal-panel" onClick={() => setTab(t)} className={cn("h-11 border-b-2 px-1 text-[0.6875rem] font-medium uppercase tracking-[0.06em] transition-colors", t === tab ? "border-pub-brand text-pub-text" : "border-transparent text-pub-muted")}>{t}</button>
          ))}
        </div>
        <div role="tabpanel" id="portal-panel" aria-labelledby={`portal-tab-${tab}`} className="min-h-[15.5rem] space-y-3 p-4">
          {tab === "Samples" ? PORTAL_SAMPLES.map((smp, i) => (
            <div key={smp.number} className="border border-pub-line bg-pub-bg p-4">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-pub-muted">Sample · {smp.number}</p>
              <p className="mt-2 font-semibold">{smp.product}</p>
              <span className={cn("mt-2 inline-block px-2 py-0.5 text-[0.6875rem]", i === 0 ? "bg-pub-brand-deep/30 text-pub-brand" : "bg-white/10 text-pub-text")}>{smp.label}</span>
            </div>
          )) : null}
          {tab === "Quotation" ? (
            <>
              <div className="border border-pub-line bg-pub-bg p-4">
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-pub-muted">Sample · {PORTAL_SAMPLES[1].number}</p>
                <p className="mt-2 font-semibold">{PORTAL_SAMPLES[1].product}</p>
                <span className="mt-2 inline-block bg-white/10 px-2 py-0.5 text-[0.6875rem] text-pub-text">{PORTAL_SAMPLES[1].label}</span>
              </div>
              <p className="border border-pub-brand/40 px-4 py-3 text-sm text-pub-text">{PORTAL_SAMPLES[1].next}</p>
              <p className="text-xs text-pub-muted">Accept the quotation or ask for changes.</p>
            </>
          ) : null}
          {tab === "Order progress" ? (
            <ol className="relative space-y-3.5">
              <span aria-hidden className="absolute start-[9px] top-2 h-[calc(100%-1rem)] w-px bg-pub-line" />
              {PORTAL_ORDER_STEPS.map((st, i) => (
                <li key={st.status} className="relative flex items-center gap-3 text-sm">
                  <span className={cn("relative flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.625rem]", i < PORTAL_ORDER_ACTIVE ? "border-pub-brand bg-pub-brand text-pub-bg" : i === PORTAL_ORDER_ACTIVE ? "border-pub-brand bg-pub-bg text-pub-brand" : "border-pub-line bg-pub-bg text-pub-muted")}>
                    {i === PORTAL_ORDER_ACTIVE ? <span className="pub-ping" /> : null}{i < PORTAL_ORDER_ACTIVE ? "✓" : ""}
                  </span>
                  <span className={cn(i <= PORTAL_ORDER_ACTIVE ? "text-pub-text" : "text-pub-muted")}>{st.label}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[0.625rem] uppercase tracking-[0.16em] text-pub-muted">Illustrative preview</p>
    </div>
  );
}
