export interface VideoEnv {
  reducedMotion: boolean;
  saveData?: boolean;
  /** navigator.connection.effectiveType */
  effectiveType?: string;
  /** Wide enough for the desktop composition. */
  wide: boolean;
  /** navigator.deviceMemory (GB) and hardwareConcurrency, when the browser reports them. */
  deviceMemory?: number;
  cores?: number;
}

/**
 * Hero/process video on wide screens: only where it is welcome and affordable (motion allowed, no Save-Data, not 2G/3G).
 * The still/fallback carries the same message everywhere else.
 */
export function shouldPlayHeroVideo(env: VideoEnv): boolean {
  if (env.reducedMotion || !env.wide || env.saveData) return false;
  if (env.effectiveType && /^(slow-2g|2g|3g)$/.test(env.effectiveType)) return false;
  return true;
}

/**
 * The ONE video allowed on phones (the hero). Allowed unless motion is reduced, Save-Data is on, the browser reports a slow connection
 * (2G/3G), or it reports a weak device (< 4 GB memory or < 4 cores). Browsers that cannot report any of this (e.g. iOS Safari) are given
 * the video, since the alternative would be that iPhones never see it; the poster remains underneath until frames play.
 */
export function shouldPlayMobileHeroVideo(env: VideoEnv): boolean {
  if (env.reducedMotion || env.saveData) return false;
  if (env.effectiveType && /^(slow-2g|2g|3g)$/.test(env.effectiveType)) return false;
  if (env.deviceMemory !== undefined && env.deviceMemory < 4) return false;
  if (env.cores !== undefined && env.cores < 4) return false;
  return true;
}
