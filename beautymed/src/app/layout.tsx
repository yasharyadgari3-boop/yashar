import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/playfair-display";
import "./globals.css";
import { SkipLink } from "@/components/layout/skip-link";
import { RevealObserver } from "@/components/ui/reveal";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: { default: `${site.name} — مرجع پزشکان زیبایی`, template: `%s — ${site.name}` },
  description: "محصولات اصیل، آموزش تخصصی و تازه‌ترین پژوهش‌های پزشکی زیبایی، در یک جا، برای پزشکان.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FFFFFF" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <SkipLink />
        {children}
        <RevealObserver />
      </body>
    </html>
  );
}
