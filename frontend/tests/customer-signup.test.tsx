import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, normalizeError } from "@/lib/api/errors";
import { customerTokenStore } from "@/lib/customer/session";
import { json, mockApi } from "./helpers";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/account/register", useSearchParams: () => new URLSearchParams(search) }));
const login = vi.fn();
vi.mock("@/features/portal/auth/customer-auth-provider", () => ({ useCustomerAuth: () => ({ status: "unauthenticated", customer: null, login, logout: vi.fn() }) }));

import { CustomerLoginForm, safePortalNext } from "@/features/portal/auth/forms";
import { authHref, maskEmail, safeNextPath, signupNext } from "@/features/portal/auth/next-path";
import { CheckEmailPanel, RegisterForm, VerifyEmailPanel } from "@/features/portal/auth/signup";

const PW = "Str0ng-Passw0rd-xyz";
beforeEach(() => { search = ""; replace.mockClear(); login.mockReset(); localStorage.clear(); customerTokenStore.clear(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function fillRegister(over: { confirm?: string; terms?: boolean; privacy?: boolean; phone?: string } = {}) {
  await userEvent.type(screen.getByLabelText("Full name"), "Amina Yusuf");
  await userEvent.type(screen.getByLabelText("Email"), "amina@example.com");
  if (over.phone) await userEvent.type(screen.getByLabelText(/Phone/), over.phone);
  await userEvent.type(screen.getByLabelText("Password"), PW);
  await userEvent.type(screen.getByLabelText("Repeat the password"), over.confirm ?? PW);
  if (over.terms !== false) await userEvent.click(screen.getByRole("checkbox", { name: /Terms of Service/ }));
  if (over.privacy !== false) await userEvent.click(screen.getByRole("checkbox", { name: /Privacy Policy/ }));
}

describe("safe return destinations", () => {
  it("honours only same-app portal paths and rejects external, protocol-relative, scheme and auth-loop targets", () => {
    expect(safeNextPath("/account/samples/new")).toBe("/account/samples/new");
    for (const bad of ["https://evil.test", "//evil.test", "javascript:alert(1)", "/dashboard", "/account/login", "/account/register?x=1", "/accountevil", "/account\\evil", "/account/../x://y", null, ""]) expect(safeNextPath(bad as string | null), String(bad)).toBeNull();
    expect(safePortalNext("//evil.test")).toBe("/account");
    expect(authHref("/account/register", "/account/samples/new")).toBe("/account/register?next=%2Faccount%2Fsamples%2Fnew");
    expect(authHref("/account/register", "https://evil.test")).toBe("/account/register");
    expect(maskEmail("amina@example.com")).toBe("a***@example.com");
  });
  it("keeps the destination across the email link in storage that never holds a token or password", () => {
    signupNext.set("/account/samples/new");
    expect(signupNext.get()).toBe("/account/samples/new");
    signupNext.set("https://evil.test");
    expect(signupNext.get()).toBe("/account/samples/new");
    expect(Object.keys(localStorage)).toEqual(["bp.customer.signup-next"]);
    signupNext.clear();
    expect(signupNext.get()).toBeNull();
  });
  it("API errors expose the machine code from the body (EMAIL_NOT_VERIFIED) but not plain HTTP names", () => {
    expect(normalizeError(403, { statusCode: 403, error: "EMAIL_NOT_VERIFIED", message: "x" }).code).toBe("EMAIL_NOT_VERIFIED");
    expect(normalizeError(409, { statusCode: 409, error: "Conflict", message: "x" }).code).toBeUndefined();
  });
});

describe("login: create-account path", () => {
  it("offers Create an account (secondary to Sign in) and keeps the safe next; Start a Sample context is explained", () => {
    search = "next=%2Faccount%2Fsamples%2Fnew";
    render(<CustomerLoginForm />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/account/register?next=%2Faccount%2Fsamples%2Fnew");
    expect(screen.getByText(/To start a sample, sign in or create an account/)).toBeInTheDocument();
  });
  it("drops an unsafe next from the signup link", () => {
    search = "next=https%3A%2F%2Fevil.test";
    render(<CustomerLoginForm />);
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/account/register");
  });
  it("EMAIL_NOT_VERIFIED shows the verification message and resend, not 'invalid credentials'", async () => {
    login.mockRejectedValue(new ApiError({ status: 403, kind: "forbidden", messages: ["Please verify your email address before signing in"], code: "EMAIL_NOT_VERIFIED" }));
    const calls = mockApi({ "GET /customer/auth/config": { emailVerificationRequired: true }, "POST /customer/auth/resend-verification": { message: "If that email belongs to an account awaiting verification, a new verification link has been sent." } });
    render(<CustomerLoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "amina@example.com");
    await userEvent.type(screen.getByLabelText("Password"), PW);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    const box = await screen.findByTestId("unverified");
    expect(box).toHaveTextContent("Your email needs to be verified before you can sign in.");
    expect(document.body.textContent).not.toMatch(/do not match/);
    await userEvent.click(screen.getByRole("button", { name: "Resend verification" }));
    expect(await screen.findByTestId("resend-message")).toHaveTextContent(/If that email belongs to an account awaiting verification/);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["GET /customer/auth/config", "POST /customer/auth/resend-verification"]);
    expect(calls[1]!.body).toEqual({ email: "amina@example.com" });
    await userEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.queryByTestId("unverified")).toBeNull();
  });
  it("a wrong password is still the ordinary message", async () => {
    login.mockRejectedValue(new ApiError({ status: 401, kind: "unauthorized", messages: ["Invalid"] }));
    render(<CustomerLoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That email and password do not match.");
  });
});

describe("register", () => {
  it("posts exactly the backend fields, then goes to check-email with the email and next; no session, token or password is kept", async () => {
    search = "next=%2Faccount%2Fsamples%2Fnew";
    const calls = mockApi({ "POST /customer/auth/register": json(201, { status: "verification_required", email: "a***@example.com" }) });
    render(<RegisterForm />);
    await fillRegister({ phone: "+201001234567" });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body).toEqual({ name: "Amina Yusuf", email: "amina@example.com", phone: "+201001234567", password: PW, acceptedTerms: true, acceptedPrivacy: true });
    expect(Object.keys(calls[0]!.body as object)).not.toContain("confirm");
    expect(replace).toHaveBeenCalledWith("/account/check-email?email=amina%40example.com&next=%2Faccount%2Fsamples%2Fnew");
    expect(customerTokenStore.get()).toBeNull();
    expect(JSON.stringify({ ...localStorage })).not.toContain(PW);
    expect(localStorage.getItem("bp.customer.signup-next")).toBe("/account/samples/new");
  });
  it("omits an empty phone", async () => {
    const calls = mockApi({ "POST /customer/auth/register": json(201, { status: "verification_required", email: "a***@example.com" }) });
    render(<RegisterForm />);
    await fillRegister();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(Object.keys(calls[0]!.body as object)).not.toContain("phone");
  });
  it("blocks a password mismatch client-side without calling the backend", async () => {
    const calls = mockApi({});
    render(<RegisterForm />);
    await fillRegister({ confirm: PW + "x" });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("The passwords do not match")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
  it("requires both Terms and Privacy to be accepted explicitly (neither is pre-checked)", async () => {
    const calls = mockApi({});
    render(<RegisterForm />);
    expect(screen.getByRole("checkbox", { name: /Terms of Service/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("checkbox", { name: /Privacy Policy/ })).toHaveAttribute("aria-checked", "false");
    await fillRegister({ terms: false, privacy: false });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Accept the Terms to create your account")).toBeInTheDocument();
    expect(screen.getByText("Accept the Privacy Policy to create your account")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });
  it("409 says the account exists and offers Sign in and Forgot password (nothing is guessed about verification)", async () => {
    search = "next=%2Faccount%2Fsamples%2Fnew";
    mockApi({ "POST /customer/auth/register": json(409, { statusCode: 409, error: "Conflict", message: "An account with this email already exists. Try signing in instead." }) });
    render(<RegisterForm />);
    await fillRegister();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    const box = await screen.findByTestId("duplicate");
    expect(box).toHaveTextContent("An account with this email already exists.");
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute("href", "/account/login?next=%2Faccount%2Fsamples%2Fnew");
    expect(screen.getByRole("link", { name: "Forgot password" })).toHaveAttribute("href", "/account/forgot-password");
    expect(replace).not.toHaveBeenCalled();
  });
  it("429 shows the wait time and never retries on its own", async () => {
    const calls = mockApi({ "POST /customer/auth/register": json(429, { statusCode: 429, message: "ThrottlerException" }, { "Retry-After": "42" }) });
    render(<RegisterForm />);
    await fillRegister();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("try again in 42 seconds");
    expect(document.body.textContent).not.toContain("ThrottlerException");
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(calls).toHaveLength(1);
  });
  it("a validation error from the backend is shown as the backend's own messages", async () => {
    mockApi({ "POST /customer/auth/register": json(400, { statusCode: 400, error: "Bad Request", message: ["phone must be a valid phone number"] }) });
    render(<RegisterForm />);
    await fillRegister({ phone: "abc" });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("phone must be a valid phone number");
  });
});

describe("check email and resend", () => {
  it("shows the masked address, explains verify-then-sign-in and spam, and links back to sign in with next", () => {
    search = "email=amina%40example.com&next=%2Faccount%2Fsamples%2Fnew";
    render(<CheckEmailPanel />);
    expect(screen.getByTestId("masked-email")).toHaveTextContent("a***@example.com");
    expect(document.body.textContent).not.toContain("amina@example.com");
    expect(screen.getByText(/spam or junk/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/account/login?next=%2Faccount%2Fsamples%2Fnew");
  });
  it("resend shows the backend's generic message, then a cooldown that blocks another click", async () => {
    search = "email=amina%40example.com";
    const calls = mockApi({ "POST /customer/auth/resend-verification": { message: "If that email belongs to an account awaiting verification, a new verification link has been sent." } });
    render(<CheckEmailPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Resend verification" }));
    expect(await screen.findByTestId("resend-message")).toHaveTextContent("If that email belongs to an account awaiting verification");
    expect(document.body.textContent).not.toMatch(/exists|not found|no account/i);
    const btn = screen.getByRole("button", { name: /Resend available in/ });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(calls).toHaveLength(1);
  });
});

describe("verify email", () => {
  it("consumes the token exactly once, removes it from the address bar, and offers Sign in keeping the stored destination", async () => {
    search = "token=secret-one-time-token";
    signupNext.set("/account/samples/new");
    const replaceState = vi.spyOn(window.history, "replaceState");
    const calls = mockApi({ "POST /customer/auth/verify-email": { status: "verified" } });
    render(<VerifyEmailPanel />);
    await waitFor(() => expect(screen.getByTestId("verify")).toHaveAttribute("data-state", "verified"));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body).toEqual({ token: "secret-one-time-token" });
    expect(replaceState).toHaveBeenCalled();
    expect(document.body.textContent).toContain("Your account is ready");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account/login?verified=1&next=%2Faccount%2Fsamples%2Fnew");
    expect(document.body.innerHTML).not.toContain("secret-one-time-token");
    expect(customerTokenStore.get()).toBeNull(); // no auto-login
    expect(Object.values({ ...localStorage, ...sessionStorage }).join(" ")).not.toContain("secret-one-time-token");
  });
  it("an invalid, expired or used link is a clear safe message with a resend path that asks for the email", async () => {
    search = "token=old";
    mockApi({ "POST /customer/auth/verify-email": json(400, { statusCode: 400, error: "Bad Request", message: "Invalid or expired token" }) });
    render(<VerifyEmailPanel />);
    await waitFor(() => expect(screen.getByTestId("verify")).toHaveAttribute("data-state", "invalid"));
    expect(screen.getByRole("alert")).toHaveTextContent("invalid or has expired");
    expect(screen.getByLabelText("Your email")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Invalid or expired token/);
  });
  it("a missing token is the invalid state without any request", () => {
    search = "";
    const calls = mockApi({});
    render(<VerifyEmailPanel />);
    expect(screen.getByTestId("verify")).toHaveAttribute("data-state", "invalid");
    expect(calls).toHaveLength(0);
  });
});

describe("auth isolation and security", () => {
  it("signup code touches only the customer auth endpoints, never staff auth, tokens or customer ids", () => {
    const dir = path.join(process.cwd(), "src/features/portal");
    for (const f of ["auth/signup.tsx", "auth/next-path.ts", "api.ts"]) {
      const src = readFileSync(path.join(dir, f), "utf8");
      expect(src, f).not.toMatch(/\/api\/auth\/|bp_rt|REFRESH_COOKIE|staff|@\/lib\/auth\/token-store|customerId/);
    }
    const api = readFileSync(path.join(dir, "api.ts"), "utf8");
    for (const p of ["/customer/auth/register", "/customer/auth/verify-email", "/customer/auth/resend-verification"]) expect(api).toContain(p);
    expect(readFileSync(path.join(dir, "auth/signup.tsx"), "utf8")).not.toMatch(/console\./);
  });
});

describe("email verification flag", () => {
  const cfg = (required: boolean) => ({ "GET /customer/auth/config": { emailVerificationRequired: required } });

  it("flag false: registration shows Account created with Sign in carrying next; no check-email, no resend, no redirect", async () => {
    search = "next=%2Faccount%2Fsamples%2Fnew";
    mockApi({ ...cfg(false), "POST /customer/auth/register": json(201, { status: "created", emailVerificationRequired: false }) });
    render(<RegisterForm />);
    await fillRegister();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    const box = await screen.findByTestId("account-created");
    expect(box).toHaveTextContent("Account created");
    expect(box).toHaveTextContent("Your Benuu Print account is ready.");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account/login?next=%2Faccount%2Fsamples%2Fnew");
    expect(document.body.textContent).not.toMatch(/verification link|check your email|Resend/i);
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem("bp.customer.signup-next")).toBeNull();
    expect(customerTokenStore.get()).toBeNull();
  });
  it("flag false: an unsafe next is dropped from Sign in", async () => {
    search = "next=https%3A%2F%2Fevil.test";
    mockApi({ "POST /customer/auth/register": json(201, { emailVerificationRequired: false }) });
    render(<RegisterForm />);
    await fillRegister();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account/login");
  });
  it("flag true: the existing flow goes to check-email with email and next", async () => {
    search = "next=%2Faccount%2Fsamples%2Fnew";
    mockApi({ ...cfg(true), "POST /customer/auth/register": json(201, { status: "verification_required", email: "a***@example.com", emailVerificationRequired: true }) });
    render(<RegisterForm />);
    await fillRegister();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/check-email?email=amina%40example.com&next=%2Faccount%2Fsamples%2Fnew"));
    expect(screen.queryByTestId("account-created")).toBeNull();
    expect(localStorage.getItem("bp.customer.signup-next")).toBe("/account/samples/new");
  });
  it("a response without the flag fails safe to check-email", async () => {
    mockApi({ "POST /customer/auth/register": json(201, { status: "verification_required", email: "a***@example.com" }) });
    render(<RegisterForm />);
    await fillRegister();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/check-email?email=amina%40example.com"));
  });
  const unverifiedLogin = async () => {
    login.mockRejectedValue(new ApiError({ status: 403, kind: "forbidden", messages: ["Please verify your email address before signing in"], code: "EMAIL_NOT_VERIFIED" }));
    render(<CustomerLoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "amina@example.com");
    await userEvent.type(screen.getByLabelText("Password"), PW);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  };
  it("login, flag false: no unverified/resend UI", async () => {
    mockApi(cfg(false));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await unverifiedLogin();
    await screen.findByRole("alert");
    expect(screen.queryByTestId("unverified")).toBeNull();
    expect(screen.queryByRole("button", { name: "Resend verification" })).toBeNull();
  });
  it("login, config failure: fails safe to the verification UI", async () => {
    mockApi({ "GET /customer/auth/config": json(500, { statusCode: 500, message: "boom" }) });
    await unverifiedLogin();
    expect(await screen.findByTestId("unverified")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend verification" })).toBeInTheDocument();
  });
  it("check-email and verify-email stay available", () => {
    search = "email=amina%40example.com";
    render(<CheckEmailPanel />);
    expect(screen.getByRole("button", { name: "Resend verification" })).toBeInTheDocument();
  });
});
