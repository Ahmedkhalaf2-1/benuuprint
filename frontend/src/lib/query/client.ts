import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api/errors";

/** Never retry client errors (401 already went through refresh; 403/422/404 will not change). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error)) {
    if (error.kind === "network" || error.kind === "server") return failureCount < 2;
    return false;
  }
  return failureCount < 1;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // operational data: fresh enough for 30s
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
