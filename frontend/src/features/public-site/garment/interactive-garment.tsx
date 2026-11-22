"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { defaultPlacement, type PlacementStatus, type ViewFace } from "@/features/garment-3d/placement-config";
import type { PrintLayer } from "@/features/garment-3d/print-design";
import { has3dModel } from "./renderer-policy";
import { RenderBoundary } from "./render-boundary";
import { useGarmentRenderer } from "./use-garment-renderer";
import type { GarmentKind, GarmentVisualProps } from "./types";
import { useI18n } from "@/i18n/provider";

/** The 3D viewer (three.js + react-three-fiber + drei) is its own chunk: it is only fetched when a 3D garment is actually going to be shown. */
const GarmentViewer = dynamic(() => import("./3d/garment-viewer"), { ssr: false });

const btn = "inline-flex h-8 min-w-8 items-center justify-center border border-pub-line bg-pub-bg/80 px-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-pub-muted backdrop-blur transition-colors hover:border-pub-muted hover:text-pub-text aria-pressed:border-pub-brand aria-pressed:text-pub-text disabled:opacity-40";
const note = "max-w-[16rem] text-center font-mono text-[0.625rem] uppercase leading-relaxed tracking-[0.14em] text-pub-muted";

export interface InteractiveGarmentProps extends GarmentVisualProps {
  /** Prints shown on the 3D garment (artwork or decoration looks). Without prints, `decoration` is shown at the default placement. */
  prints?: PrintLayer[];
  /** Controlled camera face (customizers point the camera at the selected placement). */
  view?: ViewFace;
  onViewChange?: (v: ViewFace) => void;
  /** full: front/back/zoom/reset · compact: front/back/reset (small cards) · none */
  controls?: "full" | "compact" | "none";
  /** "buttons" leaves every touch gesture to the page (e.g. inside a horizontally scrolling carousel). */
  interaction?: "rotate" | "buttons";
  autoRotate?: boolean;
  onPlacementStatus?: (s: PlacementStatus) => void;
  /** Keep the (empty, dark) viewer but do not load a model yet, e.g. carousel cards that are not centred. */
  deferred?: boolean;
  /** Pause before following a new garment (hover lists): quick sweeps across a list don't download every model. 0 = immediate. */
  switchDelay?: number;
}

type Stage = "pending" | "loading" | "ready" | "error" | "no-model" | "no-webgl" | "opt-in" | "deferred";

/**
 * The garment viewer. The real GLB is the ONLY garment visual: until it is on screen the viewer is an empty dark stage of fixed size
 * (no illustration, no placeholder garment), with a small status line. That is also what the server renders, so hydration never
 * swaps one garment drawing for another.
 */
