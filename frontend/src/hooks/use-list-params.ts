"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export interface ListParams {
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  direction: "asc" | "desc";
  /** Any other filter (status, priority, ...) read from the URL. */
  filters: Record<string, string>;
}

const BASE_RESERVED = ["page", "pageSize", "search"];

/**
 * Table/list state lives in the URL (page, pageSize, search, sort, direction + filters),
 * so every view is shareable and bookmarkable. Changing anything but `page` resets to page 1.
 */
export function useListParams(
  defaults: {
    pageSize?: number;
    sort?: string;
    direction?: "asc" | "desc";
    /** URL / query-string names for sorting (backend lists differ: `sort`/`direction` vs `sortBy`/`sortOrder`). */
    sortParam?: string;
    /** `null` = the endpoint has a single `sort` enum and no direction parameter (sending one is a 400). */
    directionParam?: string | null;
  } = {},
) {
  const sortParam = defaults.sortParam ?? "sort";
  const directionParam = defaults.directionParam === undefined ? "direction" : defaults.directionParam;
  const reserved = useMemo(() => new Set([...BASE_RESERVED, sortParam, ...(directionParam ? [directionParam] : [])]), [sortParam, directionParam]);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const params = useMemo<ListParams>(() => {
    const filters: Record<string, string> = {};
    sp.forEach((v, k) => {
      if (!reserved.has(k) && v) filters[k] = v;
    });
    const dir = directionParam ? sp.get(directionParam) : null;
    return {
      page: Math.max(1, Number(sp.get("page")) || 1),
      pageSize: Number(sp.get("pageSize")) || defaults.pageSize || 20,
      search: sp.get("search") ?? "",
      sort: sp.get(sortParam) ?? defaults.sort ?? "",
      direction: dir === "asc" || dir === "desc" ? dir : (defaults.direction ?? "desc"),
      filters,
    };
  }, [sp, reserved, sortParam, directionParam, defaults.pageSize, defaults.sort, defaults.direction]);

  const update = useCallback(
    (patch: Partial<Omit<ListParams, "filters">> & { filters?: Record<string, string | undefined> }) => {
      const next = new URLSearchParams(sp.toString());
      const { filters, sort, direction, ...rest } = patch;
      const named: Record<string, unknown> = { ...rest, [sortParam]: sort, ...(directionParam ? { [directionParam]: direction } : {}) };
      for (const [k, v] of Object.entries(named)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      for (const [k, v] of Object.entries(filters ?? {})) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in rest)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname, sortParam, directionParam],
  );

  /** Backend query-string form. */
  const toQuery = useMemo(
    () => ({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
      [sortParam]: params.sort || undefined,
      ...(directionParam ? { [directionParam]: params.sort ? params.direction : undefined } : {}),
      ...params.filters,
    }),
    [params, sortParam, directionParam],
  );

  return { params, update, toQuery };
}
