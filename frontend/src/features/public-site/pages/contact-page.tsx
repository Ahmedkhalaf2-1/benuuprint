"use client";

import Link from "next/link";
import { ContactForm } from "../contact-form";
import { CUSTOMER_LOGIN_HREF, START_SAMPLE_HREF } from "../content";
import { PageHero } from "../page-shell";
import { useI18n } from "@/i18n/provider";

export function ContactPage() {
  const { t } = useI18n();
  return (
    <main>
      <PageHero eyebrow={t("site.contact")} title={<>{t("site.talkTo")}{" "}<span className="text-pub-brand">{t("site.us")}</span></>} lede={t("site.tellUsAboutTheProjectIf")} outline={t("site.hello")} />
      <div className="mx-auto grid w-full max-w-[88rem] gap-16 px-5 py-12 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
        <aside aria-label={t("site.otherWaysIn")} className="space-y-8 sm:space-y-10">
          <div><h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">{t("site.contactDetails")}</h2><p className="mt-3 text-sm leading-relaxed text-pub-muted">{t("site.directContactDetailsWillBePublished")}</p></div>
          <div><h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">{t("site.readyToStart")}</h2><p className="mt-3 text-sm leading-relaxed text-pub-muted"><Link className="pub-link text-pub-text" href={START_SAMPLE_HREF}>{t("site.startASampleRequest")}</Link>{" "}{t("site.andWeWillTakeItFrom")}</p></div>
          <div><h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">{t("site.alreadyACustomer")}</h2><p className="mt-3 text-sm leading-relaxed text-pub-muted"><Link className="pub-link text-pub-text" href={CUSTOMER_LOGIN_HREF}>{t("site.signInToYourAccount")}</Link>{" "}{t("site.toFollowYourSamplesAndOrders")}</p></div>
        </aside>
        <ContactForm />
      </div>
    </main>
  );
}
