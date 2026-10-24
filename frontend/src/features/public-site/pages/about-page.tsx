"use client";

import { ABOUT_PRINCIPLES } from "../content-pages";
import { PageHero, PublicCta } from "../page-shell";
import { StartSampleLink } from "../cta";
import { useI18n } from "@/i18n/provider";

/** Factual only: no history, location, team or certification claims until they are provided. */
export function AboutPage() {
  const { t, loc } = useI18n();
  return (
    <main>
      <PageHero eyebrow={t("site.about")} title={<>{t("site.builtAround")}{" "}<span className="text-pub-brand">{t("site.theSample")}</span></>} lede={t("site.benuuPrintMakesCustomApparelFrom")} outline={t.text("Sample")} field>
        <StartSampleLink />
      </PageHero>
      <section aria-labelledby="about-statement" className="border-b border-pub-line">
        <div className="mx-auto w-full max-w-[88rem] px-5 py-16 sm:px-8 sm:py-36 lg:px-12">
          <h2 id="about-statement" className="sr-only">{t("site.whatWeBelieve")}</h2>
          <p className="pub-reveal max-w-5xl text-balance text-[clamp(1.75rem,4vw,3.5rem)] leading-[1.15] tracking-[-0.025em] text-pub-text">{t("site.aGarmentIsEasierToTrust")}{" "}<span className="text-pub-brand">{t("site.oneSampleOneApprovalThenScale")}</span>{" "}{t("site.withTheWholeProcessVisibleNot")}</p>
        </div>
      </section>
      <section aria-labelledby="principles-title" className="bg-pub-surface">
        <div className="mx-auto w-full max-w-[88rem] px-5 py-16 sm:px-8 sm:py-32 lg:px-12">
          <h2 id="principles-title" className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">{t("site.howWeWork")}</h2>
          <ul className="mt-10 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {loc(ABOUT_PRINCIPLES).map((p, i) => (
              <li key={p.title} className="border-t border-pub-line py-6 sm:py-8">
                <span className="font-mono text-xs text-pub-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-2xl font-semibold uppercase tracking-tight">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-pub-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <PublicCta />
    </main>
  );
}
