import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (k: string) => (k === "bp_locale" && cookieStore.value ? { value: cookieStore.value } : undefined) }) }));
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ user: { name: "Sara", email: "sara@example.test", roles: [{ code: "SUPER_ADMIN" }, { code: "QC" }] }, logout: vi.fn(), can: () => true, canAny: () => true }),
}));
vi.mock("@/features/notifications/notification-bell", () => ({ NotificationBell: () => null }));
vi.mock("@/features/portal/auth/customer-auth-provider", () => ({ useCustomerAuth: () => ({ customer: { name: "Customer A" }, logout: vi.fn(), status: "authenticated" }) }));

import { Topbar } from "@/components/layout/topbar";
import { StatusBadge } from "@/components/data-display/status-badge";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { LocaleProvider, useI18n } from "@/i18n/provider";
import { getLocale } from "@/i18n/server";
import { makeFormatter } from "@/i18n/format";
import { makeTranslator } from "@/i18n/translate";
import { PortalShell } from "@/features/portal/shell";
import { PublicHeader } from "@/features/public-site/public-header";
import { tokenStore } from "@/lib/auth/token-store";
import { customerTokenStore } from "@/lib/customer/session";
import { setActiveLocale } from "@/i18n/active";
import { formatDate, humanizeCode } from "@/lib/utils/format";