export function InteractiveGarment({ prints, view: viewProp, onViewChange, controls = "full", interaction = "rotate", autoRotate, onPlacementStatus, deferred = false, switchDelay = 0, ...props }: InteractiveGarmentProps) {
  const { t } = useI18n();
  const kind = props.productType;
  const hasModel = has3dModel(kind);
  const { mode, requestOptIn } = useGarmentRenderer(true);
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [readyKind, setReadyKind] = useState<GarmentKind | null>(null);
  const [failedKind, setFailedKind] = useState<GarmentKind | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ownView, setOwnView] = useState<ViewFace>("front");
  const view = viewProp ?? ownView;
  const setView = (v: ViewFace) => { onViewChange?.(v); if (viewProp === undefined) setOwnView(v); };
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

  // The model the canvas is loading/showing. It follows the selected garment immediately (or after `switchDelay` on hover lists).
  // While they differ, the previous model is hidden (never shown under the new garment's name). For a garment without a model the
  // canvas keeps the last one hidden, so the WebGL context is reused when the visitor comes back.
  const [modelKind, setModelKind] = useState<GarmentKind | null>(hasModel ? kind : null);
  if (hasModel && switchDelay === 0 && modelKind !== kind) setModelKind(kind);
  useEffect(() => {
    if (!hasModel || modelKind === kind || switchDelay === 0) return;
    const id = setTimeout(() => setModelKind(kind), modelKind ? switchDelay : 0);
    return () => clearTimeout(id);
  }, [kind, hasModel, modelKind, switchDelay]);

  // A failed model is retried automatically when the visitor picks another garment (a fresh viewer), or with the Retry button.
  if (failedKind && failedKind !== kind) { setFailedKind(null); setAttempt((a) => a + 1); }

  const want3d = mode === "3d" && !deferred;
  useEffect(() => {
    const el = ref.current;
    if (!want3d || !el || typeof IntersectionObserver === "undefined") return;
    const nearIo = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setNear(true); }, { rootMargin: "400px" });
    const vis = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting));
    nearIo.observe(el); vis.observe(el);
    return () => { nearIo.disconnect(); vis.disconnect(); };
  }, [want3d]);

  const fail = useCallback(() => { setReadyKind(null); setFailedKind(modelKind); }, [modelKind]);
  const retry = () => { setFailedKind(null); setReadyKind(null); setAttempt((a) => a + 1); };
  const onReady = useCallback((k: GarmentKind) => setReadyKind(k), []);
  const noObserver = typeof IntersectionObserver === "undefined";
  const errored = failedKind !== null && failedKind === kind;
  const mount3d = want3d && (near || noObserver) && !!modelKind && !errored;
  const showModel = hasModel && modelKind === kind;
  const ready = mount3d && showModel && readyKind === kind;

  const stage: Stage = mode === "pending" ? "pending" : !hasModel ? "no-model" : mode === "none" ? "no-webgl" : mode === "opt-in" ? "opt-in" : deferred ? "deferred" : errored ? "error" : ready ? "ready" : "loading";

  const viewerPrints = useMemo<PrintLayer[]>(() => {
    if (prints?.length) return prints;
    const deco = props.decoration;
    const spec = deco && deco !== "sublimation" ? defaultPlacement(kind) : null;
    return spec && deco && deco !== "sublimation" ? [{ placement: spec.id, source: { type: "look", key: deco }, size: spec.size, du: 0, dv: 0, rotation: 0 }] : [];
  }, [prints, props.decoration, kind]);

  return (
    <div ref={ref} className={cn("relative size-full", props.className)} data-garment-renderer={stage} data-3d-ready={ready} data-garment-kind={kind}>
      {mount3d ? (
        <div className="absolute inset-0">
          <RenderBoundary key={attempt} onError={fail}>
            <GarmentViewer productType={modelKind!} showModel={showModel} attempt={attempt} colour={props.colour ?? null} fabric={props.fabric ?? null} prints={viewerPrints} allOver={props.decoration === "sublimation"} view={view} zoom={zoom} resetKey={resetKey} active={(visible || noObserver) && showModel} reducedMotion={reduced} interaction={interaction} autoRotate={autoRotate ?? viewerPrints.length === 0} onReady={onReady} onLost={fail} onPlacementStatus={onPlacementStatus} />
          </RenderBoundary>
        </div>
      ) : null}

      {stage === "pending" || stage === "loading" ? (
        <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center"><p className={cn(note, "flex items-center gap-2")}><span aria-hidden className="size-1.5 animate-pulse rounded-full bg-pub-brand" />{t("site.loading3d")}</p></div>
      ) : stage === "error" ? (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3"><p className={note}>{t("site.n3dLoadFailed")}</p><button type="button" className={btn} onClick={retry}>{t("common.tryAgain")}</button></div>
      ) : stage === "no-webgl" ? (
        <div className="absolute inset-0 flex items-center justify-center"><p className={note}>{t("site.n3dUnavailable")}</p></div>
      ) : stage === "no-model" ? (
        <div className="absolute inset-0 flex items-center justify-center" data-testid="no-3d-model"><p className={note}>{t("site.n3dModelUnavailable")}</p></div>
      ) : stage === "opt-in" ? (
        <div className="absolute inset-0 flex items-center justify-center"><button type="button" className={btn} onClick={requestOptIn}>{t("site.viewIn3d")}</button></div>
      ) : null}

      {ready && controls !== "none" ? (
        <div role="group" aria-label={t("site.n3dViewControls")} className="absolute bottom-0 end-0 flex gap-1.5">
          <button type="button" className={btn} aria-pressed={view === "front"} onClick={() => setView("front")}>{t("site.frontView")}</button>
          <button type="button" className={btn} aria-pressed={view === "back"} onClick={() => setView("back")}>{t("site.backView")}</button>
          {controls === "full" ? (
            <>
              <button type="button" className={btn} aria-label={t("site.zoomOut")} disabled={zoom === 0} onClick={() => setZoom((z) => (Math.max(0, z - 1) as 0 | 1 | 2))}>−</button>
              <button type="button" className={btn} aria-label={t("site.zoomIn")} disabled={zoom === 2} onClick={() => setZoom((z) => (Math.min(2, z + 1) as 0 | 1 | 2))}>+</button>
            </>
          ) : null}
          <button type="button" className={btn} onClick={() => { setView("front"); setZoom(1); setResetKey((k) => k + 1); }}>{t("site.resetView")}</button>
        </div>
      ) : null}
    </div>
  );
}
