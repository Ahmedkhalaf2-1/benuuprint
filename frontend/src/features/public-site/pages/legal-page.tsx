"use client";

import type { LegalSection } from "../content-pages";
import { LEGAL_NOTICE } from "../content-pages";
import { PageHero } from "../page-shell";
import { useI18n } from "@/i18n/provider";

export function PendingNote({ items }: { items: string[] }) {
  const { t, loc } = useI18n();
  return (
    <ul className="mt-4 space-y-2" data-testid="legal-pending">
      {loc(items).map((item) => <li key={item} className="flex gap-3 border border-dashed border-pub-brand/50 bg-pub-brand-deep/10 px-4 py-3 text-sm text-pub-text"><span className="shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-pub-brand">{t("site.toBeConfirmed")}</span><span>{item}</span></li>)}
    </ul>
  );
}

/** Structured legal shell: facts about how the service works, with every business/legal decision visibly marked. */
export function LegalPage({ eyebrow, title, sections: sourceSections }: { eyebrow: string; title: string; sections: LegalSection[] }) {
  const { t, loc } = useI18n();
  const sections = loc(sourceSections);
  return (
    <main>
      <PageHero eyebrow={t.text(eyebrow)} title={t.text(title)} />
      <div className="mx-auto grid w-full max-w-[88rem] gap-8 px-5 py-10 sm:gap-12 sm:px-8 sm:py-24 lg:grid-cols-[16rem_1fr] lg:px-12">
        <nav aria-label={t("site.onThisPage")} className="hidden lg:block"><ul className="sticky top-28 space-y-2 text-sm">{sections.map((s) => <li key={s.id}><a className="pub-link text-pub-muted hover:text-pub-text" href={`#${s.id}`}>{s.title}</a></li>)}</ul></nav>
        <div className="max-w-3xl">
          <details className="mb-6 border border-pub-line lg:hidden">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">{t("site.onThisPage")}<span aria-hidden className="text-pub-muted">+</span></summary>
            <ul className="space-y-1 border-t border-pub-line px-4 py-3 text-sm">{sections.map((s) => <li key={s.id}><a className="block py-2 text-pub-muted active:text-pub-text" href={`#${s.id}`}>{s.title}</a></li>)}</ul>
          </details>
          <p role="note" className="border border-pub-line bg-pub-surface p-5 text-sm leading-relaxed text-pub-muted">{t.text(LEGAL_NOTICE)}</p>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="scroll-mt-24 border-b border-pub-line py-8 sm:py-10">
              <h2 id={`${s.id}-t`} className="text-2xl font-semibold tracking-tight"><span className="me-3 font-mono text-sm text-pub-brand">{String(i + 1).padStart(2, "0")}</span>{s.title}</h2>
              {s.body.map((p) => <p key={p} className="mt-4 text-base leading-[1.7] text-pub-muted">{p}</p>)}
              {s.pending?.length ? <PendingNote items={s.pending} /> : null}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
