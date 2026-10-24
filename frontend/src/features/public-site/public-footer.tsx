import Link from "next/link";
import { CUSTOMER_LOGIN_HREF, START_SAMPLE_HREF } from "./content";
import { Wordmark } from "./public-header";

const link = "pub-link text-sm text-pub-muted hover:text-pub-text";

const GROUPS = [
  { title: "Manufacturing", links: [["Capabilities", "/capabilities"], ["Products", "/products"], ["Fabrics", "/fabrics"], ["Process", "/process"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Track an order", "/track"]] },
  { title: "Customer", links: [["Customer Login", CUSTOMER_LOGIN_HREF], ["Start a Sample", START_SAMPLE_HREF]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"]] },
] as const;

export function PublicFooter() {
  return (
    <footer data-cta-end className="border-t border-pub-line">
      <div className="mx-auto grid w-full max-w-[88rem] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:px-12">
        <div>
          <Wordmark className="text-sm" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-pub-muted">Custom apparel manufacturing, from first sample to delivery.</p>
        </div>
        {GROUPS.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-pub-text">{g.title}</h2>
            <ul className="space-y-2.5">{g.links.map(([label, href]) => <li key={href}><Link className={link} href={href}>{label}</Link></li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-pub-line"><p className="mx-auto w-full max-w-[88rem] px-5 py-6 text-xs text-pub-muted sm:px-8 lg:px-12">© Benue Print</p></div>
    </footer>
  );
}
