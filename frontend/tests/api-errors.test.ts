import { describe, expect, it } from "vitest";
import { errorMessage, normalizeError } from "@/lib/api/errors";
import { shouldRetry } from "@/lib/query/client";

describe("error normalization", () => {
  it("maps the backend error contract", () => {
    const e = normalizeError(404, { statusCode: 404, error: "Not Found", message: "Customer not found", path: "/api/v1/x", timestamp: "t", requestId: "req-1" });
    expect(e.kind).toBe("not_found");
    expect(e.requestId).toBe("req-1");
    expect(e.messages).toEqual(["Customer not found"]);
  });
  it("keeps validation message arrays", () => {
    const e = normalizeError(400, { statusCode: 400, error: "Bad Request", message: ["email must be an email", "x"] });
    expect(e.kind).toBe("validation");
    expect(e.messages).toHaveLength(2);
  });
  it.each([[401, "unauthorized"], [403, "forbidden"], [409, "conflict"], [422, "validation"], [429, "rate_limited"], [500, "server"]])("status %i -> %s", (s, k) => {
    expect(normalizeError(s, undefined).kind).toBe(k);
  });
  it("403 produces a permission message, not a session one", () => {
    expect(normalizeError(403, {}).kind).toBe("forbidden");
    expect(normalizeError(403, {}).message).toMatch(/permission/i);
  });
  it("429 exposes Retry-After", () => {
    const e = normalizeError(429, { message: "ThrottlerException: Too Many Requests" }, "30");
    expect(e.retryAfter).toBe(30);
    expect(errorMessage(e)).toContain("30s");
  });
  it("never leaks 5xx internals but keeps requestId", () => {
    const e = normalizeError(500, { message: "PrismaClientKnownRequestError at /src/x.ts", requestId: "r9" });
    expect(e.message).not.toContain("Prisma");
    expect(e.requestId).toBe("r9");
  });
  it("does not blindly retry 401/403/422", () => {
    for (const s of [401, 403, 422, 404]) expect(shouldRetry(0, normalizeError(s, {}))).toBe(false);
    expect(shouldRetry(0, normalizeError(500, {}))).toBe(true);
    expect(shouldRetry(2, normalizeError(500, {}))).toBe(false);
  });
});

import { retryAfterFromHeaders } from "@/lib/api/errors";
describe("live 429 contract", () => {
  it("reads Retry-After-auth (named throttler) and hides framework text", () => {
    const h = new Headers({ "Retry-After-auth": "57" });
    expect(retryAfterFromHeaders(h)).toBe("57");
    const e = normalizeError(429, { statusCode: 429, error: "TOO_MANY_REQUESTS", message: "ThrottlerException: Too Many Requests" }, retryAfterFromHeaders(h));
    expect(e.retryAfter).toBe(57);
    expect(e.message).not.toContain("Throttler");
  });
});
