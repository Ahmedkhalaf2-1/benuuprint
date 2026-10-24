import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { onSessionExpired, tokenStore } from "@/lib/auth/token-store";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  tokenStore.set("old");
});
afterEach(() => {
  vi.unstubAllGlobals();
  tokenStore.clear();
});

describe("api client", () => {
  it("sends bearer token and parses JSON", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: 1 }));
    expect(await api.get("/x", { query: { page: 2, search: "" } })).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/api/v1/x?page=2");
    expect(init.headers.Authorization).toBe("Bearer old");
  });

  it("refreshes once on 401 and retries the original request", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { message: "expired" }))
      .mockResolvedValueOnce(json(200, { accessToken: "new" })) // /api/auth/refresh
      .mockResolvedValueOnce(json(200, { done: true }));
    expect(await api.get("/x")).toEqual({ done: true });
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/auth/refresh");
    expect(fetchMock.mock.calls[2]![1].headers.Authorization).toBe("Bearer new");
    expect(tokenStore.get()).toBe("new");
  });

  it("coordinates concurrent 401s into a single refresh", async () => {
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit & { headers: Record<string, string> }) => {
      if (url === "/api/auth/refresh") { refreshCalls++; await new Promise((r) => setTimeout(r, 10)); return json(200, { accessToken: "new" }); }
      return init.headers.Authorization === "Bearer new" ? json(200, { ok: true }) : json(401, {});
    });
    await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);
    expect(refreshCalls).toBe(1);
  });

  it("signs out when refresh fails", async () => {
    const expired = vi.fn();
    const off = onSessionExpired(expired);
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "unauthorized" });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
    off();
  });

  it("does not retry forever when the retried request is still 401", async () => {
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(200, { accessToken: "n" })).mockResolvedValueOnce(json(401, {}));
    await expect(api.get("/x")).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("403 is surfaced without refresh or sign-out", async () => {
    const expired = vi.fn();
    const off = onSessionExpired(expired);
    fetchMock.mockResolvedValueOnce(json(403, { statusCode: 403, message: "Forbidden resource", requestId: "r1" }));
    await expect(api.get("/admin/x")).rejects.toMatchObject({ kind: "forbidden", requestId: "r1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(expired).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe("old");
    off();
  });

  it("429 carries Retry-After", async () => {
    fetchMock.mockResolvedValueOnce(json(429, { message: "Too Many" }, { "Retry-After": "12" }));
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "rate_limited", retryAfter: 12 });
  });

  it("sends FormData without a JSON content type", async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}));
    await api.post("/up", new FormData());
    expect(fetchMock.mock.calls[0]![1].headers["Content-Type"]).toBeUndefined();
  });

  it("maps network failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fail"));
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "network" });
  });
});
