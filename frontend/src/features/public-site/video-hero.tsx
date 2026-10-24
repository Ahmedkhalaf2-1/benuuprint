"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { LoopVideo } from "./loop-video";
import { useVideoAllowed } from "./use-video-allowed";

interface Props {
  /** Resolved server-side; null when no approved footage exists. */
  videoSrc: string | null;
  posterSrc: string | null;
  /** The designed static composition (desktop fallback). */
  fallback: ReactNode;
}

/** Phones start the (4 MB) video only once the page has finished loading and settled, so it never competes with the first paint. */
function useAfterLoad(delayMs: number): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const go = () => { t = setTimeout(() => setReady(true), delayMs); };
    if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
    return () => { clearTimeout(t); window.removeEventListener("load", go); };
  }, [delayMs]);
  return ready;
}

/**
 * Hero background. Desktop (>= lg) is unchanged: designed CSS fallback, video fades in over it when allowed.
 * Phones get a purpose-built treatment: the poster as a slowly drifting cinematic still (never an empty box), and the video only on a
 * fast, capable connection, started after load. Reduced motion / Save-Data / slow networks keep the still, without drift.
 */
export function VideoHero({ videoSrc, posterSrc, fallback }: Props) {
  const play = useVideoAllowed(!!videoSrc, { minWidth: 1024, allowMobile: true });
  const settled = useAfterLoad(900);
  const isVideo = !!videoSrc && play && settled;
  return (
    <div className="absolute inset-0" data-testid="hero-media" data-mode={isVideo ? "video" : posterSrc ? "poster" : "fallback"}>
      <div className={posterSrc ? "hidden lg:block" : undefined}>{fallback}</div>
      {posterSrc ? (
        <div className="pub-kenburns absolute inset-0 lg:hidden">
          <Image src={posterSrc} alt="" fill priority sizes="100vw" className="object-cover object-[58%_center]" />
        </div>
      ) : null}
      {isVideo ? <LoopVideo src={videoSrc} poster={posterSrc ?? undefined} className="object-[58%_center] lg:object-[78%_center]" /> : null}
    </div>
  );
}
