import { describe, expect, it } from "vitest";
import { resolveDownloadUrl } from "@/lib/api/assets";

describe("signed download URL resolution", () => {
  it("resolves the backend's relative path against the API origin, not the frontend's", () => {
    expect(resolveDownloadUrl("/api/v1/storage/local/TOKEN", "http://127.0.0.1:3011/api/v1")).toBe("http://127.0.0.1:3011/api/v1/storage/local/TOKEN");
  });
  it("passes absolute URLs through (e.g. a future object-storage provider)", () => {
    expect(resolveDownloadUrl("https://cdn.example.com/x?sig=1", "http://127.0.0.1:3011/api/v1")).toBe("https://cdn.example.com/x?sig=1");
  });
});
