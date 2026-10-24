"use client";

import { CAPABILITY_DETAILS } from "../content-pages";
import { StartSampleLink } from "../cta";
import { PageHero, PublicCta } from "../page-shell";
import { useI18n } from "@/i18n/provider";

export function CapabilitiesPage() {
  const { t, loc } = useI18n();
  return (
    <main>
      <PageHero eyebrow={t("site.capabilities")} title={<>{t("site.onePartner2")}{" "}<span className="text-pub-brand">{t("site.startToFinish")}</span></>} lede={t("site.eightAreasOfWorkFromThe")} outline={t("site.make")}>
        <StartSampleLink />
      </PageHero>
      <ol>
        {loc(CAPABILITY_DETAILS).map((c, i) => (
          <li key={c.name} id={CAPABILITY_DETAILS[i]!.name.toLowerCase().replace(/[^a-z]+/g, "-")} className="scroll-mt-20 border-b border-pub-line even:bg-pub-surface">
            <article aria-labelledby={`cap-${i}`} className="mx-auto grid w-full max-w-[88rem] gap-10 px-5 py-12 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-12">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="font-mono text-sm text-pub-brand">{String(i + 1).padStart(2, "0")} / {String(CAPABILITY_DETAILS.length).padStart(2, "0")}</p>
                <h2 id={`cap-${i}`} className="mt-4 text-balance text-[clamp(2.25rem,5vw,4.5rem)] font-semibold uppercase [line-height:0.95] tracking-[-0.04em]">{c.name}</h2>
              </div>
              <div className="pub-reveal">
                <p className="text-balance text-2xl leading-snug text-pub-text sm:text-3xl">{c.position}</p>
                <dl className="mt-8 grid gap-px bg-pub-line sm:mt-12 sm:grid-cols-3">
                  {([[t("site.whatHappens"), c.happens], [t("site.whyItMatters"), c.matters], [t("site.whatYouReceive"), c.receive]] as const).map(([k, v]) => (
                    <div key={k} className="bg-pub-bg p-4 sm:p-6"><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-brand">{k}</dt><dd className="mt-3 text-sm leading-relaxed text-pub-muted">{v}</dd></div>
                  ))}
                </dl>
              </div>
            </article>
          </li>
        ))}
      </ol>
      <PublicCta />
    </main>
  );
}
