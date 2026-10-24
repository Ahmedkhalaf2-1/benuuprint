import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/lib/query/provider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Benuu Print", template: "%s · Benuu Print" },
  description: "Benuu Print factory operating system",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f8f6a" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
