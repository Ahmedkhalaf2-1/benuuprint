"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { extractToken } from "./tracking";

/** Opens `/track/<token>`. The backend only supports token lookup, so a tracking link or its token is the only input. */
export function TrackEntry() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = extractToken(String(new FormData(e.currentTarget).get("token") ?? ""));
    if (!token) { setError("Enter the tracking link or code you were sent."); return; }
    setError(null);
    router.push(`/track/${encodeURIComponent(token)}`);
  }

  return (
    <form onSubmit={submit} aria-label="Open a tracking link" noValidate className="max-w-xl" data-testid="track-entry">
      <label htmlFor="track-token" className="mb-2 block font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-pub-muted">Tracking link or code</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input id="track-token" name="token" autoComplete="off" spellCheck={false} aria-invalid={!!error} aria-describedby={error ? "track-error" : undefined} className="h-14 min-w-0 border-pub-line sm:flex-1 bg-pub-bg px-4 text-base text-pub-text sm:h-auto sm:py-3 sm:text-sm placeholder:text-pub-muted/60 focus-visible:border-pub-brand" placeholder="Paste your tracking link" inputMode="url" autoCapitalize="none" autoCorrect="off" enterKeyHint="go" />
        <button type="submit" className="inline-flex h-14 w-full items-center justify-center bg-pub-brand-deep px-6 text-sm font-medium text-white transition-colors hover:bg-pub-brand-deeper active:bg-pub-brand-deeper sm:h-12 sm:w-auto">Track</button>
      </div>
      {error ? <p id="track-error" role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
    </form>
  );
}
