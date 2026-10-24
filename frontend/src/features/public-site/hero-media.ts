import { existsSync } from "node:fs";
import path from "node:path";

/** Asset path convention for the final cinematic hero. Drop the files into `public/media/` and rebuild. */
export const HERO_VIDEO_SRC = "/media/benue-hero.mp4";
export const HERO_POSTER_SRC = "/media/benue-hero-poster.webp";

export interface HeroMedia { video: string | null; poster: string | null }

/** Resolved at render/build time so a missing asset never produces a 404 request or a broken frame. */
export function resolveHeroMedia(): HeroMedia {
  const has = (src: string) => existsSync(path.join(process.cwd(), "public", src));
  return { video: has(HERO_VIDEO_SRC) ? HERO_VIDEO_SRC : null, poster: has(HERO_POSTER_SRC) ? HERO_POSTER_SRC : null };
}

/** Shared cinematic visual for the How-It-Works panel (one loop for all six steps). */
export const PROCESS_VIDEO_SRC = "/media/benue-process.mp4";
export function resolveProcessVideo(): string | null {
  return existsSync(path.join(process.cwd(), "public", PROCESS_VIDEO_SRC)) ? PROCESS_VIDEO_SRC : null;
}

/** Optional real T-shirt model. Absent today: the viewer uses its procedural stand-in. Drop `public/models/tshirt.glb` and rebuild. */
export const GARMENT_MODEL_SRC = "/models/tshirt.glb";
export function resolveGarmentModel(): string | null {
  return existsSync(path.join(process.cwd(), "public", GARMENT_MODEL_SRC)) ? GARMENT_MODEL_SRC : null;
}

/** Shared sign-in visual (staff `/login` and customer `/account/login`). */
export const LOGIN_VIDEO_SRC = "/media/benue-login.mp4";
export const LOGIN_POSTER_SRC = "/media/benue-login-poster.webp";
export function resolveLoginMedia(): HeroMedia {
  const has = (src: string) => existsSync(path.join(process.cwd(), "public", src));
  return { video: has(LOGIN_VIDEO_SRC) ? LOGIN_VIDEO_SRC : null, poster: has(LOGIN_POSTER_SRC) ? LOGIN_POSTER_SRC : null };
}
