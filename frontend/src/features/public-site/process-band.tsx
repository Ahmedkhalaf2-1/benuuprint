"use client";

import { useState } from "react";
import { LoopVideo } from "./loop-video";
import { ProcessGarmentVisual } from "./garment";
import { useVideoDecision } from "./use-video-allowed";

/** Wide cinematic strip for the process page: the shared process loop (autoplay, viewport-aware); the 2D garment visual only when there is no video to show. Decorative. */
export function ProcessBand({ videoSrc }: { videoSrc: string | null }) {
  const decision = useVideoDecision(!!videoSrc, { allowMobile: true });
  const [failed, setFailed] = useState(false);
  const showVideo = !!videoSrc && decision !== "deny" && !failed;
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border border-pub-line bg-pub-bg sm:aspect-[21/9]" data-process-band={showVideo ? "video" : "2d"}>
      {showVideo ? <LoopVideo src={videoSrc} onFail={() => setFailed(true)} className="object-[75%_center]" /> : <div className="mx-auto h-full max-w-[28rem] p-4"><ProcessGarmentVisual stage={3} /></div>}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pub-bg/60 to-transparent" />
    </div>
  );
}
