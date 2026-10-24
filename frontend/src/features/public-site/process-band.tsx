"use client";

import { LoopVideo } from "./loop-video";
import { ProcessGarmentVisual } from "./garment";
import { useVideoAllowed } from "./use-video-allowed";

/** Wide cinematic strip for the process page: the shared process loop when allowed, otherwise the 2D garment visual. Decorative. */
export function ProcessBand({ videoSrc }: { videoSrc: string | null }) {
  const play = useVideoAllowed(!!videoSrc, { allowMobile: true });
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border border-pub-line bg-pub-bg sm:aspect-[21/9]" data-process-band={videoSrc && play ? "video" : "2d"}>
      <div className="mx-auto h-full max-w-[28rem] p-4"><ProcessGarmentVisual stage={3} /></div>
      {videoSrc && play ? <LoopVideo src={videoSrc} className="object-[75%_center]" /> : null}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pub-bg/60 to-transparent" />
    </div>
  );
}
