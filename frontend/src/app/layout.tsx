import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-500.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import { Toaster } from "@/components/ui/toast";
import { directionOf } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/provider";
import { QueryProvider } from "@/lib/query/provider";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t("common.brand"), template: `%s · ${t("common.brand")}` },
    description: t("common.appDescription"),
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f8f6a" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} dir={directionOf(locale)} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
