import { resolveHeroMedia } from "./hero-media";
import { HeroView } from "./hero-view";

/** Server wrapper: resolves which hero media files exist (node fs) and hands plain props to the localised client view. */
export function Hero() {
  return <HeroView media={resolveHeroMedia()} />;
}
