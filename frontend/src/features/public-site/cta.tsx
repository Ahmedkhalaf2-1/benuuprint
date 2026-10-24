import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { CONTACT_HREF, CUSTOMER_LOGIN_HREF, START_SAMPLE_HREF } from "./content";

const base = "group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-6 text-sm font-medium tracking-wide transition-colors active:translate-y-px";

/** Primary conversion CTA: always the real customer sample flow. */
export function StartSampleLink({ children = "Start a Sample", className }: { children?: ReactNode; className?: string }) {
  return (
    <Link href={START_SAMPLE_HREF} className={cn(base, "bg-pub-brand-deep text-white hover:bg-pub-brand-deeper", className)}>
      {children}
      <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Customer login: always the customer portal login, never the staff one. */
export function CustomerLoginLink({ children = "Customer Login", className }: { children?: ReactNode; className?: string }) {
  return <Link href={CUSTOMER_LOGIN_HREF} className={cn(base, "border border-pub-line text-pub-text hover:border-pub-muted", className)}>{children}</Link>;
}

export function GhostAnchor({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} className={cn(base, "px-2 text-pub-muted hover:text-pub-text", className)}>{children}</a>;
}

/** Talk to us: the contact page (not the customer login). */
export function ContactLink({ children = "Talk to us", className }: { children?: ReactNode; className?: string }) {
  return <Link href={CONTACT_HREF} className={cn(base, "border border-pub-line text-pub-text hover:border-pub-muted", className)}>{children}</Link>;
}
