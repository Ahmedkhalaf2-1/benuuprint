"use client";

import Link from "next/link";
import { FABRIC_ATTRIBUTES } from "../content";
import { FABRIC_BOOK } from "../content-pages";
import { START_SAMPLE_HREF } from "../content";
import { PageHero, PublicCta } from "../page-shell";
import { Texture } from "../primitives";
import { useI18n } from "@/i18n/provider";

/** A Fabric Book of curated families. Visuals are decorative; there are no specifications until real fabric data is published. */
export function FabricsPage() {
  const { t, loc } = useI18n();
  return (
    <main>
      <PageHero eyebrow={t("site.fabrics")} title={<>{t("site.theFabric")}{" "}<span className="text-pub-brand">{t("site.book")}</span></>} lede={t("site.fiveFamiliesToStartTheConversation")} outline={t("site.cloth")} />
      <ol>
        {loc(FABRIC_BOOK).map((f, i) => (
          <li key={f.name} id={f.visualKey} className="scroll-mt-20">
            <article aria-labelledby={`fab-${f.visualKey}`} className="group relative isolate flex min-h-[56svh] items-end sm:min-h-[70vh] overflow-hidden border-b border-pub-line">
              <div className="absolute inset-0 -z-10 transition-transform duration-[1600ms] ease-out group-hover:scale-105 motion-reduce:transition-none"><Texture kind={f.visualKey} /></div>
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-pub-bg via-pub-bg/40 to-transparent" />
              <div className="mx-auto grid w-full max-w-[88rem] gap-8 px-5 pb-10 pt-32 sm:pb-14 sm:pt-40 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:px-12">
                <div>
                  <p className="font-mono text-sm text-pub-brand">{String(i + 1).padStart(2, "0")}</p>
                  <h2 id={`fab-${f.visualKey}`} className="mt-3 text-[clamp(3.5rem,11vw,10rem)] font-semibold uppercase [line-height:0.88] tracking-[-0.055em]">{f.name}</h2>
                </div>
                <dl className="grid gap-5 text-sm">
                  <div><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-brand">{t("site.character")}</dt><dd className="mt-1.5 text-lg text-pub-text">{f.character}</dd></div>
                  <div><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-brand">{t("site.typicalApplication")}</dt><dd className="mt-1.5 text-lg text-pub-text">{f.use}</dd></div>
                </dl>
              </div>
            </article>
          </li>
        ))}
      </ol>
      <section aria-labelledby="choose-title" className="bg-pub-surface">
        <div className="mx-auto w-full max-w-[88rem] px-5 py-16 sm:px-8 sm:py-32 lg:px-12">
          <h2 id="choose-title" className="text-balance text-[clamp(2rem,5vw,4rem)] font-semibold uppercase [line-height:0.95] tracking-[-0.04em]">{t("site.whatWeLookAtTogether")}</h2>
          <dl className="mt-8 grid grid-cols-2 gap-px bg-pub-line sm:mt-12 sm:grid-cols-5 [&>div:last-child]:col-span-2 sm:[&>div:last-child]:col-span-1">
            {loc(FABRIC_ATTRIBUTES).map((a) => <div key={a.label} className="bg-pub-surface py-5 pe-5"><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-brand">{a.label}</dt><dd className="mt-2 text-sm text-pub-muted">{a.note}</dd></div>)}
          </dl>
          <p className="mt-10 max-w-xl text-sm leading-relaxed text-pub-muted">{t("site.thesePagesAreVisualStudiesNot")}</p>
          <p className="mt-6"><Link href={START_SAMPLE_HREF} className="pub-link text-sm font-medium text-pub-brand">{t("site.chooseAFabricInTheSample")}</Link></p>
        </div>
      </section>
      <PublicCta />
    </main>
  );
}
