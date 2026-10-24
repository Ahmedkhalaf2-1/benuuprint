import { ar } from "./ar";
import { en } from "./en";

/** English is the source of truth for the shape: `ar` is typed against it, so a missing Arabic key fails typecheck. */
export type Messages = typeof en;
export const messages = { en, ar } as const satisfies Record<"en" | "ar", Messages>;
