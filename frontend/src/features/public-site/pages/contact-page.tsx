import Link from "next/link";
import { ContactForm } from "../contact-form";
import { CUSTOMER_LOGIN_HREF, START_SAMPLE_HREF } from "../content";
import { PageHero } from "../page-shell";

export function ContactPage() {
  return (
    <main>
      <PageHero eyebrow="Contact" title={<>Talk to <span className="text-pub-brand">us.</span></>} lede="Tell us about the project. If you already know what you want made, the fastest route is a sample request." outline="Hello" />
      <div className="mx-auto grid w-full max-w-[88rem] gap-16 px-5 py-12 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
        <aside aria-label="Other ways in" className="space-y-8 sm:space-y-10">
          <div><h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">Contact details</h2><p className="mt-3 text-sm leading-relaxed text-pub-muted">Direct contact details will be published here.</p></div>
          <div><h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">Ready to start?</h2><p className="mt-3 text-sm leading-relaxed text-pub-muted"><Link className="pub-link text-pub-text" href={START_SAMPLE_HREF}>Start a sample request</Link> and we will take it from there.</p></div>
          <div><h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-brand">Already a customer?</h2><p className="mt-3 text-sm leading-relaxed text-pub-muted"><Link className="pub-link text-pub-text" href={CUSTOMER_LOGIN_HREF}>Sign in to your account</Link> to follow your samples and orders.</p></div>
        </aside>
        <ContactForm />
      </div>
    </main>
  );
}
