import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { onSessionExpired, tokenStore } from "@/lib/auth/token-store";

const json = (status: number, body: unknown = {}, h: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...h } });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); tokenStore.set("old"); });
afterEach(() => { vi.unstubAllGlobals(); tokenStore.clear(); });

describe("refresh failures", () => {
  it("a rate-limited refresh (429) is transient: error surfaces, session is NOT cleared", async () => {
    const expired = vi.fn(); const off = onSessionExpired(expired);
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(429, { message: "Too Many" }, { "Retry-After-auth": "30" }));
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "rate_limited", retryAfter: 30 });
    expect(expired).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe("old");
    off();
  });
  it("a 5xx / network refresh failure is transient too", async () => {
    const expired = vi.fn(); const off = onSessionExpired(expired);
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(503));
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "server" });
    fetchMock.mockResolvedValueOnce(json(401)).mockRejectedValueOnce(new TypeError("down"));
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "network" });
    expect(expired).not.toHaveBeenCalled();
    off();
  });
});
