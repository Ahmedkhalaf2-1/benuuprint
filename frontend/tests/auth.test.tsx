import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeUser } from "@/lib/auth/normalize";
import { tokenStore } from "@/lib/auth/token-store";

const replace = vi.fn();
let pathname = "/orders";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

import { AdminGuard } from "@/features/auth/admin-guard";
import { AuthProvider } from "@/features/auth/auth-provider";
import { LoginForm, safeNext } from "@/features/auth/login-form";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const me = { id: "u1", name: "Sara", email: "s@x.com", roles: ["SALES"], permissions: ["customers.read"] };

function wrap(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}><AuthProvider>{ui}</AuthProvider></QueryClientProvider>);
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  replace.mockClear();
  tokenStore.clear();
  document.cookie = "bp_session=1; path=/";
});
afterEach(() => vi.unstubAllGlobals());

/** Bootstrap refresh fails -> unauthenticated. */
const noSession = () => fetchMock.mockResolvedValueOnce(json(401, {}));

describe("login", () => {
  it("success: logs in via BFF, loads /auth/me, navigates", async () => {
    noSession();
    wrap(<LoginForm />);
    fetchMock
      .mockResolvedValueOnce(json(200, { accessToken: "tok", expiresIn: 900 })) // /api/auth/login
      .mockResolvedValueOnce(json(200, me)); // /auth/me
    await userEvent.type(screen.getByLabelText("Email"), "s@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "Secret-pass-1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/customers")); // first page this user may open
    expect(fetchMock.mock.calls.some(([u]) => u === "/api/auth/login")).toBe(true);
    expect(tokenStore.get()).toBe("tok");
  });

  it("error: shows the generic invalid-credentials message", async () => {
    noSession();
    wrap(<LoginForm />);
    fetchMock.mockResolvedValueOnce(json(401, { statusCode: 401, message: "Invalid email or password", requestId: "rq1" }));
    await userEvent.type(screen.getByLabelText("Email"), "s@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.getByRole("alert")).toHaveTextContent("rq1");
    expect(replace).not.toHaveBeenCalled();
  });

  it("429: shows the retry delay", async () => {
    noSession();
    wrap(<LoginForm />);
    fetchMock.mockResolvedValueOnce(json(429, { message: "Too Many Requests" }, { "Retry-After": "42" }));
    await userEvent.type(screen.getByLabelText("Email"), "s@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("42 seconds");
  });

  it("validates before calling the server and toggles password visibility", async () => {
    noSession();
    wrap(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your email")).toBeInTheDocument();
    const pw = screen.getByLabelText("Password");
    expect(pw).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(pw).toHaveAttribute("type", "text");
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the bootstrap refresh
  });

  it("only follows safe relative next paths", () => {
    expect(safeNext("/orders")).toBe("/orders");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(null, "/qc")).toBe("/qc");
  });
});

describe("session restore, logout and protected routes", () => {
  it("restores a session from the refresh cookie", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: "restored" })).mockResolvedValueOnce(json(200, me));
    wrap(<AdminGuard><p>secret page</p></AdminGuard>);
    pathname = "/customers";
    expect(await screen.findByText("secret page")).toBeInTheDocument();
  });

  it("unauthenticated -> redirected to login with next", async () => {
    pathname = "/orders";
    noSession();
    wrap(<AdminGuard><p>secret page</p></AdminGuard>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=%2Forders"));
    expect(screen.queryByText("secret page")).not.toBeInTheDocument();
  });

  it("authenticated without permission -> access denied, not login", async () => {
    pathname = "/payments";
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: "t" })).mockResolvedValueOnce(json(200, me));
    wrap(<AdminGuard><p>secret page</p></AdminGuard>);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("/login"));
  });

  it("logout clears the token and goes to login", async () => {
    pathname = "/customers";
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: "t" })).mockResolvedValueOnce(json(200, me));
    const { useAuth } = await import("@/features/auth/auth-provider");
    function Btn() { const { logout, status } = useAuth(); return <button onClick={() => void logout()}>out:{status}</button>; }
    wrap(<Btn />);
    const btn = await screen.findByRole("button", { name: "out:authenticated" });
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await userEvent.click(btn);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(tokenStore.get()).toBeNull();
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith("/api/auth/logout"))).toBe(true);
  });
});

describe("session hint", () => {
  it("does not call refresh when no session hint cookie exists", async () => {
    document.cookie = "bp_session=; path=/; max-age=0";
    wrap(<LoginForm />);
    await screen.findByRole("button", { name: "Sign in" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("normalizeUser", () => {
  it("reads the AuthProfileDto exactly as sent", () => {
    const u = normalizeUser({ id: "1", name: "A", email: "a@b", roles: ["ADMIN", "SALES"], permissions: ["x.read", "y.read"] });
    expect(u?.roles.map((r) => r.code)).toEqual(["ADMIN", "SALES"]);
    expect(u?.permissions).toEqual(["x.read", "y.read"]);
  });
  it("does not derive permissions from roles", () => {
    expect(normalizeUser({ id: "1", roles: ["SUPER_ADMIN"] })?.permissions).toEqual([]);
  });
  it("rejects malformed payloads", () => { expect(normalizeUser(null)).toBeNull(); expect(normalizeUser({})).toBeNull(); });
});
