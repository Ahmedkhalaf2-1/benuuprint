import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { CUSTOMER_LOGIN_HREF } from "../content";
import { ContactLink } from "../cta";
import { PageHero } from "../page-shell";
import { TrackEntry } from "../track-entry";
import { orderStatusLabel, shipmentStatusLabel, TRACK_STEPS, trackStep, type TrackingResult, type TrackingView } from "../tracking";

export function TrackLandingPage() {
  return (
    <main>
      <PageHero eyebrow="Track an order" title={<>Where is <span className="text-pub-brand">my order?</span></>} lede="Open the tracking link you were sent, or paste it below. Tracking needs no account." outline="Track">
        <div className="w-full"><TrackEntry /></div>
      </PageHero>
      <section className="mx-auto w-full max-w-[88rem] px-5 py-20 sm:px-8 lg:px-12">
        <p className="max-w-xl text-sm leading-relaxed text-pub-muted">A tracking link shows the status of one order and its shipments. Customers can also follow everything from <Link className="pub-link text-pub-text" href={CUSTOMER_LOGIN_HREF}>their account</Link>.</p>
      </section>
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main>
      <PageHero eyebrow="Track an order" title={title} lede={body} outline="Track">
        <div className="w-full"><TrackEntry /></div>
        <ContactLink className="self-start" />
      </PageHero>
    </main>
  );
}

function Qty({ label, value }: { label: string; value: number }) {
  return <div className="bg-pub-bg p-5"><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">{label}</dt><dd className="mt-2 text-3xl font-semibold tracking-tight">{value}</dd></div>;
}

function TrackingDetail({ t }: { t: TrackingView }) {
  const step = trackStep(t.status);
  return (
    <main>
      <PageHero eyebrow={`Order ${t.orderNumber}`} title={orderStatusLabel(t.status)} lede={t.currentStage ? `Now in ${t.currentStage}.` : undefined} outline="Track" field>
        {t.updatedAt ? <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">Updated {formatDate(t.updatedAt)}</p> : null}
      </PageHero>
      <section aria-label="Order progress" className="mx-auto w-full max-w-[88rem] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        {step === null ? (
          <p role="status" className="border border-pub-line bg-pub-surface p-6 text-lg">{t.status === "CANCELLED" ? "This order has been cancelled." : "This order is on hold."}</p>
        ) : (
          <ol className="relative grid gap-0 sm:grid-cols-5 sm:gap-6" data-testid="track-steps">
            {TRACK_STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? "step" : undefined} className={cn("relative pb-7 ps-10 text-sm last:pb-0 sm:border-t-2 sm:pb-0 sm:ps-0 sm:pt-4", i <= step ? "border-pub-brand text-pub-text" : "border-pub-line text-pub-muted")}>
                {i < TRACK_STEPS.length - 1 ? <span aria-hidden className={cn("absolute start-[9px] top-5 h-full w-px sm:hidden", i < step ? "bg-pub-brand" : "bg-pub-line")} /> : null}
                <span aria-hidden className={cn("absolute start-0 top-0.5 flex size-5 items-center justify-center rounded-full border text-[0.625rem] sm:hidden", i < step ? "border-pub-brand bg-pub-brand text-pub-bg" : i === step ? "border-pub-brand bg-pub-bg text-pub-brand" : "border-pub-line bg-pub-bg")}>{i === step ? <span className="pub-ping" /> : i < step ? "✓" : ""}</span>
                <span className="hidden font-mono text-[0.6875rem] text-pub-brand sm:inline">{String(i + 1).padStart(2, "0")}</span><p className="text-base font-medium sm:mt-1 sm:text-sm">{s}</p>
              </li>
            ))}
          </ol>
        )}
        <dl className="mt-10 grid grid-cols-2 gap-px bg-pub-line sm:mt-12 lg:grid-cols-4">
          <Qty label="Ordered" value={t.totalQuantity} /><Qty label="Delivered" value={t.deliveredQuantity} /><Qty label="Still to deliver" value={t.remainingDeliveryQuantity} />
          <div className="bg-pub-bg p-5"><dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">Target delivery</dt><dd className="mt-2 text-xl font-semibold">{formatDate(t.targetDeliveryDate)}</dd></div>
        </dl>
        {t.status === "IN_PRODUCTION" ? (
          <div className="mt-10" aria-label={`Production ${Math.round(t.progressPercent)} percent`}>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">Production progress · {Math.round(t.progressPercent)}%</p>
            <div className="mt-3 h-1 bg-pub-line"><div className="h-full bg-pub-brand" style={{ width: `${t.progressPercent}%` }} /></div>
          </div>
        ) : null}
      </section>
      <section aria-labelledby="ship-title" className="border-t border-pub-line bg-pub-surface">
        <div className="mx-auto w-full max-w-[88rem] px-5 py-16 sm:px-8 lg:px-12">
          <h2 id="ship-title" className="text-3xl font-semibold uppercase tracking-tight">Shipments</h2>
          {t.shipments.length === 0 ? <p className="mt-6 text-pub-muted">No shipments yet. They appear here once your order is ready to go.</p> : (
            <ul className="mt-8 border-t border-pub-line">
              {t.shipments.map((s) => (
                <li key={s.shipmentNumber} className="grid gap-x-8 gap-y-2 border-b border-pub-line py-6 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
                  <span className="font-mono text-sm text-pub-muted">{s.shipmentNumber}</span>
                  <div>
                    <p className={cn("text-xl font-semibold", s.status === "DELIVERY_ATTEMPT_FAILED" || s.status === "RETURNED" ? "text-amber-300" : s.status === "DELIVERED" ? "text-pub-brand" : "text-pub-text")}>{shipmentStatusLabel(s.status)}</p>
                    <p className="mt-1 text-sm text-pub-muted">{s.quantity} {s.quantity === 1 ? "unit" : "units"}{s.dispatchedAt ? ` · dispatched ${formatDate(s.dispatchedAt)}` : ""}{s.deliveredAt ? ` · delivered ${formatDate(s.deliveredAt)}` : ""}{s.courierName ? ` · ${s.courierName}` : ""}</p>
                  </div>
                  {s.trackingUrl ? <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer nofollow" className="pub-link text-sm text-pub-brand">Courier tracking ↗</a> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

/** Safe, non-revealing states for everything that is not a successful lookup. */
export function TrackResultPage({ result }: { result: TrackingResult }) {
  if (result.kind === "ok") return <TrackingDetail t={result.tracking} />;
  if (result.kind === "rate_limited") return <Notice title="Please try again shortly." body="Too many lookups were made. Wait a moment and open the link again." />;
  if (result.kind === "unavailable") return <Notice title="Tracking is unavailable right now." body="We could not load this order. Please try again in a few minutes." />;
  return <Notice title="We can't find that order." body="The tracking link may be incomplete, replaced or no longer active. Check the link you were sent, or contact us." />;
}
