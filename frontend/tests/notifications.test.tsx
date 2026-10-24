import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { tokenStore } from "@/lib/auth/token-store";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const list = { data: [
  { id: "n1", type: "STAGE_DELAYED", severity: "WARNING", title: "Stage delayed", body: "Sewing is late", readAt: null, createdAt: "2026-10-20T10:00:00Z" },
  { id: "n2", type: "X", severity: "INFO", title: "Old one", readAt: "2026-10-19T10:00:00Z", createdAt: "2026-10-19T09:00:00Z" },
], meta: { page: 1, pageSize: 8, total: 2 }, unreadCount: 1 };

let calls: Array<[string, string]>;
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";
  tokenStore.set("t");
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push([method, url]);
    if (url.endsWith("/unread-count")) return json(200, { unreadCount: 3 });
    if (url.endsWith("/read") || url.endsWith("/read-all")) return json(201, {});
    return json(200, list);
  }));
});
afterEach(() => { vi.unstubAllGlobals(); tokenStore.clear(); });

const renderBell = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><NotificationBell /></QueryClientProvider>);

describe("NotificationBell", () => {
  it("shows the unread count in the accessible name", async () => {
    renderBell();
    expect(await screen.findByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
  });
  it("lists notifications, marks unread as read on click", async () => {
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: /Notifications/ }));
    const unread = await screen.findByRole("button", { name: "Unread: Stage delayed" });
    await userEvent.click(unread);
    await waitFor(() => expect(calls).toContainEqual(["POST", "http://api.test/api/v1/staff/notifications/n1/read"]));
    expect(screen.getByRole("button", { name: "Old one" })).toBeInTheDocument();
  });
  it("mark all read", async () => {
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: /Notifications/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Mark all read/ }));
    await waitFor(() => expect(calls).toContainEqual(["POST", "http://api.test/api/v1/staff/notifications/read-all"]));
  });
});
