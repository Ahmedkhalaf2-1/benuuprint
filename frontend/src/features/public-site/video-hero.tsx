"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { LoopVideo } from "./loop-video";
import { useVideoDecision } from "./use-video-allowed";

interface Props {
  /** Resolved server-side; null when no approved footage exists. */
  videoSrc: string | null;
  /** Used only by the fallback (reduced motion / data saver / failed request), never as a pre-video placeholder. */
  posterSrc: string | null;
  /** The designed static composition, also fallback-only. */
  fallback: ReactNode;
}

/**
 * Hero background. The video is in the server-rendered HTML and is high priority, so the browser starts fetching it with the page.
 * Until its first frame plays, only the neutral dark hero background shows: no poster, no garment drawing, then the video fades in.
 * The designed still (poster on phones, garment composition on desktop) appears ONLY when there is genuinely no video to show:
 * no footage, reduced motion / Save-Data / slow network / weak phone, or the video request failed.
 */
export function VideoHero({ videoSrc, posterSrc, fallback }: Props) {
  const decision = useVideoDecision(!!videoSrc, { minWidth: 1024, allowMobile: true });
  const [failed, setFailed] = useState(false);
  const showVideo = !!videoSrc && decision !== "deny" && !failed;
  return (
    <div className="absolute inset-0 bg-pub-bg" data-testid="hero-media" data-mode={showVideo ? "video" : posterSrc ? "poster" : "fallback"}>
      {showVideo ? (
        <LoopVideo src={videoSrc} priority onFail={() => setFailed(true)} className="object-[58%_center] lg:object-[78%_center]" />
      ) : (
        <>
          <div className={posterSrc ? "hidden lg:block" : undefined}>{fallback}</div>
          {posterSrc ? (
            <div className="pub-kenburns absolute inset-0 lg:hidden">
              <Image src={posterSrc} alt="" fill priority sizes="100vw" className="object-cover object-[58%_center]" />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
