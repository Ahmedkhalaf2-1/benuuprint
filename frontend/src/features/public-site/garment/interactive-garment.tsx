"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Garment2D } from "./garment-2d";
import { has3dModel } from "./renderer-policy";
import { RenderBoundary } from "./render-boundary";
import { useGarmentRenderer } from "./use-garment-renderer";
import type { GarmentVisualProps } from "./types";
import { useI18n } from "@/i18n/provider";

/** The 3D viewer (three.js + react-three-fiber + drei) is its own chunk: it is only fetched when a 3D garment is actually going to be shown. */
const GarmentViewer = dynamic(() => import("./3d/garment-viewer"), { ssr: false });

const btn = "inline-flex h-8 min-w-8 items-center justify-center border border-pub-line bg-pub-bg/80 px-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-pub-muted backdrop-blur transition-colors hover:border-pub-muted hover:text-pub-text aria-pressed:border-pub-brand aria-pressed:text-pub-text";

/**
 * Garment visual that upgrades to an interactive 3D model where it is supported and appropriate.
 * The 2D visual is always the base: it is what SSR renders, what shows while the viewer loads, and what stays if WebGL is missing,
 * the device is constrained, the viewer fails, or the garment has no 3D model yet. Same props either way.
 */
export function InteractiveGarment({ modelSrc = null, ...props }: GarmentVisualProps & { modelSrc?: string | null }) {
  const { t } = useI18n();
  const supported = has3dModel(props.productType);
  const { renderer, canOptIn, requestOptIn, reportFailure } = useGarmentRenderer(supported);
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"front" | "back">("front");
  const [zoom, setZoom] = useState<0 | 1 | 2>(1);
  const [resetKey, setResetKey] = useState(0);
  const [reduced, setReduced] = useState(!!props.reducedMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(!!props.reducedMotion || m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [props.reducedMotion]);

  const want3d = renderer === "3d";
  useEffect(() => {
    const el = ref.current;
    if (!want3d || !el || typeof IntersectionObserver === "undefined") return;
    const near = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setNear(true); }, { rootMargin: "400px" });
    const vis = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting));
    near.observe(el); vis.observe(el);
    return () => { near.disconnect(); vis.disconnect(); };
  }, [want3d]);

  const fail = useCallback(() => { setReady(false); reportFailure(); }, [reportFailure]);
  // Without IntersectionObserver there is no laziness to apply: just render.
  const noObserver = typeof IntersectionObserver === "undefined";
  const show3d = want3d && (near || noObserver) && supported;

  return (
    <div ref={ref} className="relative size-full" data-garment-renderer={show3d ? "3d" : "2d"} data-3d-ready={ready}>
      <div className={cn("size-full transition-opacity duration-500", ready && "opacity-0")}><Garment2D {...props} /></div>
      {show3d ? (
        <>
          <div className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
            <RenderBoundary onError={fail}>
              <GarmentViewer productType={props.productType} colour={props.colour ?? "#17191a"} fabric={props.fabric ?? "twill"} decoration={props.decoration ?? null} modelSrc={modelSrc} view={view} zoom={zoom} resetKey={resetKey} active={visible || noObserver} reducedMotion={reduced} onReady={() => setReady(true)} onLost={fail} />
            </RenderBoundary>
          </div>
          {ready ? (
            <div role="group" aria-label={t("site.n3dViewControls")} className="absolute bottom-0 end-0 flex gap-1.5">
              <button type="button" className={btn} aria-pressed={view === "front"} onClick={() => setView("front")}>{t("site.front")}</button>
              <button type="button" className={btn} aria-pressed={view === "back"} onClick={() => setView("back")}>{t("common.back")}</button>
              <button type="button" className={btn} aria-label={t("site.zoomOut")} disabled={zoom === 0} onClick={() => setZoom((z) => (Math.max(0, z - 1) as 0 | 1 | 2))}>−</button>
              <button type="button" className={btn} aria-label={t("site.zoomIn")} disabled={zoom === 2} onClick={() => setZoom((z) => (Math.min(2, z + 1) as 0 | 1 | 2))}>+</button>
              <button type="button" className={btn} onClick={() => { setView("front"); setZoom(1); setResetKey((k) => k + 1); }}>{t("site.reset")}</button>
            </div>
          ) : null}
        </>
      ) : null}
      {canOptIn ? <button type="button" className={cn(btn, "absolute bottom-0 end-0")} onClick={requestOptIn}>{t("site.viewIn3d")}</button> : null}
    </div>
  );
}