const html = document.documentElement;
const clearLocaleCookie = () => { document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`; };

beforeEach(() => { clearLocaleCookie(); html.lang = "en"; html.dir = "ltr"; cookieStore.value = undefined; refresh.mockClear(); });
afterEach(() => { clearLocaleCookie(); tokenStore.set(null); customerTokenStore.clear(); setActiveLocale("en"); });

function Probe() {
  const { locale, dir, t, fmt } = useI18n();
  return <div data-testid="probe" data-locale={locale} data-dir={dir}>{t("common.save" as never)}<span data-testid="status">{fmt.code("IN_PRODUCTION")}</span></div>;
}

describe("locale defaults and persistence", () => {
  it("defaults to English (LTR) when there is no saved preference, ignoring the browser language", async () => {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("ar-EG");
    expect(DEFAULT_LOCALE).toBe("en");
    expect(await getLocale()).toBe("en");
    render(<LocaleProvider initialLocale="en"><Probe /></LocaleProvider>);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-locale", "en");
    expect(screen.getByTestId("probe")).toHaveAttribute("data-dir", "ltr");
  });

  it("the server reads only the dedicated locale cookie and rejects anything that is not a supported locale", async () => {
    cookieStore.value = "ar";
    expect(await getLocale()).toBe("ar");
    cookieStore.value = "fr";
    expect(await getLocale()).toBe("en");
  });

  it("without a provider every consumer is English, exactly as before localisation", () => {
    render(<Probe />);
    expect(screen.getByTestId("status")).toHaveTextContent("In production");
  });
});

describe("language switcher", () => {
  it("switches to Arabic: content, <html lang dir> and the persisted cookie change, the route is refreshed (not replaced) and English restores LTR", async () => {
    render(<LocaleProvider initialLocale="en"><PublicHeader /></LocaleProvider>);
    expect(screen.getByRole("link", { name: "Capabilities" })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "العربية" })[0]!);
    expect(html.lang).toBe("ar");
    expect(html.dir).toBe("rtl");
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=ar`);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "القدرات" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Capabilities" })).toBeNull();

    await userEvent.click(screen.getAllByRole("button", { name: "EN" })[0]!);
    expect(html.lang).toBe("en");
    expect(html.dir).toBe("ltr");
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=en`);
    expect(screen.getByRole("link", { name: "Capabilities" })).toBeInTheDocument();
  });

  it("is available in the public header (desktop toggle and the compact phone control) with accessible names", () => {
    render(<LocaleProvider initialLocale="en"><PublicHeader /></LocaleProvider>);
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher-compact")).toHaveAttribute("aria-label", expect.stringContaining("العربية"));
    expect(screen.getAllByRole("button", { name: "العربية" })[0]).toHaveAttribute("lang", "ar");
  });

  it("is available in the staff top bar and the customer portal shell", async () => {
    const { unmount } = render(<LocaleProvider initialLocale="en"><Topbar collapsed={false} onToggleCollapsed={() => {}} onOpenDrawer={() => {}} onOpenSearch={() => {}} /></LocaleProvider>);
    await userEvent.click(within(screen.getByTestId("language-switcher")).getByRole("button", { name: "العربية" }));
    expect(html.dir).toBe("rtl");
    expect(screen.getByRole("button", { name: "قائمة الحساب" })).toBeInTheDocument();
    unmount();
    html.dir = "ltr";
    render(<LocaleProvider initialLocale="en"><PortalShell><p>page</p></PortalShell></LocaleProvider>);
    await userEvent.click(within(screen.getByTestId("language-switcher")).getByRole("button", { name: "العربية" }));
    expect(screen.getByRole("link", { name: "عيناتي" })).toBeInTheDocument();
    expect(screen.getByText("page")).toBeInTheDocument(); // the page content is untouched
  });

  it("never touches auth: tokens in memory and every other cookie survive a language change", async () => {
    tokenStore.set("staff-access-token");
    customerTokenStore.set("customer-access-token");
    document.cookie = "bp_session=1; path=/";
    document.cookie = "bp_c_session=1; path=/";
    render(<LocaleProvider initialLocale="en"><LanguageSwitcher /></LocaleProvider>);
    await userEvent.click(screen.getByRole("button", { name: "العربية" }));
    expect(tokenStore.get()).toBe("staff-access-token");
    expect(customerTokenStore.get()).toBe("customer-access-token");
    expect(document.cookie).toContain("bp_session=1");
    expect(document.cookie).toContain("bp_c_session=1");
    const written = document.cookie.split("; ").map((c) => c.split("=")[0] ?? "");
    expect(written.filter((n) => n.startsWith("bp_") && n !== "bp_locale").sort()).toEqual(["bp_c_session", "bp_session"]);
    document.cookie = "bp_session=; path=/; max-age=0";
    document.cookie = "bp_c_session=; path=/; max-age=0";
  });
});

describe("statuses and enums: display only, the backend value is never translated", () => {
  it("shows the canonical Arabic for a status code while the code itself stays the contract", () => {
    const en = makeFormatter("en", makeTranslator("en"));
    const ar = makeFormatter("ar", makeTranslator("ar"));
    expect(en.code("IN_PRODUCTION")).toBe("In production");
    expect(ar.code("IN_PRODUCTION")).toBe("قيد الإنتاج");
    expect(ar.code("SOME_FUTURE_STATUS")).toBe("Some future status"); // unknown codes fall back, never throw
    expect(ar.role("SUPER_ADMIN")).toBe("المدير العام");
    expect(ar.role("QC")).toBe("مراقبة الجودة");
    for (const code of Object.keys(messages.ar.codes)) expect(code).toMatch(/^[A-Za-z0-9_]+$/); // dictionary keys are codes, not translations
  });

  it("StatusBadge renders Arabic in Arabic mode and keeps the backend label in English", async () => {
    const { rerender } = render(<LocaleProvider initialLocale="en"><StatusBadge status="IN_PRODUCTION" label="In production" /></LocaleProvider>);
    expect(screen.getByText("In production")).toBeInTheDocument();
    rerender(<LocaleProvider initialLocale="ar"><StatusBadge status="IN_PRODUCTION" label="In production" /></LocaleProvider>);
    expect(screen.getByText("قيد الإنتاج")).toBeInTheDocument();
  });

  it("no source file builds an API payload field (action / status / kind) from translated text", () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
    const offenders = walk(path.join(process.cwd(), "src")).filter((f) => !f.includes(`${path.sep}i18n${path.sep}`)).filter((f) => /\b(action|status|stageKey|mode|reason)\s*:\s*t(\.text)?\(/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("numbers, dates and money", () => {
  it("formats with en-GB / ar-EG and never changes the amount or the API currency code", () => {
    const en = makeFormatter("en", makeTranslator("en"));
    const ar = makeFormatter("ar", makeTranslator("ar"));
    expect(en.money("1200.5", "EGP")).toBe("EGP 1,200.50");
    expect(ar.money("1200.5", "EGP")).toBe(`${new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(1200.5)} ج.م`);
    expect(ar.money("10", "USD")).toContain("USD"); // other currencies keep their code
    expect(en.number(1234567)).toBe("1,234,567");
    expect(ar.number(1234567)).toBe(new Intl.NumberFormat("ar-EG").format(1234567));
    expect(en.date("2026-03-04T10:00:00Z")).toMatch(/Mar 2026/);
    expect(ar.date("2026-03-04T10:00:00Z")).not.toBe(en.date("2026-03-04T10:00:00Z"));
    expect(ar.date(null)).toBe("—");
    expect(ar.duration(90)).not.toBe(en.duration(90));
  });

  it("legacy helpers used by module-level code follow the active locale (browser) and default to English", () => {
    expect(formatDate("2026-03-04T10:00:00Z")).toMatch(/04 Mar 2026/);
    expect(humanizeCode("READY_FOR_PACKAGING")).toBe("Ready for packaging");
  });
});

describe("dictionary integrity", () => {
  it("Arabic has every English key in every namespace with the same placeholders", () => {
    const missing: string[] = [];
    const placeholderMismatch: string[] = [];
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    // CLDR plural variants may drop the number ("one order") where the language allows it.
    const isPluralVariant = (k: string) => /(Zero|One|Two|Few|Many|Other)$/.test(k);
    for (const [ns, dict] of Object.entries(messages.en)) {
      if (ns === "codes" || ns === "roles" || ns === "phrases") continue;
      const ar = (messages.ar as Record<string, Record<string, string>>)[ns];
      for (const [k, v] of Object.entries(dict as Record<string, string>)) {
        if (!ar?.[k]) { missing.push(`${ns}.${k}`); continue; }
        if (!isPluralVariant(k) && ph(v) !== ph(ar[k]!)) placeholderMismatch.push(`${ns}.${k}`);
      }
    }
    expect(missing).toEqual([]);
    expect(placeholderMismatch).toEqual([]);
  });

  it("the brand name is never translated", () => {
    expect(messages.ar.common.brand).toBe("Benuu Print");
    expect(messages.en.common.brand).toBe("Benuu Print");
  });

  it("plural helper uses CLDR categories (Arabic has dual and few/many forms)", () => {
    const t = makeTranslator("ar");
    expect(t.plural("dashboard", "count_order", 1)).toBe("طلب واحد");
    expect(t.plural("dashboard", "count_order", 2)).toBe("طلبان");
    expect(t.plural("dashboard", "count_order", 5)).toBe("5 طلبات");
    expect(t.plural("dashboard", "count_order", 20)).toBe("20 طلبًا");
    const en = makeTranslator("en");
    expect(en.plural("dashboard", "count_order", 1)).toBe("1 order");
    expect(en.plural("dashboard", "count_order", 3)).toBe("3 orders");
  });
});

describe("Arabic rendering of the public site", () => {
  it("translates the hero headline and keeps direction-aware chrome", async () => {
    const { Hero } = await import("@/features/public-site/hero");
    render(<LocaleProvider initialLocale="ar"><Hero /></LocaleProvider>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("من الفكرة");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("إلى الإنتاج.");
    expect(screen.getByRole("link", { name: /ابدأ عينتك|ابدأ عينة/ })).toHaveAttribute("href", "/account/samples/new");
    await act(async () => {});
  });
});
